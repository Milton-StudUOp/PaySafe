
export interface District {
    id: string;
    name: string;
}

export interface Province {
    id: string;
    name: string;
    districts: District[];
}

export const MOZAMBIQUE_LOCATIONS: Province[] = [
    {
        id: "Maputo",
        name: "Maputo (Cidade)",
        districts: [
            { id: "KaMpfumo", name: "KaMpfumo" },
            { id: "Nlhamankulu", name: "Nlhamankulu" },
            { id: "KaMaxaquene", name: "KaMaxaquene" },
            { id: "KaMavota", name: "KaMavota" },
            { id: "KaMubukwana", name: "KaMubukwana" },
            { id: "KaTembe", name: "KaTembe" },
            { id: "KaNyaka", name: "KaNyaka" }
        ]
    },
    {
        id: "Maputo Provincia",
        name: "Maputo (Província)",
        districts: [
            { id: "Boane", name: "Boane" },
            { id: "Magude", name: "Magude" },
            { id: "Manhiça", name: "Manhiça" },
            { id: "Marracuene", name: "Marracuene" },
            { id: "Matola", name: "Matola" },
            { id: "Matutuíne", name: "Matutuíne" },
            { id: "Moamba", name: "Moamba" },
            { id: "Namaacha", name: "Namaacha" }
        ]
    },
    {
        id: "Gaza",
        name: "Gaza",
        districts: [
            { id: "Bilene", name: "Bilene" },
            { id: "Chibuto", name: "Chibuto" },
            { id: "Chicualacuala", name: "Chicualacuala" },
            { id: "Chigubo", name: "Chigubo" },
            { id: "Chókwè", name: "Chókwè" },
            { id: "Guijá", name: "Guijá" },
            { id: "Mabalane", name: "Mabalane" },
            { id: "Manjacaze", name: "Manjacaze" },
            { id: "Massangena", name: "Massangena" },
            { id: "Massingir", name: "Massingir" },
            { id: "Xai-Xai", name: "Xai-Xai" }
        ]
    },
    {
        id: "Inhambane",
        name: "Inhambane",
        districts: [
            { id: "Funhalouro", name: "Funhalouro" },
            { id: "Govuro", name: "Govuro" },
            { id: "Homoíne", name: "Homoíne" },
            { id: "Inhambane", name: "Inhambane" },
            { id: "Inharrime", name: "Inharrime" },
            { id: "Inhassoro", name: "Inhassoro" },
            { id: "Jangamo", name: "Jangamo" },
            { id: "Mabote", name: "Mabote" },
            { id: "Massinga", name: "Massinga" },
            { id: "Maxixe", name: "Maxixe" },
            { id: "Morrumbene", name: "Morrumbene" },
            { id: "Panda", name: "Panda" },
            { id: "Vilankulo", name: "Vilankulo" },
            { id: "Zavala", name: "Zavala" }
        ]
    },
    {
        id: "Sofala",
        name: "Sofala",
        districts: [
            { id: "Beira", name: "Beira" },
            { id: "Búzi", name: "Búzi" },
            { id: "Caia", name: "Caia" },
            { id: "Chemba", name: "Chemba" },
            { id: "Cheringoma", name: "Cheringoma" },
            { id: "Chibabava", name: "Chibabava" },
            { id: "Dondo", name: "Dondo" },
            { id: "Gorongosa", name: "Gorongosa" },
            { id: "Machanga", name: "Machanga" },
            { id: "Maringué", name: "Maringué" },
            { id: "Marromeu", name: "Marromeu" },
            { id: "Muanza", name: "Muanza" },
            { id: "Nhamatanda", name: "Nhamatanda" }
        ]
    },
    {
        id: "Manica",
        name: "Manica",
        districts: [
            { id: "Bárue", name: "Bárue" },
            { id: "Chimoio", name: "Chimoio" },
            { id: "Gondola", name: "Gondola" },
            { id: "Guro", name: "Guro" },
            { id: "Macate", name: "Macate" },
            { id: "Machaze", name: "Machaze" },
            { id: "Macossa", name: "Macossa" },
            { id: "Manica", name: "Manica" },
            { id: "Mossurize", name: "Mossurize" },
            { id: "Sussundenga", name: "Sussundenga" },
            { id: "Tambara", name: "Tambara" },
            { id: "Vanduzi", name: "Vanduzi" }
        ]
    },
    {
        id: "Tete",
        name: "Tete",
        districts: [
            { id: "Angónia", name: "Angónia" },
            { id: "Cahora-Bassa", name: "Cahora-Bassa" },
            { id: "Changara", name: "Changara" },
            { id: "Chifunde", name: "Chifunde" },
            { id: "Chiuta", name: "Chiuta" },
            { id: "Dôa", name: "Dôa" },
            { id: "Macanga", name: "Macanga" },
            { id: "Magoé", name: "Magoé" },
            { id: "Marara", name: "Marara" },
            { id: "Marávia", name: "Marávia" },
            { id: "Moatize", name: "Moatize" },
            { id: "Mutarara", name: "Mutarara" },
            { id: "Tete", name: "Tete" },
            { id: "Tsangano", name: "Tsangano" },
            { id: "Zumbu", name: "Zumbu" }
        ]
    },
    {
        id: "Zambézia",
        name: "Zambézia",
        districts: [
            { id: "Alto Molócuè", name: "Alto Molócuè" },
            { id: "Chinde", name: "Chinde" },
            { id: "Derre", name: "Derre" },
            { id: "Gilé", name: "Gilé" },
            { id: "Gurué", name: "Gurué" },
            { id: "Ile", name: "Ile" },
            { id: "Inhassunge", name: "Inhassunge" },
            { id: "Luabo", name: "Luabo" },
            { id: "Lugela", name: "Lugela" },
            { id: "Maganja da Costa", name: "Maganja da Costa" },
            { id: "Milange", name: "Milange" },
            { id: "Mocuba", name: "Mocuba" },
            { id: "Mocubela", name: "Mocubela" },
            { id: "Molumbo", name: "Molumbo" },
            { id: "Mopeia", name: "Mopeia" },
            { id: "Morrumbala", name: "Morrumbala" },
            { id: "Mulevala", name: "Mulevala" },
            { id: "Namacurra", name: "Namacurra" },
            { id: "Namarroi", name: "Namarroi" },
            { id: "Nicoadala", name: "Nicoadala" },
            { id: "Pebane", name: "Pebane" },
            { id: "Quelimane", name: "Quelimane" }
        ]
    },
    {
        id: "Nampula",
        name: "Nampula",
        districts: [
            { id: "Angoche", name: "Angoche" },
            { id: "Eráti", name: "Eráti" },
            { id: "Ilha de Moçambique", name: "Ilha de Moçambique" },
            { id: "Lalaua", name: "Lalaua" },
            { id: "Larde", name: "Larde" },
            { id: "Liúpo", name: "Liúpo" },
            { id: "Malema", name: "Malema" },
            { id: "Meconta", name: "Meconta" },
            { id: "Mecubúri", name: "Mecubúri" },
            { id: "Memba", name: "Memba" },
            { id: "Mogincual", name: "Mogincual" },
            { id: "Mogovolas", name: "Mogovolas" },
            { id: "Moma", name: "Moma" },
            { id: "Monapo", name: "Monapo" },
            { id: "Mossuril", name: "Mossuril" },
            { id: "Muecate", name: "Muecate" },
            { id: "Murrupula", name: "Murrupula" },
            { id: "Nacala-a-Velha", name: "Nacala-a-Velha" },
            { id: "Nacala Porto", name: "Nacala Porto" },
            { id: "Nacarôa", name: "Nacarôa" },
            { id: "Nampula", name: "Nampula" },
            { id: "Rapale", name: "Rapale" },
            { id: "Ribáuè", name: "Ribáuè" }
        ]
    },
    {
        id: "Niassa",
        name: "Niassa",
        districts: [
            { id: "Chimbonila", name: "Chimbonila" },
            { id: "Cuamba", name: "Cuamba" },
            { id: "Lago", name: "Lago" },
            { id: "Lichinga", name: "Lichinga" },
            { id: "Majune", name: "Majune" },
            { id: "Mandimba", name: "Mandimba" },
            { id: "Marrupa", name: "Marrupa" },
            { id: "Maúa", name: "Maúa" },
            { id: "Mavago", name: "Mavago" },
            { id: "Mecanhelas", name: "Mecanhelas" },
            { id: "Mecula", name: "Mecula" },
            { id: "Metarica", name: "Metarica" },
            { id: "Muembe", name: "Muembe" },
            { id: "N'gauma", name: "N'gauma" },
            { id: "Nipepe", name: "Nipepe" },
            { id: "Sanga", name: "Sanga" }
        ]
    },
    {
        id: "Cabo Delgado",
        name: "Cabo Delgado",
        districts: [
            { id: "Ancuabe", name: "Ancuabe" },
            { id: "Balama", name: "Balama" },
            { id: "Chiúre", name: "Chiúre" },
            { id: "Ibo", name: "Ibo" },
            { id: "Macomia", name: "Macomia" },
            { id: "Mecúfi", name: "Mecúfi" },
            { id: "Meluco", name: "Meluco" },
            { id: "Metuge", name: "Metuge" },
            { id: "Mocímboa da Praia", name: "Mocímboa da Praia" },
            { id: "Montepuez", name: "Montepuez" },
            { id: "Mueda", name: "Mueda" },
            { id: "Muidumbe", name: "Muidumbe" },
            { id: "Namuno", name: "Namuno" },
            { id: "Nangade", name: "Nangade" },
            { id: "Palma", name: "Palma" },
            { id: "Pemba", name: "Pemba" },
            { id: "Quissanga", name: "Quissanga" }
        ]
    }
];
