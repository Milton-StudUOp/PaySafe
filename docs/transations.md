🧱 1) FUNCIONALIDADES COMPLETAS DA PÁGINA TRANSACÕES

A página deve permitir:

📌 Gestão e visualização

Ver TODAS as transações do sistema (ou por permissões)

Ver transações do dia, semana, mês, período customizado

Ver transações por:

Comerciante

Agente

POS

Mercado

Método de pagamento (Dinheiro, M-Pesa, eMola, mKesh)

Status (SUCESSO / FALHOU / CANCELADO)

📌 Diagnóstico

Ver transações falhadas

Ver transações pendentes (offline → sincronização)

Ver transações suspeitas (valores atípicos)

Detecção de múltiplas tentativas com falha de PIN

📌 Auditoria

Ver o recibo gerado

Ver quantas vezes foi reimpresso

Ver logs do agente

Ver operação do POS

Tudo vinculado ao audit_logs

📌 Ferramentas administravas

Reimprimir recibo

Exportar CSV

Gerar relatório PDF

Abrir transação no detalhe

Ver transações do comerciante

Ver transações do agente

Ver transações do POS

🧱 2) PÁGINA: TRANSACÕES → LISTAGEM
Rota

/transactions

🔍 Barra de busca global

Busca por:

Nome do comerciante

Código/Nome do agente

Serial do POS

NFC UID

Receipt Code

transaction_uuid

Método de pagamento

Valor exato ou intervalo

🎛️ Filtros avançados:

Período: Hoje, Ontem, Últimos 7 dias, Mês atual, Personalizado

Comerciante

Tipo: FIXO / AMBULANTE

Mercado

Agente

POS

Método de pagamento

Status: SUCESSO / FALHOU / CANCELADO

Valor (mín / máx)

Horário (manhã / tarde / noite)

Has receipt? (sim / não)

📊 Tabela principal

Colunas recomendadas:

Coluna	Fonte	Descrição
Data/Hora	created_at	Timestamp da transação
Valor	amount	Valor cobrado
Comerciante	join merchants	Nome + tipo (fixo/ambulante)
Mercado	join markets	Onde a cobrança foi feita
Agente	join agents	Nome + agent_code
POS	join pos_devices	Número de série
Método	payment_method	Dinheiro / M-Pesa / etc
Status	status	Sucesso / Falhou / Cancelado
Receipt	join receipts	Código ou --- se sem recibo
Ações		Ver detalhe / Reimprimir
Botões principais:

Exportar CSV

Gerar relatório PDF

Resetar filtros

Regras de UX:

Paginação grande (100k+ registros) → usar cursor-based pagination

SWR para atualizações em tempo real

Loading skeletons

Indicar quando transações chegam via streaming (SSE/Websocket)

🧱 3) PÁGINA: TRANSACÕES → DETALHES
Rota

/transactions/[id]
ou
/transactions/tx/[transaction_uuid]

🔹 Seção 1 — Cabeçalho da Transação

Campos principais:

Valor

Data

Status (cor diferenciada)

transaction_uuid

Método de pagamento

Botões:

Ver recibo

Reimprimir

Exportar PDF

🔹 Seção 2 — Comerciante envolvido

Do merchants:

Nome

Tipo: FIXO / AMBULANTE

Mercado

Telefone

NFC UID

Mostrar botão:

Ver perfil do comerciante

Ver mais transações do comerciante

🔹 Seção 3 — Agente envolvido

Do agents:

Nome

Código

Telefone

Status

Último login

Botões:

Ver perfil

Ver transações do agente

🔹 Seção 4 — POS utilizado

Do pos_devices:

Serial

Modelo

Status

last_seen

Atribuição ao agente

Botões:

Ver POS

Ver histórico de uso

🔹 Seção 5 — Dados técnicos da transação

payment_method

payment_reference

nfc_uid (se houve leitura)

currency

IP (se armazenar no backend)

Foi offline? (sim/não)

Foi sincronizada? (sim/não)

🔹 Seção 6 — Recibo

Se existir em receipts:

receipt_code

issued_at

reprint_count

last_printed_at

Botão:

Reimprimir recibo

Ver detalhes do recibo

🔹 Seção 7 — Auditoria específica da transação

De audit_logs onde:

entity = 'TRANSACTION'

entity_id = [id]

Mostrar:

Ação

Actor (AGENT/ADMIN/SYSTEM)

IP

Data

Motivo

Eventos típicos:

Transação criada

Transação enviada do offline

Recibo reimpresso

Tentativa de fraude rejeitada

🧱 4) Filtros inteligentes (profissionais)
🔍 Filtro: Comerciantes que não pagaram

Backend:

merchant_id NOT IN (
  SELECT merchant_id 
  FROM transactions 
  WHERE DATE(created_at) = CURDATE()
  AND status = 'SUCESSO'
)

🔍 Filtro: POS sem receita
pos_id NOT IN (
  SELECT pos_id 
  FROM transactions 
  WHERE DATE(created_at) = CURDATE()
  AND status = 'SUCESSO'
)

🔍 Filtro: valores suspeitos

Valor maior que a média do comerciante + 3 desvios padrão (detecção automática).

🔍 Filtro: Falhas

Exibir transações com status = FALHOU ou CANCELADO.

🔍 Filtro: Agentes inativos

Agentes sem transações no período.

🧱 5) KPIs e estatísticas da página
KPIs superiores:

Total cobrado hoje

Total cobrado este mês

Nº de transações hoje

Ticket médio

Nº de comerciantes que pagaram hoje

Nº de POS ativos hoje

Nº de agentes ativos hoje

Gráficos:

Transações por hora

Valor por dia (últimos 30 dias)

Distribuição por método de pagamento

Ranking dos agentes mais produtivos

Ranking dos mercados mais lucrativos

Alertas:

Transações offline pendentes

POS sem sincronizar há muito tempo

Agente com falhas repetidas

Comerciante bloqueado tentando pagar

🧱 6) Segurança e Auditoria

Toda transação deve ter eventos auditáveis:

criação

sincronização (se offline)

reimpressão de recibo

consulta por auditor

transação falhada (motivo visível)

tentativa de fraude

No frontend:

Permitir que auditor veja tudo

Funcionário nunca edita transações

Admin apenas reimprime recibos

🧱 7) Permissões por tipo de usuário
Função	ADMIN	SUPERVISOR	FUNCIONARIO	AUDITOR
Ver transações	✔	✔	✔	✔
Filtros avançados	✔	✔	✔	✔
Exportar CSV	✔	✔	✔	✔
Ver detalhes	✔	✔	✔	✔
Ver recibo	✔	✔	✔	✔
Reimprimir recibo	✔	✔	❌	❌
Ver auditoria	✔	✔	❌	✔
Ver transações offline	✔	✔	✔	✔
Alterar dados de transação	❌	❌	❌	❌

Transações nunca são alteradas — é registro fiscal.

🎯 CONCLUSÃO

A página de transações se torna:

✔ O coração operacional do sistema
✔ O centro de auditoria
✔ A base para fiscalização
✔ A ferramenta principal para diagnóstico
✔ Integrada 100% ao esquema de dados

Tudo foi projetado de forma:

escalável

segura

fiscalmente rastreável

robusta

simples para operadores

poderosa para supervisores