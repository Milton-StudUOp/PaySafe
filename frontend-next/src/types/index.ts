export interface User {
    id: number;
    email: string;
    full_name: string;
    role: "ADMIN" | "FUNCIONARIO" | "SUPERVISOR" | "AUDITOR" | "COMERCIANTE" | "MERCHANT";
    status: "ATIVO" | "INATIVO" | "BLOQUEADO" | "SUSPENSO";
    last_login_at?: string;
    phone_number?: string;
    scope_province?: string;
    scope_district?: string;
    created_at?: string;
}

export interface Merchant {
    id: number;
    full_name: string;
    merchant_type: "FIXO" | "AMBULANTE";
    business_type?: string;
    business_name?: string;  // Nome Comercial
    market_id?: number;
    market_name?: string; // Enriched
    market_province?: string; // Enriched
    market_district?: string; // Enriched
    phone_number?: string;
    status: "ATIVO" | "INATIVO" | "SUSPENSO" | "BLOQUEADO";
    nfc_uid?: string;

    // KYC / Documents
    id_document_type?: "BI" | "PASSAPORTE" | "DIRE" | "OUTRO";
    id_document_number?: string;
    id_document_expiry?: string;
    id_document_expiry_date?: string; // Helper for frontend handling if needed

    // Mobile Money
    mobile_operator?: "VODACOM" | "TMCEL" | "MOVITEL";
    mpesa_number?: string;
    emola_number?: string;
    mkesh_number?: string;

    // Meta
    registered_at?: string;
    last_login_at?: string;

    // Finance (Snapshot)
    current_balance?: number;
    last_transaction_at?: string;
    total_collected_month?: number;

    // Approval
    approval_status?: "APROVADO" | "PENDENTE" | "REJEITADO";

    // Payment Status (Daily Fee - 10 MT/day)
    payment_status?: "REGULAR" | "IRREGULAR";
    last_fee_payment_date?: string;
    days_overdue?: number;
}

export interface Agent {
    id: number;
    agent_code: string;
    full_name: string;
    phone_number?: string;
    status: "ATIVO" | "INATIVO" | "SUSPENSO";
    last_login_at?: string;
    assigned_market_id?: number;
    assigned_region?: string;

    // Stats (Snapshot)
    total_collected_today?: number;
    total_collected_month?: number;
    transactions_count_today?: number;

    // Enriched
    market_name?: string;
    pos_devices?: POSDevice[];

    // Approval
    approval_status?: "APROVADO" | "PENDENTE" | "REJEITADO";
}

export interface POSDevice {
    id: number;
    serial_number: string;
    model: string;
    status: "ATIVO" | "INATIVO" | "MANUTENCAO" | "BLOQUEADO";
    last_seen?: string;
    assigned_agent_id?: number;
    assigned_agent?: Agent;

    // Stats
    total_collected_today?: number;
    transactions_count_today?: number;
    total_collected_month?: number;
    ticket_average?: number;

    // Location Info
    province?: string;
    district?: string;

    // Meta
    created_at?: string;

    // Approval
    approval_status?: "APROVADO" | "PENDENTE" | "REJEITADO";
}

export interface Market {
    id: number;
    name: string;
    province: string;
    district?: string;
    status: "ATIVO" | "INATIVO";
    created_at?: string;

    // Stats
    merchants_count?: number;
    active_merchants_count?: number;
    agents_count?: number;
    pos_count?: number;
    total_collected_today?: number;
    total_collected_month?: number;

    // Approval
    approval_status?: "APROVADO" | "PENDENTE" | "REJEITADO";
}

export interface Transaction {
    id: number;
    transaction_uuid: string;
    merchant_id: number;
    agent_id: number;
    pos_id: number;
    amount: number;
    currency: string;
    payment_method: "M-Pesa" | "e-Mola" | "mKesh" | "Cartao" | "Numerario";
    status: "SUCESSO" | "PENDENTE" | "FALHOU" | "CANCELADO";
    created_at: string;

    // Snapshot Location
    province?: string;
    district?: string;

    // References
    payment_reference?: string;
    mpesa_reference?: string;

    // Payloads
    request_payload?: any;
    response_payload?: any;
    merchant?: Merchant;
    agent?: Agent;
    funcionario?: User;
    pos_device?: POSDevice;
}

export interface AuthResponse {
    access_token: string;
    token_type: string;
    user: User;
}

export interface DashboardStats {
    revenue_today: number;
    tx_count_today: number;
    avg_ticket: number;
    paying_merchants_today: number;
    active_merchants: number;
    active_agents: number;
    active_pos: number;
}

export interface ChartData {
    name?: string;
    date?: string;
    hour?: string;
    value?: number;
    revenue?: number;
    count?: number;
    [key: string]: any; // Allow dynamic keys for Recharts
}

export interface DashboardAlert {
    type: "warning" | "error" | "info" | "success";
    message: string;
    entity: string;
}

export interface Province {
    id: number;
    name: string;
    code: string;
    created_at?: string;
    municipalities?: Municipality[];
}

export interface Municipality {
    id: number;
    name: string;
    province_id: number;
    created_at?: string;
}

