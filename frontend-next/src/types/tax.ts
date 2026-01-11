export interface TaxConfiguration {
    id: number;
    code: string;
    name: string;
    category: "IMPOSTO" | "TAXA" | "MULTA" | "OUTROS";
    description?: string;
    is_fixed_amount: boolean;
    default_amount?: number;
    is_active: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface TaxConfigurationCreate {
    code: string;
    name: string;
    category: "IMPOSTO" | "TAXA" | "MULTA" | "OUTROS";
    description?: string;
    is_fixed_amount: boolean;
    default_amount?: number;
}

export interface TaxConfigurationUpdate {
    name?: string;
    category?: "IMPOSTO" | "TAXA" | "MULTA" | "OUTROS";
    description?: string;
    is_fixed_amount?: boolean;
    default_amount?: number;
    is_active?: boolean;
}
