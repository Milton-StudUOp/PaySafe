"""
Seed script to populate provinces and municipalities of Mozambique.
Run with: python -m scripts.seed_locations
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import SessionLocal
from app.models.location import Province, Municipality

# Mozambique provinces and their districts/municipalities
MOZAMBIQUE_LOCATIONS = {
    "Cabo Delgado": {
        "code": "CAB",
        "municipalities": [
            "Ancuabe", "Balama", "Chiúre", "Ibo", "Macomia", "Mecúfi", "Meluco", 
            "Metuge", "Mocímboa da Praia", "Montepuez", "Mueda", "Muidumbe", 
            "Namuno", "Nangade", "Palma", "Pemba", "Quissanga"
        ]
    },
    "Gaza": {
        "code": "GAZ",
        "municipalities": [
            "Bilene", "Chibuto", "Chicualacuala", "Chigubo", "Chókwè", "Guijá",
            "Limpopo", "Mabalane", "Mandlakazi", "Massangena", "Massingir", "Xai-Xai"
        ]
    },
    "Inhambane": {
        "code": "INH",
        "municipalities": [
            "Funhalouro", "Govuro", "Homoíne", "Inhambane", "Inharrime", "Inhassoro",
            "Jangamo", "Mabote", "Massinga", "Maxixe", "Morrumbene", "Panda",
            "Vilankulo", "Zavala"
        ]
    },
    "Manica": {
        "code": "MAN",
        "municipalities": [
            "Bárue", "Chimoio", "Gondola", "Guro", "Macate", "Machaze", 
            "Macossa", "Manica", "Mossurize", "Sussundenga", "Tambara", "Vanduzi"
        ]
    },
    "Maputo Cidade": {
        "code": "MPC",
        "municipalities": [
            "KaMpfumo", "KaMaxaquene", "KaMavota", "KaMubukwana", 
            "KaTembe", "KaNyaka", "KaLhamankulu"
        ]
    },
    "Maputo Província": {
        "code": "MPP",
        "municipalities": [
            "Boane", "Magude", "Manhiça", "Marracuene", "Matola", 
            "Matutuíne", "Moamba", "Namaacha"
        ]
    },
    "Nampula": {
        "code": "NAM",
        "municipalities": [
            "Angoche", "Eráti", "Ilha de Moçambique", "Lalaua", "Larde", 
            "Liúpo", "Malema", "Meconta", "Mecubúri", "Memba", "Mogincual",
            "Mogovolas", "Moma", "Monapo", "Mossuril", "Muecate", "Murrupula",
            "Nacala-a-Velha", "Nacala Porto", "Nacarôa", "Nampula", "Rapale", "Ribaué"
        ]
    },
    "Niassa": {
        "code": "NIA",
        "municipalities": [
            "Chimbonila", "Cuamba", "Lago", "Lichinga", "Majune", "Mandimba",
            "Marrupa", "Maúa", "Mavago", "Mecanhelas", "Mecula", "Metarica",
            "Muembe", "N'gauma", "Nipepe", "Sanga"
        ]
    },
    "Sofala": {
        "code": "SOF",
        "municipalities": [
            "Beira", "Búzi", "Caia", "Chemba", "Cheringoma", "Chibabava",
            "Dondo", "Gorongosa", "Machanga", "Marínguè", "Marromeu", 
            "Muanza", "Nhamatanda"
        ]
    },
    "Tete": {
        "code": "TET",
        "municipalities": [
            "Angónia", "Cahora-Bassa", "Changara", "Chifunde", "Chiuta",
            "Dôa", "Macanga", "Mágoè", "Marara", "Moatize", "Mutarara",
            "Tete", "Tsangano", "Zumbo"
        ]
    },
    "Zambézia": {
        "code": "ZAM",
        "municipalities": [
            "Alto Molócuè", "Chinde", "Derre", "Gilé", "Gurué", "Ile",
            "Inhassunge", "Luabo", "Lugela", "Maganja da Costa", "Milange",
            "Mocuba", "Mocubela", "Molumbo", "Mopeia", "Morrumbala", 
            "Namacurra", "Namarroi", "Nicoadala", "Pebane", "Quelimane"
        ]
    }
}


async def seed_locations():
    """Seed provinces and municipalities"""
    async with SessionLocal() as session:
        # Check if provinces already exist
        result = await session.execute(select(Province))
        existing = result.scalars().all()
        
        if existing:
            print(f"Found {len(existing)} existing provinces. Skipping seed.")
            print("To re-seed, delete all provinces first.")
            return
        
        print("Seeding Mozambique locations...")
        
        for province_name, data in MOZAMBIQUE_LOCATIONS.items():
            # Create province
            province = Province(name=province_name, code=data["code"])
            session.add(province)
            await session.flush()  # Get the ID
            
            print(f"  + {province_name} ({data['code']})")
            
            # Create municipalities
            for muni_name in data["municipalities"]:
                municipality = Municipality(name=muni_name, province_id=province.id)
                session.add(municipality)
                print(f"    - {muni_name}")
        
        await session.commit()
        print("\n[OK] Locations seeded successfully!")
        print(f"   Total provinces: {len(MOZAMBIQUE_LOCATIONS)}")
        total_munis = sum(len(d["municipalities"]) for d in MOZAMBIQUE_LOCATIONS.values())
        print(f"   Total municipalities: {total_munis}")


if __name__ == "__main__":
    asyncio.run(seed_locations())
