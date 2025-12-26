# Arquitetura do Frontend PaySafe

Este documento descreve a arquitetura técnica do frontend Next.js do sistema PaySafe.

---

## 🏗️ Diagrama de Alto Nível

```mermaid
flowchart TB
    subgraph Browser["🌐 Browser"]
        subgraph NextApp["Next.js App"]
            MW["Middleware<br/>(Auth Check)"]
            
            subgraph RouteGroups["Route Groups"]
                Auth["(auth)<br/>Login"]
                Dashboard["(dashboard)<br/>Admin Panel"]
                Merchant["merchant<br/>Portal"]
            end
            
            subgraph SharedLayers["Shared Layers"]
                Components["Components<br/>UI, Forms, Features"]
                Hooks["Hooks<br/>useAuth, useLocations"]
                Lib["Lib<br/>API, Auth, Utils"]
            end
        end
    end
    
    subgraph Backend["⚙️ Backend"]
        API["FastAPI<br/>:8000"]
        DB[(PostgreSQL)]
    end
    
    MW --> RouteGroups
    RouteGroups --> SharedLayers
    SharedLayers --> API
    API --> DB
```

---

## 📂 Estrutura de Camadas

```mermaid
flowchart LR
    subgraph Presentation["📺 Presentation Layer"]
        Pages["Pages<br/>/app/**/page.tsx"]
        Layouts["Layouts<br/>/app/**/layout.tsx"]
    end
    
    subgraph UI["🎨 UI Layer"]
        UIComponents["UI Components<br/>Button, Card, Table..."]
        FormComponents["Form Components<br/>MerchantForm, UserForm..."]
        FeatureComponents["Feature Components<br/>StatsCard, PaymentDialog..."]
    end
    
    subgraph Logic["⚡ Logic Layer"]
        CustomHooks["Custom Hooks<br/>useLocations, useDocumentTitle"]
        AuthContext["Auth Context<br/>AuthProvider"]
        APIClient["API Client<br/>Axios Instance"]
    end
    
    subgraph Types["📝 Types Layer"]
        TypeDefs["Type Definitions<br/>User, Transaction, Market..."]
    end
    
    Pages --> UIComponents
    Pages --> FormComponents
    Pages --> FeatureComponents
    UIComponents --> CustomHooks
    FormComponents --> APIClient
    FeatureComponents --> AuthContext
    CustomHooks --> TypeDefs
    APIClient --> TypeDefs
```

---

## 🗂️ Estrutura de Rotas (App Router)

```mermaid
flowchart TD
    Root["/"] --> Login["/login<br/>(auth)"]
    Root --> Dashboard["/dashboard<br/>(dashboard)"]
    Root --> MerchantPortal["/merchant/*"]
    Root --> Maintenance["/maintenance"]
    Root --> NotFound["404"]
    Root --> Error["500"]
    
    subgraph DashboardRoutes["Dashboard Routes (Protected)"]
        Dashboard --> Transactions["/transactions"]
        Dashboard --> Merchants["/merchants"]
        Dashboard --> Agents["/agents"]
        Dashboard --> Markets["/markets"]
        Dashboard --> POS["/pos"]
        Dashboard --> Users["/users"]
        Dashboard --> Reports["/reports"]
        Dashboard --> Audit["/audit"]
        Dashboard --> Approvals["/approvals"]
        Dashboard --> Settings["/settings"]
        Dashboard --> Health["/health"]
        
        Transactions --> TxDetail["/transactions/[id]"]
        Merchants --> MerchantDetail["/merchants/[id]"]
        Agents --> AgentDetail["/agents/[id]"]
        Markets --> MarketDetail["/markets/[id]"]
        POS --> POSDetail["/pos/[id]"]
        Users --> UserDetail["/users/[id]"]
    end
    
    subgraph MerchantRoutes["Merchant Portal"]
        MerchantPortal --> MerchantDash["/merchant/dashboard"]
        MerchantPortal --> MerchantProfile["/merchant/profile"]
        MerchantPortal --> MerchantReceipts["/merchant/receipts"]
    end
```

---

## 🔐 Fluxo de Autenticação

