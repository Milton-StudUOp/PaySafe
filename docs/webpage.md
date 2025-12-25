Perfeito — vou desenhar a aplicação web de gestão / portal do comerciante com Next.js + React, integrando exatamente com as tabelas e nomes técnicos que definimos (sem mudar nada). Vou entregar:

visão de páginas e permissões,

estrutura de pastas Next.js (App Router),

mapeamento claro de endpoints REST que o frontend usará (mantendo nomes das tabelas),

padrões de autenticação e segurança (sessões/cookies, roles),

stack de UI recomendada (componentes, tabelas, formulários, export CSV/PDF, gráficos),

estratégias de performance (SSR/ISR/CSR, SWR, paginação, índices),

e dois exemplos práticos de código (cliente API + página de listagem de merchants) prontos para colar.

Vou usar Portuguese (pt-MZ) e manter tudo prático — podes mandar isto direto ao time frontend.

1 — Usuários & Permissões (roles)

Roles (conformes à tabela users):

ADMIN — acesso total (gestão, configurações, reimpressão, rotacionar API keys)

SUPERVISOR — visões por mercado/região + criar/atribuir agentes

FUNCIONARIO — gerir merchants/pos/transações (operacional)

AUDITOR — apenas leitura (relatórios, recibos, audit_logs)

MERCHANT — apenas portal do comerciante (ver extrato, recibos, perfil)

Regras:

UI e endpoints com controle por role.

Separar views: Admin Console (gestão) x Merchant Portal (conta do comerciante).

Autorização feita no backend (FastAPI) e também no frontend para esconder UI.

2 — Páginas Principais (Next.js App Router: app/)

Admin / Gestão

/login — Login (users + password)

/dashboard — KPIs (totais, por mercado, por agente, gráficos)

/merchants — Listagem (filtros), botão Criar (modal), Import CSV

/merchants/[id] — Detalhe merchant (cadastro completo, KYC docs, saldo, transações)

/agents — CRUD agentes, atribuir mercados/pos, reset PIN

/pos — Dispositivos POS (status, last_seen, rotacionar api_key)

/transactions — Lista com filtros, export CSV, detalhes, reimpressão

/receipts — Buscar por receipt_code, listar e reimprimir

/balances — Saldo por merchant, filtros por mercado

/markets — CRUD mercados / geolocalização

/reports — Gerar relatórios diários/mensais, export CSV/PDF

/audit-logs — Lista imutável, filtros por actor/entity/date

/settings — Configurações do sistema (parâmetros, limites, templates de recibo)

/health — Monitor de saúde (ping DB, fila offline, jobs)

Merchant Portal

/merchant/login — login do comerciante (phone/email + password)

/merchant/dashboard — resumo, saldo, últimos recibos

/merchant/receipts — lista de recibos emitidos

/merchant/profile — editar dados, ver KYC, alterar password

3 — Endpoints REST (contrato — o Next.js consumirá o backend FastAPI)

Mantenho os nomes técnicos das tabelas como recursos REST:

GET    /api/markets
POST   /api/markets
GET    /api/markets/:id
PUT    /api/markets/:id
DELETE /api/markets/:id

GET    /api/merchants?market_id=&type=&status=&q=&page=&size=
POST   /api/merchants
GET    /api/merchants/:id
PUT    /api/merchants/:id
DELETE /api/merchants/:id

GET    /api/agents
POST   /api/agents
PUT    /api/agents/:id
POST   /api/agents/:id/reset-pin

GET    /api/pos
POST   /api/pos
PUT    /api/pos/:id
POST   /api/pos/:id/rotate-key

GET    /api/transactions?from=&to=&agent=&merchant=&pos=&status=&page=&size=
POST   /api/transactions
GET    /api/transactions/:id
POST   /api/transactions/:id/reprint

GET    /api/receipts?code=&from=&to=&page=&size=
GET    /api/receipts/:receipt_code

GET    /api/balances?market_id=&merchant_id=&page=&size=

GET    /api/audit-logs?entity=&actor_type=&from=&to=&page=&size=
GET    /api/reports/daily?date=
GET    /api/reports/by-agent?from=&to=


Notas:

Todas as rotas devem retornar JSON padrão { success: boolean, data: ..., error?: { code, message } }.

Paginação com page e size.

Filtros devem mapear índices SQL que já sugerimos (eg. transactions(created_at, merchant_id)).

4 — Autenticação / Sessões (recomendado: sessão baseada em cookie)

Recomendação (não usar JWT manual no frontend):

Backend (FastAPI) gerencia autenticação por users e merchants.

Ao fazer login, backend cria sessão server-side e envia cookie seguro:

Set-Cookie: session=<session_id>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=...

Next.js usa cookies automaticamente nas chamadas fetch (quando em server-side / API routes).

