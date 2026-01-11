"""
Script to create tax_configurations table and add columns to transactions.
Populates initial Municipal Tax data.
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text

async def create_tables():
    from app.database import engine
    
    # Read sql file
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sql_path = os.path.join(script_dir, "..", "migrations", "create_tax_configurations.sql")
    
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # Split by ; to basic execution (this is naive but works for simple scripts)
    # Actually, sqlalchemy execute text() can handle multiple statements if configured or we split manually
    # Let's read the file and let DB handle multiple statements if possible, or naive split
    statements = [s.strip() for s in sql_content.split(';') if s.strip()]
    
    async with engine.begin() as conn:
        print("[INFO] Running schema migration...")
        for stmt in statements:
            if stmt.upper().startswith("DELIMITER"): continue 
            try:
                await conn.execute(text(stmt))
            except Exception as e:
                print(f"[WARN] Statement failed: {str(e)[:100]}...")
        
        print("[OK] Schema Created")
        
        # Seed Data
        print("[INFO] Seeding Tax Data...")
        
        taxes = [
            # Impostos
            ('IPA', 'Imposto Pessoal Autárquico', 'IMPOSTO', False, 0),
            ('IPRA', 'Imposto Predial Autárquico', 'IMPOSTO', False, 0),
            ('IAV', 'Imposto Autárquico de Veículos', 'IMPOSTO', False, 0),
            ('IASISA', 'Imposto Autárquico da SISA', 'IMPOSTO', False, 0),
            ('TAE', 'Taxa de Actividades Económicas', 'IMPOSTO', False, 0),
            
            # Taxas
            ('TAXA_MERCADO', 'Taxa de Mercado (Diária)', 'TAXA', True, 10.00),
            ('LICENCA_COMERCIAL', 'Licença de Actividade Comercial', 'TAXA', False, 0),
            ('LICENCA_INDUSTRIAL', 'Licença Industrial', 'TAXA', False, 0),
            ('LICENCA_SERVICOS', 'Licença de Prestação de Serviços', 'TAXA', False, 0),
            ('OCUPACAO_SOLO', 'Ocupação do Solo Público', 'TAXA', False, 0),
            ('PUBLICIDADE', 'Publicidade (Placas/Outdoors)', 'TAXA', False, 0),
            ('AFIXACAO_RECLAMES', 'Afixação de Reclames', 'TAXA', False, 0),
            ('LICENCA_CONSTRUCAO', 'Licença de Construção', 'TAXA', False, 0),
            ('APROVACAO_PROJETOS', 'Aprovação de Projectos', 'TAXA', False, 0),
            ('VISTORIA', 'Taxa de Vistoria', 'TAXA', False, 0),
            ('LIGACAO_AGUA', 'Ligação de Água/Saneamento', 'TAXA', False, 0),
            ('LIXO_RESIDUOS', 'Recolha de Lixo / Resíduos', 'TAXA', False, 0),
            ('LIMPEZA_URBANA', 'Limpeza Urbana', 'TAXA', False, 0),
            ('CEMITERIOS', 'Taxa de Cemitérios', 'TAXA', False, 0),
            ('EVENTOS_PUBLICOS', 'Licença de Eventos Públicos', 'TAXA', False, 0),
            ('FEIRAS_EXPOSICOES', 'Feiras e Exposições', 'TAXA', False, 0),
            ('TRANSPORTE', 'Taxa de Transporte Municipal', 'TAXA', False, 0),
            ('PARQUEAMENTO', 'Taxa de Parqueamento', 'TAXA', False, 0),
            ('ABERTURA_ENCERRAMENTO', 'Abertura/Encerrame. Estabel.', 'TAXA', False, 0),
            ('CERTIDOES', 'Certidões e Serv. Admin.', 'TAXA', False, 0),
            ('VENDA_AMBULANTE', 'Licença de Venda Ambulante', 'TAXA', False, 0),
            ('QUIOSQUES', 'Licença de Quiosques', 'TAXA', False, 0),
            ('FISCALIZACAO', 'Taxa de Fiscalização', 'TAXA', False, 0),
            
            # Multas
            ('MULTAS', 'Multas e Coimas Municipais', 'MULTA', False, 0),
            ('OUTROS_TRIBUTOS', 'Outros Tributos Municipais', 'OUTROS', False, 0),
        ]
        
        for code, name, cat, fixed, amount in taxes:
            try:
                await conn.execute(text(f"""
                    INSERT IGNORE INTO tax_configurations 
                    (code, name, category, is_fixed_amount, default_amount, is_active)
                    VALUES 
                    ('{code}', '{name}', '{cat}', {str(fixed).upper()}, {amount}, TRUE)
                """))
            except Exception as e:
                print(f"[ERR] Failed to insert {code}: {e}")

        print("[OK] Data Seeding Complete")
        
    print("\n[DONE] Migration and Seed complete!")

if __name__ == "__main__":
    asyncio.run(create_tables())