```mermaid
sequenceDiagram
    participant U as User
    participant B as Browser
    participant MW as Middleware
    participant AP as AuthProvider
    participant API as FastAPI Backend
    
    U->>B: Acede a /dashboard
    B->>MW: Request
    MW->>MW: Verifica cookie "auth_token"
    
    alt Token Não Existe
        MW->>B: Redirect para /login
        U->>B: Submete credenciais
        B->>API: POST /auth/login
        API->>B: { access_token, user }
        B->>B: Armazena token em cookie
        B->>MW: Retry request
    end
    
    MW->>AP: Token válido
    AP->>API: GET /auth/me
    API->>AP: { user data }
    AP->>B: Renderiza página com user context
    B->>U: Mostra Dashboard
```

---

## 🎨 Hierarquia de Componentes

```mermaid
flowchart TD
    subgraph RootLayout["Root Layout"]
        ThemeProvider --> AuthProvider
        AuthProvider --> Toaster
        Toaster --> Children["Page Content"]
    end
    
    subgraph DashboardLayout["Dashboard Layout"]
        DashSidebar["Sidebar"]
        DashMain["Main Content"]
        DashSidebar --> Navigation
        DashMain --> Header
        DashMain --> PageContent
    end
    
    subgraph PageContent["Typical Page"]
        PC_Header["Header Component"]
        PC_Filters["Filters/Search"]
        PC_Table["Table with Data"]
        PC_Dialogs["Dialogs/Modals"]
        
        PC_Header --> PC_Filters
        PC_Filters --> PC_Table
        PC_Table --> PC_Dialogs
    end
    
    Children --> DashboardLayout
```

---

## 📊 Componentes UI (Radix UI Base)

```mermaid
flowchart LR
    subgraph RadixPrimitives["Radix UI Primitives"]
        RadixDialog["Dialog"]
        RadixSelect["Select"]
        RadixToast["Toast"]
        RadixTabs["Tabs"]
        RadixAlertDialog["AlertDialog"]
        RadixSwitch["Switch"]
        RadixAccordion["Accordion"]
    end
    
    subgraph ShadcnComponents["Shadcn/UI Wrappers"]
        Dialog["Dialog<br/>Modal windows"]
        Select["Select<br/>Dropdowns"]
        Toast["Toast<br/>Notifications"]
        Button["Button<br/>Actions"]
        Card["Card<br/>Containers"]
        Table["Table<br/>Data display"]
        Form["Form<br/>React Hook Form wrapper"]
        Input["Input<br/>Text fields"]
        Badge["Badge<br/>Status indicators"]
    end
    
    RadixDialog --> Dialog
    RadixSelect --> Select
    RadixToast --> Toast
```

---

## 🔄 Fluxo de Dados

```mermaid
flowchart LR
    subgraph UserAction["User Action"]
        Click["Click/Submit"]
    end
    
    subgraph Component["Component"]
        State["Local State<br/>useState"]
        Handler["Event Handler"]
    end
    
    subgraph API["API Layer"]
        AxiosInstance["Axios Instance<br/>lib/api.ts"]
        Interceptors["Request/Response<br/>Interceptors"]
    end
    
    subgraph Backend["Backend"]
        FastAPI["FastAPI<br/>Endpoint"]
        Database[(PostgreSQL)]
    end
    
    subgraph Response["Response"]
        UpdateState["Update State"]
        ShowToast["Show Toast"]
        Navigate["Navigate"]
    end
    
    Click --> Handler
    Handler --> State
    Handler --> AxiosInstance
    AxiosInstance --> Interceptors
    Interceptors --> FastAPI
    FastAPI --> Database
    Database --> FastAPI
    FastAPI --> Interceptors
    Interceptors --> UpdateState
    UpdateState --> ShowToast
```

---

## 🗃️ Gestão de Estado

```mermaid
flowchart TD
    subgraph GlobalState["Global State"]
        AuthContext["AuthContext<br/>User, Token, Loading"]
        ThemeContext["ThemeContext<br/>Light/Dark mode"]
    end
    
    subgraph LocalState["Local State (per page)"]
        PageData["Data State<br/>transactions, merchants, etc."]
        Loading["Loading State"]
        Filters["Filter State<br/>search, status, date"]
        Pagination["Pagination State<br/>page, limit"]
    end
    
    subgraph ServerState["Server State"]
        APIResponse["API Responses"]
        Cache["Browser Cache"]
    end
    
    GlobalState --> LocalState
    APIResponse --> PageData
    Filters --> APIResponse
```

---

## 📱 Responsividade