Para proteger páginas no Next.js:

usar middleware (Next.js middleware.ts) para redirecionar se cookie ausente/role não compatível.

ou usar SSR (server components) para validar sessão em getServerSideProps/server components.

Observações:

Para consumo SPA (CSR) use fetch('/api/auth/me') para obter perfil.

Rotas X-Device-Token (POS) continuam sendo header para POS. Admin web não precisa.

5 — Estratégia de Data Fetching & UX responsivo

Lista/CRUD: usar client-side fetching com SWR (stale-while-revalidate) + cursor/pagination para escalabilidade.

Detalhes sensíveis (ex.: merchant detail) — usar server-side rendering (SSR) para garantir dados prévios e SEO não importa aqui mas SSR melhora UX inicial.

Relatórios pesados: endpoints backend que geram CSV/PDF no servidor (streaming download).

Tempo real / notificações: SSE (Server-Sent Events) ou WebSocket para:

sinalizar POS offline/online,

novas transações em tempo real,

alertas de pendências.

Offline: não necessário no painel web, apenas no POS.

6 — UI Stack & Componentes recomendados

UI library: Mantine ou Chakra UI (componentes acessíveis, tema, modals).

Tabela: TanStack Table (antigo React Table) + react-virtual for large tables.

Forms: react-hook-form + yup / zod (validação).

Gráficos: Recharts ou Chart.js (para KPIs).

Export CSV/PDF: backend gera CSV via SQL export; para PDF, backend gera via report template (Weasy/ReportLab) ou usar jsPDF client-side para downloads rápidos.

File uploads (KYC): Upload para S3-compatible via Signed URL (backend fornece signed url), armazenar URLs em merchants.extra ou campo KYC.

7 — Estrutura de Pastas Next.js (App Router — app/)
app/
  layout.tsx                // shell global (header, sidebar)
  middleware.ts             // autenticação/role check
  page.tsx                  // /dashboard home
  login/page.tsx            // /login
  merchants/
    page.tsx                // /merchants
    [id]/
      page.tsx              // /merchants/[id]
      edit.tsx
  agents/
  pos/
  transactions/
  receipts/
  reports/
  audit-logs/
  settings/
lib/
  apiClient.ts              // wrapper fetch + error handling
  auth.ts                   // login/logout, getSession
  hooks/
    useSWR.ts
components/
  Table/
  Pagination/
  Filters/
  MerchantForm/
  AgentForm/
  ConfirmModal/
  ReceiptPreview/
utils/
  formatters.ts
  csv.ts
styles/

8 — Segurança & Boas Práticas

Server: TLS obrigatório (HTTPS), HSTS.

Cookies: HttpOnly + Secure + SameSite=Strict.

Rate-limit endpoints sensíveis (/auth/login, /transactions).

CSRF: se usar cookies, implementar CSRF tokens para chamadas mutating (ou usar SameSite strict + double submit).

Audit: cada ação importante gravar em audit_logs (create/update/delete/print/reprint).

Sanitização: validar e sanitizar entrada (backend Pydantic).

RBAC: checks server-side em todas rotas CRUD.

Logs: structured logs, rastreáveis por request-id.

9 — Performance e Escalabilidade

Paginação server-side (cursors preferíveis a offset para grandes dados).

Índices DB conforme filtros (já incluí índices nas tabelas transactions, receipts, audit_logs).

Cache de KPI em Redis (para dashboard que precisa alta velocidade).

Jobs assíncronos (Celery/RQ) para relatórios, sincronização offline, reimpressão remota.

Filas para reimpressão / notificações (se necessário).

Nota: MerchantsTable deve implementar paginação (chamar API com page/size) e ações (Editar, Ver, Exportar, Criar). Use react-hook-form para os formulários e zod para validação.

11 — Relatórios & Exportações (práticas)

Export CSV: botão que chama /api/reports/csv?from=...&to=... — backend gera stream CSV.

PDF: backend gera PDF com template do recibo (incluir receipt_code), retorna ficheiro.

Scheduled Reports: job diário envia relatório para admin via SFTP/email.

12 — Checklist para a equipa implementar

Criar projeto Next.js + TypeScript (App Router).

Configurar env:

NEXT_PUBLIC_API_BASE_URL

Instalar libs:

swr, react-hook-form, zod/yup, tanstack-table, mantine ou chakra-ui, recharts

Implementar lib/apiClient.ts e padrão de responses.

Implementar autenticação (login → backend cria cookie).

Middleware Next.js para proteger rotas.

Implementar páginas conforme lista acima.

Implementar testes básicos (Cypress para E2E; Jest + React Testing Library).

Integração com backend FastAPI (OpenAPI contract).

Auditoria: garantir que toda ação write passa por backend que grava em audit_logs.



