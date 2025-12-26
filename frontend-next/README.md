# PaySafe Frontend (Next.js)

<div align="center">
  <img src="public/icon.svg" alt="PaySafe Logo" width="120" height="120" />
  
  **Sistema de Gestão de Pagamentos para Mercados Municipais**
  
  [![Next.js](https://img.shields.io/badge/Next.js-16.0.8-black?logo=next.js)](https://nextjs.org/)
  [![React](https://img.shields.io/badge/React-19.2-blue?logo=react)](https://reactjs.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript)](https://www.typescriptlang.org/)
</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Arquitetura](#-arquitetura)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Scripts Disponíveis](#-scripts-disponíveis)
- [Rotas da Aplicação](#-rotas-da-aplicação)
- [Componentes](#-componentes)
- [Autenticação](#-autenticação)
- [API e Serviços](#-api-e-serviços)
- [Padrões de Código](#-padrões-de-código)
- [Contribuição](#-contribuição)

---

## 🎯 Visão Geral

O **PaySafe Frontend** é uma aplicação web moderna construída com Next.js 16 para gestão de pagamentos em mercados municipais de Moçambique. O sistema permite:

- 📊 **Dashboard analítico** com métricas em tempo real
- 💳 **Gestão de transações** (pagamentos, taxas, registos)
- 👥 **Administração de comerciantes** e agentes de cobrança
- 🏪 **Controlo de mercados** e localizações
- 📱 **Gestão de dispositivos POS** (terminais Android)
- 📈 **Relatórios e exportações** (CSV, PDF)
- 🔐 **Sistema de autenticação** baseado em roles

### Papéis de Utilizador

| Role | Descrição | Acesso |
|------|-----------|--------|
| `ADMIN` | Administrador do sistema | Acesso total |
| `SUPERVISOR` | Supervisor de área | Gestão de agentes e mercados |
| `FUNCIONARIO` | Funcionário municipal | Operações diárias |
| `AGENTE` | Agente de cobrança | Registo de transações |
| `COMERCIANTE` | Comerciante/Lojista | Portal pessoal |

---

## 🛠 Tecnologias

### Core

| Tecnologia | Versão | Propósito |
|------------|--------|-----------|
| **Next.js** | 16.0.8 | Framework React com SSR/SSG |
| **React** | 19.2.1 | Biblioteca UI |
| **TypeScript** | 5.x | Tipagem estática |
| **Tailwind CSS** | 4.0 | Estilização utility-first |

### UI Components

| Biblioteca | Propósito |
|------------|-----------|
| **Radix UI** | Primitivos acessíveis (Dialog, Select, Toast, etc.) |
| **Lucide React** | Ícones SVG |
| **Recharts** | Gráficos e visualizações |
| **Framer Motion** | Animações |

### Utilitários

| Biblioteca | Propósito |
|------------|-----------|
| **Axios** | Cliente HTTP |
| **Zod** | Validação de schemas |
| **React Hook Form** | Gestão de formulários |
| **class-variance-authority** | Variantes de componentes |
| **js-cookie** | Gestão de cookies |

---

## 🏗 Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         BROWSER                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Next.js App Router                     │   │
│  │  ┌─────────────────────────────────────────────────────┐ │   │
│  │  │                     Middleware                      │ │   │
│  │  │  • Auth check     • Role-based routing             │ │   │
│  │  │  • JWT validation • API proxying                   │ │   │
│  │  └─────────────────────────────────────────────────────┘ │   │
│  │                                                           │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌──────────────────┐   │   │
│  │  │   (auth)    │ │ (dashboard) │ │    merchant      │   │   │
│  │  │   Layout    │ │   Layout    │ │    Layout        │   │   │
│  │  │  ┌───────┐  │ │  ┌───────┐  │ │  ┌───────────┐   │   │   │
│  │  │  │ Login │  │ │  │Sidebar│  │ │  │  Portal   │   │   │   │
│  │  │  └───────┘  │ │  │+Pages │  │ │  │ Simples   │   │   │   │
│  │  └─────────────┘ │  └───────┘  │ │  └───────────┘   │   │   │
│  │                   └─────────────┘ └──────────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    Components                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │    UI    │ │  Forms   │ │ Features │ │  Layout  │   │   │
│  │  │ (Radix)  │ │ (Dialogs)│ │(Business)│ │(Sidebar) │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Lib / Hooks                            │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   API    │ │   Auth   │ │  Hooks   │ │  Types   │   │   │
│  │  │ (Axios)  │ │(Context) │ │(Custom)  │ │  (TS)    │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │      FastAPI Backend          │
              │    http://localhost:8000      │
              └───────────────────────────────┘
```

### Fluxo de Dados

```
User Action → Component → Hook/API → Backend → Response → State Update → Re-render
```

---

## 📁 Estrutura do Projeto

```
frontend-next/
├── public/                      # Assets estáticos
│   ├── favicon.ico              # Favicon do site
│   ├── icon.svg                 # Ícone vetorial
│   ├── icon-*.png               # Ícones PWA (16x16 até 512x512)
│   ├── apple-touch-icon.png     # Ícone iOS
│   ├── og-image.png             # Imagem Open Graph
│   └── manifest.json            # PWA Manifest
│
├── scripts/
│   └── generate-icons.js        # Script para gerar ícones
│
├── src/
│   ├── app/                     # App Router (Next.js 13+)
│   │   ├── (auth)/              # Grupo de rotas de autenticação
│   │   │   ├── layout.tsx       # Layout de auth (card centralizado)
│   │   │   ├── login/           # Página de login
│   │   │   ├── loading.tsx      # Loading state
│   │   │   └── error.tsx        # Error boundary
│   │   │
│   │   ├── (dashboard)/         # Grupo principal (requer auth)
│   │   │   ├── layout.tsx       # Layout com Sidebar
│   │   │   ├── dashboard/       # Painel principal
│   │   │   ├── transactions/    # Gestão de transações
│   │   │   ├── merchants/       # Gestão de comerciantes
│   │   │   ├── agents/          # Gestão de agentes
│   │   │   ├── markets/         # Gestão de mercados
│   │   │   ├── pos/             # Dispositivos POS
│   │   │   ├── users/           # Administração de utilizadores
│   │   │   ├── reports/         # Relatórios
│   │   │   ├── audit/           # Logs de auditoria
│   │   │   ├── approvals/       # Fluxo de aprovações
│   │   │   ├── balances/        # Saldos
│   │   │   ├── locations/       # Localizações
│   │   │   ├── receipts/        # Recibos
│   │   │   ├── settings/        # Configurações
│   │   │   ├── health/          # Estado do sistema
│   │   │   ├── loading.tsx      # Dashboard loading skeleton
│   │   │   └── error.tsx        # Dashboard error boundary
│   │   │
│   │   ├── merchant/            # Portal do comerciante
│   │   │   ├── layout.tsx       # Layout simplificado
│   │   │   ├── dashboard/       # Painel do comerciante
│   │   │   ├── profile/         # Perfil
│   │   │   └── receipts/        # Meus recibos
│   │   │
│   │   ├── maintenance/         # Página de manutenção
│   │   ├── layout.tsx           # Root layout (SEO, Providers)
│   │   ├── page.tsx             # Redirect para /dashboard
│   │   ├── not-found.tsx        # Página 404
│   │   ├── error.tsx            # Página 500
│   │   ├── global-error.tsx     # Erro fatal
│   │   ├── loading.tsx          # Loading global
│   │   └── globals.css          # Estilos globais
│   │
│   ├── components/
│   │   ├── ui/                  # Componentes Radix/Shadcn
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── table.tsx
│   │   │   ├── table-skeleton.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   └── use-toast.ts
│   │   │
│   │   ├── forms/               # Formulários de entidades
│   │   │   ├── AgentForm.tsx
│   │   │   ├── MerchantForm.tsx
│   │   │   ├── MarketForm.tsx
│   │   │   ├── UserForm.tsx
│   │   │   └── POSDeviceForm.tsx
│   │   │
│   │   ├── features/            # Componentes de negócio
│   │   │   ├── StatsCard.tsx
│   │   │   ├── payments/
│   │   │   ├── merchants/
│   │   │   ├── markets/
│   │   │   └── users/
│   │   │
│   │   ├── layout/              # Componentes de layout
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   │
│   │   ├── StatusBadge.tsx
│   │   └── theme-provider.tsx
│   │
│   ├── hooks/
│   │   ├── useDocumentTitle.ts  # Títulos dinâmicos de página
│   │   └── useLocations.ts      # Hook para carregar localizações
│   │
│   ├── lib/
│   │   ├── api.ts               # Cliente Axios configurado
│   │   ├── auth.tsx             # Context de autenticação
│   │   ├── page-metadata.ts     # Metadados SEO por página
│   │   └── utils.ts             # Utilitários (cn, etc.)
│   │
│   ├── types/
│   │   └── index.ts             # Definições TypeScript
│   │
│   └── middleware.ts            # Middleware de autenticação
│
├── package.json
├── tailwind.config.ts
├── tsconfig.json
└── next.config.ts
```

---

## 🚀 Instalação

### Pré-requisitos

- **Node.js** 18.x ou superior
- **npm** 9.x ou superior
- **Backend FastAPI** a correr em `http://localhost:8000`

### Passos

```bash
# 1. Clonar o repositório
git clone https://github.com/Milton-StudUOp/PaySafe.git
cd paysafe-system/frontend-next

# 2. Instalar dependências
npm install

# 3. Iniciar o servidor de desenvolvimento
npm run dev

# 4. Abrir no browser
# http://localhost:3000
```

---

## ⚙️ Configuração

### Variáveis de Ambiente

Criar ficheiro `.env.local`:

```env
# URL do Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000

# URL da aplicação (para SEO/OG)
NEXT_PUBLIC_APP_URL=https://paysafe.co.mz
```

### Configuração do Backend

O frontend espera o backend FastAPI em `http://localhost:8000`. Para alterar:

1. Editar `src/lib/api.ts`:

```typescript
const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000",
    ...
})
```

---

## 📜 Scripts Disponíveis

| Script | Comando | Descrição |
|--------|---------|-----------|
| **dev** | `npm run dev` | Servidor de desenvolvimento (Turbopack) |
| **build** | `npm run build` | Build de produção |
| **start** | `npm start` | Iniciar build de produção |
| **lint** | `npm run lint` | Verificar código com ESLint |

### Scripts Adicionais

```bash
# Gerar ícones PWA a partir do SVG
node scripts/generate-icons.js

# Build para Windows (produção)
./run_prod_windows.bat
```

---

## 🛤 Rotas da Aplicação

### Públicas

| Rota | Descrição |
|------|-----------|
| `/login` | Página de autenticação |
| `/maintenance` | Página de manutenção |

### Protegidas (Dashboard)

| Rota | Descrição | Roles |
|------|-----------|-------|
| `/dashboard` | Painel principal | Todos |
| `/transactions` | Listagem de transações | Admin, Supervisor, Funcionário |
| `/transactions/[id]` | Detalhes de transação | Admin, Supervisor, Funcionário |
| `/merchants` | Gestão de comerciantes | Admin, Supervisor |
| `/agents` | Gestão de agentes | Admin, Supervisor |
| `/markets` | Gestão de mercados | Admin, Supervisor |
| `/pos` | Dispositivos POS | Admin, Supervisor |
| `/users` | Administração de utilizadores | Admin |
| `/reports` | Relatórios | Admin, Supervisor |
| `/audit` | Logs de auditoria | Admin |
| `/approvals` | Aprovações pendentes | Admin, Supervisor |
| `/settings` | Configurações | Todos |
| `/health` | Estado do sistema | Admin |

### Portal do Comerciante

| Rota | Descrição |
|------|-----------|
| `/merchant/dashboard` | Painel pessoal |
| `/merchant/profile` | Perfil e dados |
| `/merchant/receipts` | Histórico de recibos |

---

## 🧩 Componentes

### UI Components (Radix/Shadcn)

| Componente | Ficheiro | Descrição |
|------------|----------|-----------|
| `Button` | `ui/button.tsx` | Botões com variantes |
| `Card` | `ui/card.tsx` | Cards com header/content/footer |
| `Dialog` | `ui/dialog.tsx` | Modais |
| `Form` | `ui/form.tsx` | Wrapper para React Hook Form |
| `Input` | `ui/input.tsx` | Campos de texto |
| `Select` | `ui/select.tsx` | Dropdowns |
| `Table` | `ui/table.tsx` | Tabelas responsivas |
| `TableSkeleton` | `ui/table-skeleton.tsx` | Loading skeleton para tabelas |
| `Toast` | `ui/toast.tsx` | Notificações |
| `Badge` | `ui/badge.tsx` | Badges de status |

### Feature Components

| Componente | Descrição |
|------------|-----------|
| `StatsCard` | Cards de estatísticas com ícones |
| `NewPaymentDialog` | Modal de nova transação |
| `MerchantDetails` | Detalhes do comerciante |
| `MarketDetails` | Detalhes do mercado |

### Layout Components

| Componente | Descrição |
|------------|-----------|
| `Sidebar` | Navegação lateral com menu |
| `Header` | Cabeçalho de página com título |

---

## 🔐 Autenticação

### Fluxo

```
1. Utilizador submete credenciais no /login
2. Frontend envia POST /auth/login para backend
3. Backend retorna { access_token, user }
4. Frontend armazena token em cookie
5. AuthProvider mantém estado global do user
6. Middleware verifica token em cada request
7. Rotas protegidas redirecionam para /login se não autenticado
```

### Uso do AuthProvider

```tsx
import { useAuth } from "@/lib/auth"

function MyComponent() {
    const { user, isLoading, logout } = useAuth()
    
    if (isLoading) return <Loading />
    if (!user) return <Redirect to="/login" />
    
    return <div>Olá, {user.full_name}!</div>
}
```

### Verificação de Roles

```tsx
const { user } = useAuth()

// Verificar role
if (["ADMIN", "SUPERVISOR"].includes(user.role)) {
    // Mostrar opções de admin
}
```

---

## 🌐 API e Serviços

### Cliente API

```typescript
// src/lib/api.ts
import api from "@/lib/api"

// GET
const response = await api.get("/transactions")

// POST
await api.post("/merchants", { full_name: "João", ... })

// PUT
await api.put(`/merchants/${id}`, data)

// DELETE
await api.delete(`/merchants/${id}`)
```

### Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/auth/login` | POST | Autenticação |
| `/auth/me` | GET | Dados do utilizador atual |
| `/transactions` | GET/POST | Transações |
| `/merchants` | GET/POST | Comerciantes |
| `/agents` | GET/POST | Agentes |
| `/markets` | GET/POST | Mercados |
| `/pos-devices` | GET/POST | Dispositivos POS |
| `/reports/dashboard` | GET | Estatísticas do dashboard |
| `/reports/export/csv` | GET | Exportar transações CSV |

---

## 📝 Padrões de Código

### Estrutura de Página

```tsx
"use client"

import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import Header from "@/components/layout/Header"

export default function MyPage() {
    useDocumentTitle("mypage") // SEO
    
    return (
        <div className="space-y-6">
            <Header title="Título" subtitle="Descrição" />
            {/* Conteúdo */}
        </div>
    )
}
```

### Toast Notifications

```tsx
import { toast } from "@/components/ui/use-toast"

// Helpers
toast.success("Sucesso!", "Operação concluída")
toast.error("Erro!", "Algo correu mal")
toast.warning("Atenção!", "Verifique os dados")
toast.info("Info", "Informação útil")
```

### Formulários com Zod

```tsx
import { z } from "zod"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

const schema = z.object({
    name: z.string().min(2, "Nome muito curto"),
    email: z.string().email("Email inválido"),
})

const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "" }
})
```

---

## 🤝 Contribuição

1. Criar branch: `git checkout -b feature/nova-funcionalidade`
2. Fazer commits: `git commit -m "feat: descrição"`
3. Push: `git push origin feature/nova-funcionalidade`
4. Criar Pull Request

### Convenções de Commits

| Prefixo | Uso |
|---------|-----|
| `feat:` | Nova funcionalidade |
| `fix:` | Correção de bug |
| `docs:` | Documentação |
| `style:` | Formatação |
| `refactor:` | Refactoring |
| `test:` | Testes |
| `chore:` | Manutenção |

---

## 📄 Licença

Propriedade de **PaySafe Moçambique**. Todos os direitos reservados.

---

<div align="center">
  <sub>Desenvolvido com ❤️ pela equipa PaySafe</sub>
</div>
