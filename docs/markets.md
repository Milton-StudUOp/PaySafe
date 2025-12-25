A gestão de Mercados é crucial no teu sistema porque:

define a distribuição geográfica dos comerciantes,

permite medir receita por zona,

controla os cobradores atribuídos,

é base para auditoria, fiscalização e estatísticas,

e organiza FIXOS / AMBULANTES por localização real.

A seguir está o módulo completo, cobrindo:

Funcionalidades do módulo

Página: Mercados → Listagem

Página: Mercados → Detalhes

Página: Mercados → Criar/Editar

Página: Mercados → Estatísticas e relatórios

Permissões por tipo de usuário

🧱 1) FUNCIONALIDADES COMPLETAS DO MÓDULO “MERCADOS”

A página Mercados deve permitir:

📌 Gestão completa

Criar mercado

Editar mercado

Definir status ATIVO / INATIVO

Atribuir agentes ao mercado

Visualizar comerciantes fixos e ambulantes daquele mercado

Localizar o mercado no mapa (opcional, via latitude/longitude)

Ver estatísticas daquele mercado

Exportar dados

📌 Consultas e controles operacionais

Listar quantos comerciantes existem por mercado

Ver quantos agentes estão atribuídos a cada mercado

Saber a receita total por mercado

Saber o total de transações do dia/mês

Ver POS que atuam naquele mercado

Consultar auditoria relacionada ao mercado

📌 KPIs importantes

Para cada mercado:

Total cobrado hoje

Total do mês

Nº de comerciantes ativos

Nº de ambulantes ativos

Nº de agentes atribuídos

Nº de transações

Ticket médio

POS ativos no mercado

Tudo baseado nas tabelas:

markets

merchants

agents

transactions

pos_devices

🧱 2) PÁGINA: Mercados → Listagem

Rota: /markets

🔍 Barra de busca:

Nome do mercado

Cidade

Distrito

Bairro

🎛️ Filtros:

Status (ATIVO / INATIVO)

Tem comerciantes? (Sim / Não)

Tem agentes atribuídos? (Sim / Não)

📊 Tabela principal

Colunas:

Nome

Província

Distrito

Bairro

Nº de comerciantes

Nº de ambulantes

Nº de agentes

Status

Ações

Ações:

Ver detalhes

Editar mercado

Ativar/Inativar

Exportar CSV

Botões:

+ Criar Mercado

🧱 3) PÁGINA: Mercados → Detalhes

Rota: /markets/[id]

Seções principais:
🔹 1. Cabeçalho do Mercado

Nome

Localização (Província > Distrito > Bairro)

Status

Botões:

Editar

Ativar/Inativar

🔹 2. Mapa / Localização (se houver latitude/longitude)

Um pequeno mapa mostrando o ponto geográfico.

🔹 3. Estatísticas do Mercado
KPIs:

Total cobrado hoje

Total cobrado no mês

Nº de comerciantes fixos

Nº de ambulantes

Nº de agentes atribuídos

Nº de POS ativos

Nº de transações nas últimas 24h

Ticket médio

Gráficos:

Receita diária (últimos 30 dias)

Número de transações por dia

Ranking dos agentes mais produtivos

Comparação entre fixos vs ambulantes

Tudo derivado de consultas a:

transactions

merchants

agents

pos_devices

🔹 4. Comerciantes do Mercado

Tabela com:

Nome

Tipo (FIXO/AMBULANTE)

Telefone

NFC UID

Status

Última transação

Ações

Botão: Ver Comerciante

🔹 5. Agentes do Mercado

Tabela com:

Código do agente

Nome

Telefone

POS atribuído

Status

Último login

Total hoje

Ações: Ver / Reatribuir POS

Botão: Ver Agente

🔹 6. POS do Mercado

Tabela:

Serial do POS

Modelo

Status

Agente atribuído

Último seen

Transações hoje

🔹 7. Auditoria do Mercado

Listagem filtrada de audit_logs onde:

entity = 'MARKET'

entity_id = [id do mercado]

Campos:

Data

Ação

Actor (agente/admin)

IP

Descrição

Exemplos de ações:

Mercado criado

Mercado atualizado

Agente atribuído/desatribuído

Comerciante movido para este mercado

🧱 4) PÁGINA: Criar / Editar Mercado

Rotas:

/markets/new

/markets/[id]/edit

Campos obrigatórios:

Nome do mercado

Província

Distrito

Bairro

Status

Campos opcionais:

Latitude

Longitude

Backend:

POST /api/markets

PUT /api/markets/:id

Validação:

Nome do mercado deve ser único dentro do distrito

Latitude/longitude devem ser válidas se preenchidas

🧱 5) PÁGINA: Relatórios por Mercado

Rota: /markets/[id]/reports

Relatórios disponíveis:
📊 Relatório 1 — Receita diária

Tabela + gráfico

Período: hoje / semana / mês / personalizado

📊 Relatório 2 — Comerciantes com mais pagamentos

Ranking TOP 10 fixos

Ranking TOP 10 ambulantes

📊 Relatório 3 — Agentes mais produtivos

Total cobrado

Nº de transações

📊 Relatório 4 — POS ativos / inativos

Frequência de uso

Última sincronização

📊 Relatório 5 — Comerciantes que não pagaram no período

Consulta baseada em:

SELECT * FROM merchants
WHERE market_id = :id
AND status = 'ATIVO'
AND id NOT IN (
    SELECT merchant_id
    FROM transactions
    WHERE DATE(created_at) = :hoje
    AND status = 'SUCESSO'
);

Exportações:

CSV

PDF

🧱 6) Permissões por tipo de usuário
Função ADMIN SUPERVISOR FUNCIONARIO AUDITOR
Ver mercados ✔ ✔ ✔ ✔
Criar mercados ✔ ✔ ❌ ❌
Editar mercados ✔ ✔ ❌ ❌
Ativar/Inativar ✔ ✔ ❌ ❌
Ver comerciantes do mercado ✔ ✔ ✔ ✔
Ver agentes do mercado ✔ ✔ ✔ ✔
Relatórios por mercado ✔ ✔ ✔ ✔
Exportar dados ✔ ✔ ✔ ✔
Auditoria ✔ ✔ ❌ ✔
🎯 CONCLUSÃO

A página Mercados será um módulo completo, permitindo:

gestão de localizações,

análise operacional,

auditoria total,

visão dos comerciantes e agentes daquele mercado,

relatórios avançados,

rastreabilidade administrativa,

integração total com transactions, merchants, agents, pos_devices e audit_logs.

👉 É um módulo de gestão territorial — nível institucional, escalável para centenas de mercados nacionais.
