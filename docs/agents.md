A página de Agentes (Cobradores com POS) é crítica, porque é ela que controla:

quem pode operar um POS,

quais mercados/regiões cobre,

seus acessos (PIN),

suas ações no terreno,

quais POS estão atribuídos,

sua performance (transações, valores cobrados, produtividade),

identificação para auditoria e combate a fraude.

🧱 VISÃO GERAL DA PÁGINA AGENTES

Compreende:

Funcionalidades completas do módulo Agentes

Página: Agentes → Listagem

Página: Agentes → Detalhes

Página: Agentes → Criar/Editar

Página: Agentes → Atribuição de POS

Página: Agentes → Auditoria

Permissões por tipo de usuário

Tudo mantendo nomes técnicos das tabelas:

agents

pos_devices

transactions

audit_logs

markets

✅ 1) Funcionalidades completas da página AGENTES

A página deve permitir:

📌 Gestão completa dos agentes

Listagem de todos agentes

Criar novo agente

Editar dados do agente

Suspender / Reativar agente

Resetar PIN

Atribuir/desatribuir POS

Definir mercado principal

Definir região de operação

Consultar estatísticas operacionais

Ver transações realizadas pelo agente

Ver POS usados por ele

Consultar auditoria do agente

📌 Filtros avançados

Nome

Código do agente (agent_code)

Mercado designado

Região

Status (ATIVO / SUSPENSO / INATIVO)

Data de criação

Tem POS atribuído

Performance (ex: agentes com pouca cobrança)

📌 Indicadores de produtividade

Para cada agente:

Total cobrado hoje

Total do mês

Nº transações

Ticket médio

Hora da última cobrança

POS atribuído e status do POS

Gráfico de barras (transações por dia)

📌 Controlo operacional

Saber quem está no terreno e quando

Saber que POS está com qual agente

Ver agentes inativos (sem transações por X dias)

Ver agentes com falhas recorrentes de PIN

Ver agentes com transações offline pendentes

✅ 2) Página: Agentes → Listagem

Rota: /agents

Componentes obrigatórios:
🔍 Barra de busca:

Nome

Código do agente

Telefone

🎛️ Filtros:

Mercado

Região

Status

Tem POS? (sim/não)

Ordens:

Por produtividade

Por último login

Por valor cobrado

📊 Tabela principal com colunas:

agent_code

Nome

Telefone

Mercado / Região

Status

POS atribuído (serial number)

Último login

Total hoje

Ações

Botões principais:

+ Criar Agente

Exportar CSV

Ações na linha:

Ver detalhes

Editar

Resetar PIN

Suspender / Reativar

Ver POS associados

Ver transações

✅ 3) Página: Agentes → Detalhes

Rota: /agents/[id]

Secções:
🔹 1. Cabeçalho do Agente

Mostra:

Nome

Código

Telefone

Status

Mercado/Região

Botões:

Editar

Resetar PIN

Suspender / Reativar

Atribuir POS

🔹 2. Dados Pessoais / Profissionais

Nome completo

Código do agente (agent_code)

Telefone

Mercado designado

Região

Data de criação

Último login (last_login_at)

🔹 3. POS atribuído(s)

Mostrar tabela:

POS Serial

Modelo

Status

Último Seen (last_seen)

Botão: Desatribuir

Botão: Rotacionar API Key

Se mais de um POS for permitido no futuro, o design já deve suportar multi-POS.

🔹 4. Estatísticas de Operação

Gráficos e KPIs:

KPIs:

Total cobrado hoje

Total mensal

Número de transações

Ticket médio

% de transações falhadas

Tempo médio entre cobranças

Gráficos:

Transações por dia (últimos 7/30)

Horas de maior atividade

Receita por mercado (se opera em vários)

🔹 5. Tabela de Transações do Agente

Tabela vinculada à tabela transactions.

Colunas:

Data

Comerciante

Valor

Método (Dinheiro / M-Pesa / eMola / mKesh)

POS

Status

Receipt Code

Ações (Ver / Reimprimir)

Filtros:

Data

Mercado

Comerciante

Status

🔹 6. Auditoria do Agente

Puxado de audit_logs.

Itens:

Login

Mudança de PIN

Suspensão

Operações sensíveis

Falhas de autenticação

Mudança de POS

Mostrar:

Data

Ação

IP

Detalhes

✅ 4) Página: Agentes → Criar/Editar

Rota:

/agents/new

/agents/[id]/edit

Formulário:

Nome completo

agent_code

Telefone

Mercado associado

Região

Status

Criar PIN inicial ou Resetar PIN (apenas admin)

Validações:

agent_code único

Telefone válido

Mercado existente

Backend:

POST /api/agents

PUT /api/agents/:id

PIN nunca volta para frontend.

Admin vê:

“Gerar PIN temporário”

PIN exibido uma vez (auto-delete depois)

✅ 5) Página: Agentes → Atribuição de POS

Rota: /agents/[id]/pos

Tabela:

Lista de POS disponíveis:

Serial number

Modelo

Status

Último seen

Botão: Atribuir

Para POS já atribuídos:

Mostrar:

Serial

Modelo

Status

API Key Hash (oculta)

Botão: Rotacionar API Key

Botão: Desatribuir

Backend:

POST /api/pos/:id/assign

POST /api/pos/:id/unassign

POST /api/pos/:id/rotate-key

✅ 6) Página: Agentes → Auditoria

Rota: /agents/[id]/audit

Mostrar:

Listagem de logs conforme audit_logs

Filtros:

Data

Ação

IP

Entidade relacionada

Ações auditáveis:

Login

Reset PIN

Alterar mercado

Alterar dados pessoais

Atribuir/desatribuir POS

Transações do agente

Reimpressões

✅ 7) Permissões por tipo de usuário
Função	ADMIN	SUPERVISOR	FUNCIONARIO	AUDITOR
Ver agentes	✔	✔	✔	✔
Criar agentes	✔	✔	❌	❌
Editar agentes	✔	✔	❌	❌
Suspender/Reativar	✔	✔	❌	❌
Atribuir POS	✔	✔	❌	❌
Resetar PIN	✔	✔	❌	❌
Ver transações	✔	✔	✔	✔
Ver auditoria	✔	✔	❌	✔
Exportar CSV	✔	✔	✔	✔
🎯 Conclusão

A página de Agentes deve ser:

✔ Operacional

Controle total dos cobradores, POS e suas atividades.

✔ Analítica

KPIs, gráficos, métricas de performance.

✔ Segura

Reset de PIN, auditoria, registros imutáveis.

✔ Integrada

Comerciantes, POS, transações, auditoria, mercados.

✔ Escalável

Mais agentes → mais POS → mais cobranças → sistema preparado.