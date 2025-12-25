🎯 PROMPT COMPLETO — IMPLEMENTAÇÃO DE PAGAMENTO M-PESA (FUNCIONÁRIO)
CONTEXTO GERAL DO SISTEMA

Estamos a desenvolver um sistema POS moçambicano de classe mundial, com backend em FastAPI, frontend web em React + Next.js e POS Android.
O sistema é multi-jurisdição (província → distrito) e fortemente auditado.

Existe um SDK oficial de M-Pesa já presente no diretório do projeto, que deve ser reutilizado, não recriado.

👤 PERFIL DE ACESSO

Apenas o perfil FUNCIONARIO pode executar pagamentos

Outros perfis:

ADMIN: vê tudo, não executa pagamentos

SUPERVISOR: consulta, não paga

AUDITOR: apenas leitura e relatórios

👉 Qualquer tentativa de acesso por outro perfil deve:

Ser bloqueada

Ser registrada na auditoria como tentativa indevida

💳 OBJETIVO DA FUNCIONALIDADE

Implementar o fluxo completo de pagamento via M-Pesa, com:

Validações rigorosas

Integração real com SDK existente

Persistência segura

Auditoria detalhada

UX clara para sucesso, pendência e falha

🧩 FLUXO FUNCIONAL (PASSO A PASSO)
1️⃣ Início do Pagamento

O FUNCIONARIO inicia um pagamento informando:

Merchant ID (comerciante)

POS ID

Valor

Número M-Pesa do comerciante (Vodacom)

Referência da transação (gerada automaticamente)

Observação (obrigatória)

Validações iniciais:

Comerciante ativo

POS ativo

Comerciante pertence à mesma jurisdição do funcionário

Valor > 0

Funcionário ativo

2️⃣ Integração com SDK M-Pesa

Usar exclusivamente o SDK existente no projeto

Nunca expor credenciais no frontend

Executar chamada server-to-server

Estados possíveis retornados:

SUCCESS

PENDING

FAILED

TIMEOUT

3️⃣ Persistência da Transação

Criar registro completo na tabela transactions com:

transaction_id (UUID)

mpesa_reference

merchant_id

agent_id

pos_id

funcionario_id

amount

status

request_payload (JSON)

response_payload (JSON)

created_at

updated_at

province

district

⚠️ Nunca apagar transações, apenas atualizar status.

4️⃣ Atualização de Saldo

Se SUCCESS:

Atualizar saldo do comerciante

Atualizar saldo do sistema

Criar entrada de auditoria financeira

Se FAILED ou TIMEOUT:

Não alterar saldo

Registrar motivo técnico

5️⃣ Auditoria (OBRIGATÓRIO)

Registrar cada passo:

Tentativa de pagamento

Payload enviado

Resposta recebida

Usuário executor

IP

User-Agent

Timestamp

Resultado

Classificar logs como:

PAYMENT_ATTEMPT

PAYMENT_SUCCESS

PAYMENT_FAILED

PAYMENT_FRAUD_ATTEMPT (se aplicável)

🔐 SEGURANÇA (CRÍTICO)
Backend (FastAPI)

Endpoint protegido por:

JWT

Role = FUNCIONARIO

Jurisdição obrigatória

Bloquear:

Pagamento fora da jurisdição

Manipulação de IDs via URL ou payload

Frontend (React / Next.js)

Botão “Pagar” só aparece para FUNCIONARIO

Guard de rota

Feedback visual imediato

🖥️ UX / FEEDBACK AO USUÁRIO

O FUNCIONARIO deve ver:

Loading claro durante pagamento

Status em tempo real:

✅ Pago com sucesso

⏳ Pendente (aguardando confirmação M-Pesa)

❌ Falhou (com motivo técnico amigável)

Histórico das suas próprias transações

📊 RELATÓRIOS

As transações M-Pesa devem alimentar:

Relatórios financeiros

Relatórios por comerciante

Relatórios por agente

Auditoria avançada

❌ PROIBIÇÕES ABSOLUTAS

❌ Não permitir pagamento via frontend direto

❌ Não permitir edição manual de transação

❌ Não permitir retry automático sem registo

❌ Não ocultar falhas do usuário

✅ RESULTADO ESPERADO

Um sistema de pagamento:

Seguro

Auditável

Profissional

Compatível com padrões bancários

Preparado para inspeção regulatória

Digno de uma fintech moçambicana séria