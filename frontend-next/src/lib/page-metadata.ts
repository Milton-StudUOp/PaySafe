// Centralized page metadata configuration for SEO
// Used by page components to set document titles via useEffect

export const pageMetadata: Record<string, { title: string; description: string }> = {
    // Dashboard pages
    dashboard: {
        title: "Dashboard",
        description: "Painel principal com visão geral de transações, receitas e métricas do sistema"
    },
    transactions: {
        title: "Transações",
        description: "Listagem e gestão de todas as transações de pagamento"
    },
    merchants: {
        title: "Comerciantes",
        description: "Gestão de comerciantes e lojistas dos mercados municipais"
    },
    agents: {
        title: "Agentes",
        description: "Gestão de agentes de cobrança e operadores de campo"
    },
    markets: {
        title: "Mercados",
        description: "Gestão de mercados municipais e localizações"
    },
    pos: {
        title: "Terminais POS",
        description: "Gestão de dispositivos POS e terminais de pagamento"
    },
    users: {
        title: "Utilizadores",
        description: "Gestão de utilizadores e controlo de acessos"
    },
    reports: {
        title: "Relatórios",
        description: "Relatórios analíticos e exportação de dados"
    },
    audit: {
        title: "Auditoria",
        description: "Logs de auditoria e histórico de ações do sistema"
    },
    settings: {
        title: "Configurações",
        description: "Configurações do sistema e preferências"
    },
    approvals: {
        title: "Aprovações",
        description: "Fluxo de aprovações e solicitações pendentes"
    },
    balances: {
        title: "Saldos",
        description: "Visualização de saldos e movimentações financeiras"
    },
    locations: {
        title: "Localizações",
        description: "Gestão de províncias, distritos e jurisdições"
    },
    receipts: {
        title: "Recibos",
        description: "Histórico e impressão de recibos de transações"
    },
    health: {
        title: "Estado do Sistema",
        description: "Monitoramento de saúde e status dos serviços"
    },

    // Auth pages
    login: {
        title: "Login",
        description: "Acesso ao sistema PaySafe"
    },

    // Merchant portal
    "merchant-dashboard": {
        title: "Meu Negócio",
        description: "Painel do comerciante com resumo de vendas e transações"
    },
    "merchant-profile": {
        title: "Meu Perfil",
        description: "Informações e configurações do comerciante"
    },
    "merchant-receipts": {
        title: "Meus Recibos",
        description: "Histórico de recibos e comprovantes de pagamento"
    }
}

// Helper to format page title
export function getPageTitle(pageKey: string): string {
    const meta = pageMetadata[pageKey]
    return meta ? `${meta.title} | PaySafe System` : "PaySafe System"
}

// Hook for client components to set document title
export function usePageTitle(pageKey: string) {
    if (typeof window !== 'undefined') {
        const meta = pageMetadata[pageKey]
        if (meta) {
            document.title = `${meta.title} | PaySafe System`
        }
    }
}
