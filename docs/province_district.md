📘 ESPECIFICAÇÃO OFICIAL
CONTROLO DE JURISDIÇÃO + APROVAÇÃO ADMINISTRATIVA
Escopo

Aplica-se às entidades:

markets

merchants

agents

pos_devices

Campos de jurisdição:

province

district

1️⃣ CONCEITO-CHAVE (OBRIGATÓRIO)

👉 Usuários NÃO ADMINISTRADORES não podem criar ou alterar registros fora da sua jurisdição ativa.

Quando isso acontecer:

❌ NÃO deve falhar com erro genérico

✅ Deve entrar em estado PENDENTE

✅ Apenas ADMIN pode aprovar ou rejeitar

✅ Enquanto pendente:

o registro continua válido na jurisdição original

a mudança não é aplicada

aparece numa caixa de aprovação do administrador

2️⃣ NOVO CONCEITO DE ESTADO (STATUS DE APROVAÇÃO)
🔹 Campo novo (OBRIGATÓRIO)

Adicionar em TODAS as tabelas abaixo:

markets

merchants

agents

pos_devices

approval_status ENUM('APROVADO','PENDENTE','REJEITADO') 
DEFAULT 'APROVADO'


👉 Esse campo NÃO substitui status (ATIVO/INATIVO/etc)
👉 Ele controla apenas jurisdição e alterações sensíveis

3️⃣ REGRA 1 — CRIAÇÃO FORA DA JURISDIÇÃO
Situação

Usuário tenta CRIAR:

POS

Agente

Mercado

Comerciante

com province ou district diferente da sua jurisdição

Comportamento esperado

❌ NÃO criar diretamente

✅ Criar registro com:

approval_status = 'PENDENTE'
province = jurisdição do usuário
district = jurisdição do usuário


✅ Os dados “fora da jurisdição” devem ser salvos temporariamente numa tabela auxiliar (ver seção 6).

✅ Registro NÃO aparece para uso normal
✅ Registro APARECE APENAS:

para ADMIN

na Caixa de Aprovações Pendentes

Exemplo

Usuário da Província Maputo tenta criar POS em Nampula:

Resultado:

POS criado em Maputo

approval_status = PENDENTE

Pedido aparece para ADMIN decidir

4️⃣ REGRA 2 — EDIÇÃO DE JURISDIÇÃO (MUDANÇA)
Situação

Usuário tenta EDITAR um registro e alterar:

province

ou district

para fora da sua jurisdição atual

Comportamento esperado

❌ NÃO alterar imediatamente

✅ Sistema:

Mantém os valores antigos de province e district

Marca:

approval_status = 'PENDENTE'


✅ A alteração solicitada fica aguardando aprovação do ADMIN

✅ Enquanto pendente:

Registro continua visível na jurisdição antiga

Não afeta relatórios, POS, cobranças, etc.

5️⃣ DECISÃO DO ADMINISTRADOR
Tela exclusiva: Aprovações Pendentes

Admin vê lista com:

Tipo da entidade (POS, Agent, Market, Merchant)

Usuário solicitante

Jurisdição atual

Jurisdição solicitada

Data da solicitação

Botões:

✅ Aprovar

❌ Rejeitar

🔹 Ao APROVAR

Sistema:

Atualiza province e district para os novos valores

Define:

approval_status = 'APROVADO'


Registra em audit_logs:

ACTION = 'APPROVE_JURISDICTION_CHANGE'

🔹 Ao REJEITAR

Sistema:

Descarta alteração solicitada

Mantém jurisdição original

Define:

approval_status = 'REJEITADO'


Registra em audit_logs:

ACTION = 'REJECT_JURISDICTION_CHANGE'

6️⃣ TABELA AUXILIAR OBRIGATÓRIA — jurisdiction_change_requests

Para NÃO perder dados enquanto pendente.

CREATE TABLE jurisdiction_change_requests (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    entity_type ENUM('MARKET','MERCHANT','AGENT','POS') NOT NULL,
    entity_id BIGINT NOT NULL,

    requested_province VARCHAR(100) NOT NULL,
    requested_district VARCHAR(100) NOT NULL,

    requested_by_user_id BIGINT NOT NULL,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    status ENUM('PENDENTE','APROVADO','REJEITADO') DEFAULT 'PENDENTE',
    reviewed_by_admin_id BIGINT NULL,
    reviewed_at TIMESTAMP NULL,
    review_notes TEXT NULL
);

7️⃣ REGRA 3 — MENSAGENS DE ERRO (UX OBRIGATÓRIO)
❌ ERRO ATUAL (ERRADO)

“Erro ao registrar POS. Verifique se o Serial Number é único.”

✅ COMPORTAMENTO CORRETO

Erros SEMPRE específicos por causa:

Situação	Mensagem
Serial duplicado	Serial Number já existe.
Fora da jurisdição	Criação fora da sua jurisdição. Pedido enviado para aprovação.
Campo inválido	Campo X inválido.
Permissão	Você não tem permissão para esta ação.
POS bloqueado	POS bloqueado.

👉 Nunca misturar erros de validação com regras de negócio.

8️⃣ VISIBILIDADE DOS REGISTROS
Situação	Usuário comum	Admin
APROVADO	✔ visível	✔ visível
PENDENTE	❌ oculto	✔ visível
REJEITADO	❌ oculto	✔ visível

⚠️ Exceção:

Durante edição de jurisdição, o registro continua visível na jurisdição antiga até decisão do admin.

9️⃣ AUDITORIA (OBRIGATÓRIO)

Cada evento gera audit_logs:

REQUEST_JURISDICTION_CHANGE

APPROVE_JURISDICTION_CHANGE

REJECT_JURISDICTION_CHANGE

Campos mínimos:

actor_type

actor_id

entity

entity_id

descrição clara

IP

timestamp

🔟 PERMISSÕES (RBAC)
Ação	ADMIN	SUPERVISOR	FUNCIONÁRIO
Criar na própria jurisdição	✔	✔	✔
Criar fora da jurisdição	✔ direto	❌ pendente	❌ pendente
Editar jurisdição	✔ direto	❌ pendente	❌ pendente
Aprovar/Rejeitar	✔	❌	❌
Ver pendentes	✔	❌	❌
1️⃣1️⃣ CHECKLIST FINAL PARA IA CODER
Backend

 Criar campo approval_status

 Criar tabela jurisdiction_change_requests

 Interceptar CREATE e UPDATE

 Validar jurisdição do usuário

 Criar request pendente se necessário

 Bloquear aplicação imediata

 Criar endpoints de aprovação (ADMIN)

 Registrar auditoria

Frontend (Next.js)

 Mostrar aviso “Enviado para aprovação”

 Criar tela “Aprovações Pendentes”

 Exibir diferenças (antes/depois)

 Mensagens de erro específicas

 Ocultar registros pendentes para não-admin

🎯 RESULTADO FINAL

Com essas regras implementadas:

✔ Nenhum usuário cria dados fora da sua jurisdição
✔ Nenhuma alteração sensível acontece sem aprovação
✔ O sistema fica hierárquico, seguro e governável
✔ O ADMIN tem controlo total
✔ Auditoria completa
✔ UX clara (sem erros genéricos)

👉 Este é exatamente o modelo usado em sistemas governamentais e fiscais reais.