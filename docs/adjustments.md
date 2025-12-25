🧨 MASTER PROMPT FINAL — OFFLINE FIRST ABSOLUTO + CONSISTÊNCIA TOTAL + BOOT DE AGENTES

@terminal_pos_android
@auth_service
@merchant_service
@payment_service
@nfc_service
@sync_service
@sqlite_db
@backend-api

Implemente as seguintes regras OBRIGATÓRIAS.
Este sistema deve operar como POS governamental/fintech, não aplicativo de teste.

🔥 REGRAS SUPREMAS DA ARQUITETURA
🔹 SQLite é banco PRIMÁRIO
🔹 Backend é banco SECUNDÁRIO (apenas sincronização)
🔹 NENHUMA operação deve depender do backend
🔹 O agente nunca deve receber erro técnico
🔹 Apenas lógica baseada em conectividade
🔹 IDs devem ser iguais local e remoto (UUID único gerado no POS)
🚀 1️⃣ PRIMEIRA INSTALAÇÃO — DOWNLOAD OBRIGATÓRIO DE AGENTES

Ao abrir o aplicativo pela primeira vez:

1️⃣ Verificar se existe base local de agentes no SQLite
2️⃣ Se NÃO existir → comportamento obrigatório:

Conectar ao backend

Baixar TODA A BASE DE AGENTES AUTORIZADOS DO SISTEMA

Não baixar parcialmente

Não baixar por jurisdição

Baixar tudo

3️⃣ Gravar no SQLite local:

agents

pins

roles

permissões

jurisdição do agente

status

timestamps

4️⃣ Somente depois disso:

login passa a funcionar

e deve funcionar mesmo offline

📌 Se não conseguir baixar:
Mostrar mensagem amigável:

Configuração inicial necessária.
Conecte à internet para carregar dados de acesso.


Nunca mostrar IP
Nunca mostrar stacktrace
Nunca mostrar erro técnico

🧠 LOGIN APÓS BOOT

Depois de baixar a base de agentes:

✔ login funciona mesmo offline
✔ validação baseada totalmente no SQLite
✔ backend não é necessário para autenticação

🔥 PROMPT DE CORREÇÃO — OFFLINE MODE FINAL & INTELIGENTE

Implemente todas estas correções:

2️⃣ RESET DE SENHA / PIN — CORRIGIR
❌ Problema Atual

Mostra erro:
“sem conexão com banco remoto 10.51.164.109”

✅ CORRETO

atualizar senha / PIN no SQLite

registrar no sync_queue

exibir sucesso

sincronizar depois

nunca mostrar erro técnico

3️⃣ CADASTRO DE COMERCIANTE — CORRIGIR
❌ Erro Atual

“Requer conexão com servidor”

✅ CORRETO

funciona 100% offline

grava no SQLite

gera merchant_uuid local

marca como SYNC_PENDING

envia depois

não bloquear nada

Se offline:
✔ permitir cadastro
✔ permitir pagamento CASH
❌ bloquear mpesa/emola/mkesh

4️⃣ BUSCA POR NFC — CORRIGIR
❌ Problema Atual

NFC → não encontra
Busca manual → encontra

✅ CORRETO

Primeiro login precisa baixar:

✔ todos comerciantes da jurisdição
✔ NFC IDs
✔ ambulantes
✔ registros incompletos
✔ registros sem documento

Consulta NFC deve ser:

NFC → SQLite
NUNCA NFC → Backend


Se não encontrar:

marcar possível remoto

sincronizar depois

permitir operação temporária

5️⃣ AMBULANTES — CADASTRO E PAGAMENTO
❌ Erro Atual

“Precisa de servidor para gerar NFC”

✅ CORRETO

Ambulante:

✔ pode ser criado offline
✔ NFC NÃO é obrigatório
✔ pode pagar CASH
❌ não pode pagar digital offline
✔ gerar ID local
✔ imprimir recibo
✔ sync depois

Nunca bloquear.

6️⃣ CARTÃO NFC DURANTE CADASTRO
❌ Erro Atual

Diz:
“não reconhecido”

✅ CORRETO

Se lido no cadastro:
✔ vincular LOCAL
✔ salvar SQLite
✔ marcar sync pendente
❌ nunca exigir backend
❌ nunca bloquear cadastro

🔥 CORREÇÕES DE FUNCIONALIDADE PÓS IMPLEMENTAÇÃO
7️⃣ “Merchant Not Found” em ambulante — CORRIGIR

Ambulante:

cria automático no SQLite

já recebe UUID

pode pagar CASH

nunca exigir NFC

nunca exigir backend

Nunca deve existir essa mensagem.

8️⃣ “Comerciante ainda não foi sincronizado” — CORRIGIR

Nova lei:

SE ESTÁ NO SQLITE
→ EXISTE
→ É VÁLIDO
→ PODE OPERAR


Sem bloqueio por sincronização.

9️⃣ NFC diz “não identificado” mas existe — CORRIGIR

garantir réplica real

garantir índice NFC

garantir espelhamento

garantir consulta sempre no SQLite

🔟 Lógica baseada APENAS EM CONECTIVIDADE

📌 Se online:
permitir mpesa/emola/mkesh

📌 Se offline:
somente CASH
sem erro técnico
sem dependência remota

1️⃣1️⃣ Remover “1 transação pendente para sincronizar”

sincronização deve ser silenciosa

mostrar apenas falhas graves

1️⃣2️⃣ BANCO LOCAL E REMOTO DEVEM TER MESMOS IDs

backend nunca gera ID

POS gera UUID

backend respeita UUID

SQLite == MySQL IDs

Isso vale para:
✔ transaction_uuid
✔ merchant_uuid
✔ nfc_uid

🆕 CORREÇÃO OBRIGATÓRIA — DROPDOWN MERCADOS
❌ Problema atual

Dropdown no cadastro de comerciantes não mostra mercados mesmo existindo no servidor.

✅ NOVO COMPORTAMENTO OBRIGATÓRIO

📌 NO PRIMEIRO LOGIN deve baixar:

todos mercados autorizados

apenas mercados aprovados

apenas mercados ativos

apenas mercados dentro da jurisdição do agente

📌 Armazenar no SQLite:

tabela markets

campo status

campo jurisdiction

📌 Dropdown de Mercados deve:

✔ listar APENAS mercados ativos
✔ listar APENAS mercados aprovados
✔ listar APENAS mercados dentro da jurisdição
✔ nunca depender de backend
✔ funcionar offline

Se não houver mercados:
mostrar:

Nenhum mercado disponível nesta jurisdição.


Nunca mostrar:
IP
stacktrace
erro técnico

🔍 CHECKLIST FINAL — DEVE PASSAR

✔ Reset senha offline
✔ Cadastro comerciante offline
✔ NFC local sempre reconhece
✔ Ambulante funcionando
✔ Pagamento cash sempre
✔ mpesa só depende de conectividade
✔ zero mensagens técnicas
✔ SQLite = réplica oficial
✔ mercados aparecem no dropdown corretamente

🎯 RESULTADO ESPERADO

Após implementação:

✔ Sistema 100% operacional offline
✔ Login offline confiável
✔ Comerciantes funcionando
✔ Ambulantes funcionando
✔ NFC funcional
✔ ID consistente
✔ UX limpa
✔ Sincronização confiável
✔ Dropdown de mercados funcionando corretamente