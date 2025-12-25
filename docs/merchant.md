✅ 1) Funcionalidades completas da página COMERCIANTES

A página deve permitir:

📌 Gestão de comerciantes (fixos e ambulantes)

Listagem completa com paginação

Criação de novos comerciantes

Criação rápida de ambulantes (mínimos dados)

Edição de comerciantes existentes

Suspender / Bloquear comerciantes

Atribuir comerciante a um mercado

Verificar documentação (BI, DIRE, Passaporte)

Visualizar e editar contactos

Ver histórico de acessos do comerciante

Alterar password do comerciante (admin)

📌 Filtros avançados

Filtrar comerciantes por:

Nome

Tipo (FIXO / AMBULANTE)

Mercado

Operadora (Vodacom / Tmcel / Movitel)

Status (ATIVO, SUSPENSO, BLOQUEADO)

Tem NFC / Não tem NFC

Tem mobile money / Não tem

Data de cadastro

📌 Consultas rápidas

Buscar comerciante por:

Nome

Número de documento

Número M-Pesa / eMola / mKesh

NFC UID

ID interno

📌 Ações administrativas

Resetar password do comerciante

Atualizar informações KYC

Associar comerciante a mercados diferentes

Exportar lista completa para CSV

Exportar KYC específico para auditoria

Validar identidade

Ver recibos emitidos para o comerciante

Ver todas transações do comerciante

📌 Indicadores e estado financeiro

Cada comerciante deve apresentar:

Saldo atual (balances.current_balance)

Última transação (last_transaction_at)

Total cobrado no mês

Dívidas / pagamentos pendentes

Média de pagamentos por período

📌 Links rápidos

Ver detalhes (perfil completo)

Ver transações

Ver recibos

Ver KYC

Ver atividade de auditoria (audit_logs)

✅ 2) Página: Comerciantes → Listagem

Rota: /merchants

Componentes obrigatórios:

Barra de busca global (nome, documento, recebo, NFC, telefone)

Filtros avançados:

Tipo: FIXO/AMBULANTE

Mercado

Operadora

Status

Data de cadastro

Tabela principal com colunas:

Nome

Tipo (FIXO / AMBULANTE)

Mercado

Telefone

NFC UID

Operadora

Estado

Saldo

Última transação

Ações

Ações na tabela:

Ver perfil

Editar

Suspender / Bloquear

Resetar password

Ver transações

Ver recibos

Botões principais:

+ Criar Comerciante Fixo

+ Criar Ambulante Rápido

Exportar CSV

Página deve suportar:

Ordenação por qualquer coluna

Paginação (cursor-based, recomendado)

Atualização automática com SWR

Skeleton loading

✅ 3) Página: Comerciantes → Ver Detalhes

Rota: /merchants/[id]

Secções obrigatórias:
🎯 1. Cabeçalho (Identidade)

Nome completo

Tipo: FIXO / AMBULANTE

STATUS (ATIVO / SUSPENSO / BLOQUEADO)

Botões:

Editar

Suspender

Resetar password

Mudar mercado

🎯 2. Dados pessoais

Tipo de documento

Número do documento

Data expiração

Contatos

Operadora

🎯 3. Informações comerciais

Tipo de negócio

Mercado

Data de cadastro

🎯 4. Identificação tecnológica

NFC UID

Telefones mobile money

mpesa_number

emola_number

mkesh_number

🎯 5. Estado financeiro

Saldo atual

Última transação

Total recebido no mês

Total recebido no ano

Média diária

🎯 6. Aba: Transações

Tabela com:

Data

Valor

Agente

POS

Método de pagamento

Status

Receipt Code

Botão para abrir detalhes

🎯 7. Aba: Recibos

Código do recibo

Data

Valor

Botão reimprimir

Botão ver detalhes

🎯 8. Aba: Auditoria

Lista de ações do comerciante:

Login

Mudança de dados

Reset de password

Alteração de mercado

Quais agentes cobraram dele

🎯 9. Aba: Portal do comerciante

Status de acesso

Último login

Resetar senha

Ver simulador do painel do comerciante

✅ 4) Página: Comerciantes → Criar / Editar

Rota:

/merchants/new

/merchants/[id]/edit

Formulário completo para FIXOS:

Nome completo

Tipo documento / número / validade

Telefone

Operadora

Tipo de negócio

Mercado

mpesa_number

emola_number

mkesh_number

NFC UID

Status

Password inicial (opcional)

Formulário rápido para AMBULANTES:

Nome ou apelido

Mercado (default = mercado do agente)

Observação opcional

Botão: Criar Ambulante

Funções de backend chamadas:

POST /api/merchants

PUT /api/merchants/:id

Validações:

Documento duplicado (fixos)

NFC em uso

Telefone válido

Operadora válida

Número M-Pesa/eMola válido

Mercado existente

✅ 5) Funcionalidades administrativas especiais
🔒 Resetar password do comerciante

Admin clica: “Resetar senha”

Modal:

“Deseja gerar nova senha temporária?”

Backend envia nova senha (opção de SMS)

🔒 Mudar status

ATIVO → SUSPENSO (motivo obrigatório)

ATIVO → BLOQUEADO (motivo obrigatório)

🔒 Mudar mercado

Dropdown de mercados

Movimentação fica registrada em audit_logs

🔒 Vincular NFC UID

Para comerciantes fixos

Botão: “Associar NFC”

Lê NFC no POS → envia para web (opcional)
ou

Digitar NFC UID manualmente

✅ 6) Permissões por tipo de usuário
Função	ADMIN	SUPERVISOR	FUNCIONARIO	AUDITOR	MERCHANT
Ver comerciantes	✔	✔	✔	✔	❌
Criar comerciantes	✔	✔	✔	❌	❌
Criar ambulantes	✔	✔	✔	❌	❌
Editar comerciantes	✔	✔	✔	❌	❌
Suspender/Bloquear	✔	✔	❌	❌	❌
Resetar password	✔	✔	❌	❌	❌
Ver transações	✔	✔	✔	✔	✔ (somente dele)
Ver recibos	✔	✔	✔	✔	✔ (somente dele)
Ver auditoria	✔	✔	❌	✔	❌
Exportar CSV	✔	✔	✔	✔	❌
🎯 CONCLUSÃO

A página Comerciantes passa a ser um módulo completo, robusto e ao nível de sistemas governamentais e fiscais, contendo:

CRUD profissional

Filtros avançados

Perfis distintos de acesso

Auditoria total

Visão financeira e operacional

Integração com transactions, receipts, balances

Suporte a FIXOS e AMBULANTES