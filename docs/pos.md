O módulo POS controla todos os terminais físicos usados pelos agentes e é essencial para:

segurança operacional

combate a fraude

monitoramento de actividade no terreno

tracking de cobranças por dispositivo

auditoria

gestão de inventário

Ele se conecta diretamente à tabela pos_devices e a outras como agents, transactions, receipts e audit_logs.

🧱 1) Funcionalidades completas do módulo POS

A página POS deve permitir:

📌 Gestão do inventário de dispositivos

Listar todos POS

Registrar novo POS

Editar POS existente

Atribuir POS a agentes

Desatribuir POS

Rotacionar API key (Segurança!)

Ver status do POS

Monitorar POS que não reportam há X horas (last_seen)

Desativar / bloquear POS

📌 Monitoramento operacional

Ver POS online/offline

Ver última atividade

Ver transações feitas por cada POS

Detectar POS suspeitos (offline muito tempo, transações anormais)

Listar POS não atribuídos

Listar POS usados por agentes suspensos

📌 Segurança

Rotação de api_key_hash

Bloqueio imediato do POS

Histórico de ações administrativas (audit_logs)

Rastreamento completo do POS no terreno

📌 Estatísticas por POS

Total cobrado hoje

Nº transações do dia

Valor mensal

Ticket médio

Performance por agente

🧱 2) Página: POS → Listagem

Rota: /pos

🔍 Barra de busca:

Serial number

Modelo

Código do agente

Nome do agente

🎛️ Filtros:

Status: ATIVO / INATIVO / BLOQUEADO

Atribuído a agente? (Sim/Não)

Mercado do agente

Último seen:

online agora

menos de 1 hora

mais de 24 horas

POS com pouca atividade

POS sem transações recentes

📊 Tabela principal:

Colunas:

Coluna Descrição
Serial Number identificador único
Modelo Sunmi, Pax, Gertec etc
Agente atribuído nome + código
Status ATIVO/INATIVO/BLOQUEADO
Last Seen quando o POS falou com backend
Transações hoje nº
Valor hoje total MZN
Ações ver / editar / bloquear / rotacionar API key

Botões principais:

+ Registrar POS

Exportar CSV

🧱 3) Página: POS → Detalhes

Rota: /pos/[id]

Secções principais:
🔹 1. Cabeçalho do POS

Mostrar:

Serial number (grande)

Modelo

Status

Botões:

Editar

Rotacionar API key

Atribuir/desatribuir agente

Bloquear / Ativar

🔹 2. Informação técnica

Campos:

Serial

Modelo

Versão do Android (se enviado no boot)

Versão do app POS instalada

API key hash (oculta)

Data de criação

Última sincronização (last_seen)

Primeiro login do agente

🔹 3. Agente associado

Se tiver agente:

Mostrar:

Nome do agente

Código

Telefone

Mercado

Último login

Botão: Desatribuir POS

Se não tiver agente:

Mostrar: "Nenhum agente atribuído"

Botão: Atribuir agente

🔹 4. Estatísticas operacionais

KPI cards:

Transações hoje

Valor total hoje

Ticket médio

Transações da semana

Valor do mês

Nº de comerciantes atendidos hoje

Gráficos:

Transações por hora (últimas 24h)

Valor por dia (últimos 30 dias)

🔹 5. Tabela de transações realizadas pelo POS

Puxado de transactions.

Campos:

Data

Comerciante

Valor

Agente

Método de pagamento

Status

Receipt Code

Ações: ver transação / ver recibo

Filtros:

Data

Valor

Comerciante

Método

Status

🔹 6. Tabela de recibos emitidos

Baseada em receipts.

Campos:

Receipt Code

Comerciante

Valor

Data

Reprint Count

Última impressão

Ação: Reimprimir

🔹 7. Auditoria do POS

Com base em audit_logs.

Exemplos de eventos:

POS registrado

POS atribuído a agente

POS desatribuído

API key rotacionada (super importante!)

POS bloqueado / reativado

Boot validation (cada inicialização do POS)

Falhas de autenticação da API key

Tabela:

Data/Hora

Actor

Ação

Descrição

IP

🧱 4) Página: POS → Criar / Editar

Rotas:

/pos/new

/pos/[id]/edit

Campos:

Serial Number (obrigatório, único)

Modelo

Selecionar agente (opcional)

Status

Gerar api_key automaticamente (hash)

Backend:

POST /api/pos

PUT /api/pos/:id

Validações:

serial_number único

agente existente (se atribuído)

🧱 5) Página: Atribuição de POS a Agente

Rota: /pos/[id]/assign-agent

Tabela de agentes disponíveis:

Nome

Código

Mercado

Nº de POS que já possui

Status

Botão: Atribuir

🧱 6) Botões críticos de segurança
🔐 1. Rotacionar API Key

Gere nova API key hash

Mostra a API key apenas uma vez

Registra em audit_logs

Invalida imediatamente a API key antiga

🛑 2. Bloquear POS

Impede qualquer acesso POS → backend

Deve exibir tela de POS bloqueado no dispositivo

🔄 3. Reiniciar POS (opcional se integrado via MDM)

Enviar comando remoto para reboot

🧱 7) Permissões por tipo de usuário
Função ADMIN SUPERVISOR FUNCIONARIO AUDITOR
Ver POS ✔ ✔ ✔ ✔
Criar POS ✔ ✔ ❌ ❌
Editar POS ✔ ✔ ❌ ❌
Bloquear / Ativar POS ✔ ✔ ❌ ❌
Rotacionar API key ✔ ❌ ❌ ❌
Atribuir POS ✔ ✔ ❌ ❌
Ver transações ✔ ✔ ✔ ✔
Ver recibos ✔ ✔ ✔ ✔
Auditoria ✔ ✔ ❌ ✔
Exportar CSV ✔ ✔ ✔ ✔
🎯 CONCLUSÃO

A página POS será um módulo de alto nível, com foco em:

✔ Segurança

API key segura

Auditoria completa

Detecção de anomalias

✔ Operação

Controle total de POS no terreno

Atribuição a agentes

Monitoramento em tempo real

✔ Análise

KPIs, gráficos, histórico

Transações por POS

Recibos emitidos

✔ Administração

Cadastro, edição, bloqueio, rotação de chaves

Este módulo fecha o ciclo operacional entre:

Agente → POS → Comerciante → Transação → Recibo
