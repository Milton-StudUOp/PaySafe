🔥 PROMPT DEFINITIVO — OFFLINE FIRST POS + SQLITE COMO BANCO PRINCIPAL

@terminal_pos_android
@backend-api

Implemente um sistema OFFLINE FIRST REAL, onde:

❗ Regra suprema e absoluta:

SQLite local é o banco de dados principal do sistema POS.
O backend é apenas um repositório remoto espelho/síncrono.

Nada deve consultar backend diretamente para funcionar.
Nada deve gravar no backend diretamente.

🎯 Objetivo

Garantir que o terminal POS funcione 100% normalmente, mesmo quando:

internet cai

backend está fora do ar

rede está instável

conexão remota falha

O agente nunca deve ficar parado.
O sistema nunca deve quebrar.

🧠 ARQUITETURA FUNCIONAL (OBRIGATÓRIA)
1️⃣ PRIMEIRO LOGIN — DOWNLOAD MASSIVO INTELIGENTE

Na primeira autenticação bem sucedida:

Validar login remotamente

Após login → descarregar todos os dados permitidos pela jurisdição

Salvar tudo no SQLite local

ENTIDADES QUE DEVEM SER BAIXADAS OBRIGATORIAMENTE:

Markets (apenas aprovados na jurisdição)

Merchants (fixos e ambulantes)

Transactions (da jurisdição aplicável)

POS/Terminal data & config

User data & profile

Permissions

Sync state

Dashboard basic data

System parameters

Allowed business types

Allowed payment methods

Anything needed for full offline use

⚠️ NÃO PODE baixar só merchants ou só transações.
É o pacote completo operacional da jurisdição.

🧱 BANCO LOCAL SQLITE (FONTE DE VERDADE)

Todas as funcionalidades devem trabalhar APENAS com SQLite local:

Consultas → SQLite

Listagens → SQLite

Relatórios locais → SQLite

Merchant info → SQLite

Market info → SQLite

POS info → SQLite

User data → SQLite

Configurações → SQLite

Pagamentos → SQLite primeiro

Logs → SQLite

Nada no POS deve depender do backend para funcionar.

🏦 BACKEND

Backend agora é:

espelho

sincronizador

storage remoto

não é dependência operacional

POS continua totalmente funcional sem ele.

🔄 SINCRONIZAÇÃO (OBRIGATÓRIA)
Regras fundamentais:

Tudo entra primeiro no SQLite

Depois segue para backend quando rede existir

Sem duplicidade

Sem pendentes duplicados

Sincronização incremental

Somente sincroniza o que mudou

Backend valida UUID e evita duplicações

Tipos de sincronização:

1️⃣ Boot sync (primeiro login)
2️⃣ Background sync (quando rede volta)
3️⃣ Forced sync (manual)
4️⃣ Partial sync (por entidade)

💳 PAGAMENTOS — CORREÇÃO DA ARQUITETURA
❗ ERRO ATUAL:

Pagamento bate backend antes de SQLite

Dupla transação

Pendente duplicado

Offline não funciona

✅ NOVO FLUXO CORRETO (OBRIGATÓRIO)

1️⃣ Ao realizar pagamento:

criar registro em SQLite

status = SUCCESS | FAILED (não existe conceito pendente fantasma)

gerar UUID

registrar financeiro local

atualizar saldos locais

recibo local garantido

2️⃣ Depois:

sincroniza com backend quando rede existir

3️⃣ Sem rede:

apenas CASH permitido

M-Pesa offline → proibido

sistema avisa claramente

4️⃣ Nenhuma transação pode existir 2x

🧨 ERROS ATUAIS QUE DEVEM SER CORRIGIDOS
❌ Hoje:

tudo chama backend direto

nada usa SQLite como fonte primária

pagamentos duplicam

quando cai banco remoto tudo morre

merchants não carregam local

consultas não funcionam offline

sync system falha

payment_service errado

merchant_service errado

sync_service incompleto

✔️ Obrigatório corrigir:

@payment_screen.dart

@merchant_service.dart

@sync_service.dart

qualquer arquivo que dependa de backend direto

🧾 FUNÇÕES QUE AGORA DEVEM USAR APENAS SQLITE

listar mercados

listar comerciantes

buscar comerciante

listar transações

ver saldo

fazer pagamento

confirmar operações

mostrar informações do POS

validar dados locais

Nenhuma consulta remota para operar.

🧠 INTELIGÊNCIA DE SYNC

sincroniza apenas diferenças

detecta conflitos

resolve duplicidade

reconcilia saldos

marca itens já sincronizados

reprocessa falhas automáticas

🧑‍💻 UX NECESSÁRIA

Mostrar estado ao agente:

🔄 "Sincronizando dados da jurisdição…"

📥 "Carregando dados locais…"

🟢 "Modo Online"

🟡 "Modo Offline — operando normalmente"

📤 "A enviar dados para servidor"

❗ "Operação disponível apenas em modo online" (ex: M-Pesa)

🔐 SEGURANÇA

Dados SQLite protegidos

Não limpar dados indevidamente

Ao trocar usuário:

limpar dados sensíveis

baixar pacote da nova jurisdição

🚀 RESULTADO ESPERADO

Após implementação:

✔ POS trabalha 100% offline
✔ SQLite é banco PRIMÁRIO
✔ Backend recebe dados depois
✔ Zero duplicações
✔ Sem pendente duplicado
✔ Pagamentos corretos
✔ Consultas funcionam offline
✔ Operador nunca para trabalho
✔ Sistema robusto de verdade
✔ Arquitetura padrão fintech/governamental

📌 ESTE É UM REQUISITO CRÍTICO DE NEGÓCIO