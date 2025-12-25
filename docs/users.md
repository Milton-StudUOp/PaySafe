🧱 1) Funcionalidades completas da página USUÁRIOS

A página deve permitir:

📌 Gestão de contas

Criar usuários administrativos

Editar dados

Alterar role (permissões)

Suspender / Reativar usuário

Resetar password

Ver último login

Ver histórico de login

Ver logs de auditoria relacionados ao usuário

Atribuir mercados ou áreas (para supervisores)

📌 Segurança

Reset de password com token temporário

Forçar logout de todos dispositivos

Bloquear usuário imediatamente

Ver tentativas de login falhadas

Ver logins suspeitos

📌 Controlo e auditoria

Ver atividades do usuário:

Ações no sistema (auditorias, alterações, criacões, bloqueios)

IP de acesso

Horário do acesso

Exportar lista de usuários

Exportar atividades do usuário

🧱 2) Página: USUÁRIOS → Listagem
Rota

/users

🔍 Barra de busca:

Nome

Email

Telefone

Role

ID

🎛️ Filtros:

Role:

ADMIN

AUDITOR

FUNCIONARIO

SUPERVISOR

Status:

ATIVO

SUSPENSO

INATIVO

Último login:

Hoje

Últimos 7 dias

Últimos 30 dias

Nunca acessou

Mercado atribuído (se aplicável)

📊 Tabela principal:

Colunas importantes:

Coluna	Fonte	Descrição
Nome	full_name	Nome completo
Email	email	Login do usuário
Telefone	phone_number	Contacto
Role	role	Permissão
Status	status	ATIVO / SUSPENSO / INATIVO
Último login	last_login_at	Data
Criado em	created_at	Para auditoria
Ações		Ver / Editar / Suspender / Ativar / Reset Password
Botões:

+ Criar Usuário

Exportar CSV

🧱 3) Página: USUÁRIOS → Detalhes
Rota

/users/[id]

A estrutura deve ser bem organizada e clara.

🔹 1. Cabeçalho do Usuário

Mostrar:

Nome

Role

Status

Email

Telefone

Último login

Botões:

Editar

Suspender / Reativar

Resetar Password

Forçar Logout Geral

Ver Auditoria

🔹 2. Informações Pessoais

Nome completo

Email

Telefone

Role atual

Status atual

Data de criação

Último login

IP do último acesso (opcional)

🔹 3. Permissões (Role-Based View)

Mostrar uma explicação clara das permissões do role:

Role: ADMIN

Acesso total

Pode criar outros admins

Pode rotacionar API keys

Pode bloquear POS

Pode reimprimir recibos

Pode suspender agentes

Role: AUDITOR

Apenas leitura

Acesso total a logs

Não pode alterar nada

Role: FUNCIONARIO

Gestão operacional de merchants e transações

Não pode resetar PIN, bloquear POS, etc.

Role: SUPERVISOR

Gestão de mercados, agentes e métricas regionais

Botão:

Alterar Role (somente ADMIN)

🔹 4. Auditoria (Logs do Usuário)

Tabela baseada em audit_logs:

Data

Ação

Entidade afetada

ID da entidade

Descrição

IP

Tipo:

AGENT (se usuário fez ação em nome de agente)

ADMIN (se administração)

SYSTEM

Filtros:

Data

Tipo de ação

Entidade

🔹 5. Atividades recentes

Um resumo:

Nº de alterações feitas hoje

Merchants editados

Agentes alterados

POS alterados

Recibos reimpressos

Logins falhados

🧱 4) Página: USUÁRIOS → Criar / Editar Usuário
Rota:

/users/new

/users/[id]/edit

Formulário:

Nome completo

Email

Telefone

Role

Status

Mercado principal (se role = SUPERVISOR)

Criar senha inicial (opcional)

Ações do backend:

POST /api/users

PUT /api/users/:id

Segurança:

Senha nunca volta para frontend

Criar senha temporária → mostrada só 1 vez

Enviar via SMS (opcional)

🧱 5) Reset de password

Processo:

Admin clica “Resetar Password”

Sistema gera token temporário

Admin vê senha temporária APENAS UMA VEZ

Usuário será obrigado a trocar a senha no próximo login

Registrado em:

audit_logs (action = 'RESET_PASSWORD')

🧱 6) Controlo de sessão

Funções importantes:

🔐 Forçar logout do usuário

Invalida cookies/sessões no servidor

Útil se há suspeita de acesso indevido

🔐 Ver tentativas de login falhadas

Exibir:

email

IP

data/hora

motivo

🔐 Lock automático

Depois de X tentativas falhadas, status → SUSPENSO

🧱 7) Permissões por tipo de usuário
Função	ADMIN	SUPERVISOR	FUNCIONARIO	AUDITOR
Ver usuários	✔	✔	❌	✔
Criar usuários	✔	❌	❌	❌
Editar usuários	✔	❌	❌	❌
Suspender/Ativar	✔	❌	❌	❌
Resetar senha	✔	❌	❌	❌
Alterar role	✔	❌	❌	❌
Exportar CSV	✔	✔	❌	✔
Ver auditoria	✔	✔	❌	✔
🎯 CONCLUSÃO

A página Usuários torna-se um módulo profissional de:

✔ Segurança
✔ Governação de acessos
✔ Controlo interno
✔ Auditoria
✔ Compliance
✔ Escalabilidade administrativa

Tudo alinhado com o banco de dados e com o fluxo operacional do sistema.