```mermaid
flowchart LR
    subgraph Breakpoints["Tailwind Breakpoints"]
        Mobile["< 640px<br/>(default)"]
        SM["≥ 640px<br/>(sm:)"]
        MD["≥ 768px<br/>(md:)"]
        LG["≥ 1024px<br/>(lg:)"]
        XL["≥ 1280px<br/>(xl:)"]
    end
    
    subgraph Components["Responsive Components"]
        Sidebar["Sidebar<br/>Hidden on mobile<br/>Visible on lg:"]
        Table["Table<br/>Scroll on mobile<br/>Full width on md:"]
        Cards["Cards Grid<br/>1 col mobile<br/>2-4 cols desktop"]
        Toasts["Toasts<br/>Top on mobile<br/>Bottom-right on sm:"]
    end
    
    Mobile --> Components
    SM --> Components
    MD --> Components
    LG --> Components
```

---

## 🔒 Controlo de Acesso por Role

```mermaid
flowchart TD
    subgraph Roles["User Roles"]
        Admin["ADMIN<br/>Full Access"]
        Supervisor["SUPERVISOR<br/>Area Management"]
        Funcionario["FUNCIONARIO<br/>Daily Operations"]
        Agente["AGENTE<br/>Field Collection"]
        Comerciante["COMERCIANTE<br/>Personal Portal"]
    end
    
    subgraph Routes["Route Access"]
        AllRoutes["Dashboard<br/>Transactions<br/>Settings"]
        AdminRoutes["Users<br/>Audit<br/>Health"]
        SupervisorRoutes["Merchants<br/>Agents<br/>Markets<br/>Approvals"]
        MerchantRoutes["Merchant Portal"]
    end
    
    Admin --> AllRoutes
    Admin --> AdminRoutes
    Admin --> SupervisorRoutes
    
    Supervisor --> AllRoutes
    Supervisor --> SupervisorRoutes
    
    Funcionario --> AllRoutes
    
    Agente --> AllRoutes
    
    Comerciante --> MerchantRoutes
```

---

## 🌐 Comunicação com Backend

```mermaid
flowchart LR
    subgraph Frontend["Frontend (localhost:3000)"]
        NextJS["Next.js"]
        AxiosClient["Axios Client"]
    end
    
    subgraph Middleware["Next.js Middleware"]
        AuthCheck["Auth Validation"]
        RoleCheck["Role Validation"]
    end
    
    subgraph Backend["Backend (localhost:8000)"]
        FastAPI["FastAPI"]
        
        subgraph Endpoints["API Endpoints"]
            Auth["/auth/*"]
            Transactions["/transactions/*"]
            Merchants["/merchants/*"]
            Agents["/agents/*"]
            Markets["/markets/*"]
            Reports["/reports/*"]
            POS["/pos-devices/*"]
        end
    end
    
    NextJS --> AxiosClient
    AxiosClient --> AuthCheck
    AuthCheck --> RoleCheck
    RoleCheck --> FastAPI
    FastAPI --> Endpoints
```

---

## 📈 Diagrama de Dependências

```mermaid
flowchart BT
    subgraph External["External Deps"]
        Next["next"]
        React["react"]
        Axios["axios"]
        Radix["@radix-ui/*"]
        Tailwind["tailwindcss"]
        Recharts["recharts"]
        Zod["zod"]
        HookForm["react-hook-form"]
    end
    
    subgraph Internal["Internal Modules"]
        Components["components/*"]
        Lib["lib/*"]
        Hooks["hooks/*"]
        Types["types/*"]
        App["app/*"]
    end
    
    App --> Components
    App --> Lib
    App --> Hooks
    Components --> Lib
    Components --> Types
    Hooks --> Lib
    Hooks --> Types
    Lib --> Types
    
    Components --> Radix
    Components --> Tailwind
    Lib --> Axios
    App --> Next
    App --> React
    Components --> React
```

---

## 📋 Resumo da Arquitetura

| Aspecto | Tecnologia/Padrão |
|---------|-------------------|
| **Framework** | Next.js 16 (App Router) |
| **UI Components** | Radix UI + Shadcn/UI |
| **Styling** | Tailwind CSS 4 |
| **State Management** | React Context + Local State |
| **Forms** | React Hook Form + Zod |
| **HTTP Client** | Axios com interceptors |
| **Auth** | JWT via cookies + Context |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Animations** | Framer Motion |

---

*Última atualização: 2025-12-26*
