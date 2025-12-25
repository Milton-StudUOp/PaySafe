🧨 PROMPT DE CORREÇÃO FINAL — OFFLINE FIRST REAL & CONSISTÊNCIA TOTAL

@terminal_pos_android
@merchant_service
@payment_service
@nfc_service
@sync_service

Você deve corrigir imediatamente os comportamentos abaixo e ajustar a arquitetura para garantir que o POS funcione como um sistema operacional independente, onde:

👉 SQLite é a réplica oficial do banco remoto
👉 Backend é secundário (apenas sincronização / consolidação)
👉 Nada falha pela ausência do backend
👉 Nenhuma operação deve depender do backend para existir
👉 Não existe bloqueio por “não sincronizado”
👉 ** ID / dados devem ser iguais no servidor e local**

❗ CORRIGIR OS PROBLEMAS REPORTADOS APÓS IMPLEMENTAÇÃO
1️⃣ ERRO: “Merchant Not Found” ao cobrar ambulante
❌ Problema atual

Quando clica Vendedor Ambulante → Cobrar, o fluxo antigo funcionava:

cadastrava ambulante local

processava pagamento

sem exigir NFC

Agora aparece:

merchant not found

✅ CORREÇÃO OBRIGATÓRIA

Ambulante deve ser criado automaticamente no SQLite

Ter UUID local válido

Entrar como SYNC_PENDING

Poder receber pagamento CASH imediatamente

Sem exigir NFC

Sem exigir backend

Sem bloquear transação

✔ Não deve existir mensagem “merchant not found” nunca para ambulante.

2️⃣ ERRO: “Comerciante ainda não foi sincronizado”
❌ Problema atual:

Ao operar com comerciante recém-criado:

comerciante ainda não foi sincronizado


Isso está ERRADO.

✅ NOVA REGRA ABSOLUTA

Se está no SQLite = o sistema deve aceitar como válido.

Não existe dependência de sincronização para operação.
O POS não deve cobrar aprovação do backend para operar.

📌 Deve simplesmente:

operar

registrar

enviar para sync quando internet existir

sem mostrar mensagem ao agente

✔ Remover qualquer lógica que bloqueie operações por falta de sincronização.

3️⃣ NFC diz “Cartão não identificado”, mas na busca encontra
❌ Problema atual:

NFC → não encontra

Busca manual → encontra

Isso significa:

dados não estão espelhados corretamente

SQLite não é réplica real

Lookup de NFC não está indo para SQLite corretamente

✅ CORREÇÃO

Toda leitura NFC deve consultar apenas SQLite

Garantir que TODOS merchants sejam baixados no boot sync

Garantir que NFC esteja incluído nos dados locais

Garantir índice por NFC local

📌 Regra:

Se encontra pelo nome / pesquisa →
Obrigatoriamente deve reconhecer via NFC

4️⃣ ERRO: exigindo backend logicamente onde não deve
❌ Situações reportadas

diz que precisa estar sincronizado

diz que precisa de servidor

bloqueia M-Pesa sem ser por conectividade

lógica baseada em estado remoto

✅ NOVA REGRA:

A lógica do sistema deve ser 100% baseada em conectividade, não em sincronização.

📌 Se online:

permitir M-Pesa / Emola / Mkesh

📌 Se offline:

bloquear apenas pagamentos eletrônicos

aceitar CASH

seguir normal

Sem mensagens técnicas.
Sem erros de backend.
Sem travar operações.

5️⃣ ABA “1 transação pendente para sincronizar” — remover

Isso é UX infantil.

📌 Correção:

remover banners

sincronizar em background

só mostrar erro se falhar gravemente

sistema deve trabalhar silenciosamente

6️⃣ BANCO LOCAL E REMOTO DEVEM TER MESMOS IDs
❌ Problema atual

SQLite gera ID diferente

servidor gera ID diferente

sincronização vira inferno

✅ NOVA ARQUITETURA:

Backend nunca gera IDs

UUID deve ser gerado no POS

Backend deve respeitar o UUID recebido

SQLite e MySQL devem ter mesmo identificador

sem mapeamento duplo

📌 transaction_uuid
📌 merchant_uuid
📌 nfc_uid

Devem ser iguais local e remoto.

🧠 NOVA LÓGICA UNIVERSAL — OBRIGATÓRIA
SE ESTÁ NO SQLITE
→ EXISTE
→ É VÁLIDO
→ PODE OPERAR
→ NÃO PRECISA BACKEND

OFFLINE
→ Permitir tudo normal
→ Apenas bloquear mpesa/mkesh/emola
→ CASH SEMPRE FUNCIONA

SINCRONIZAÇÃO
→ nunca deve bloquear operação
→ nunca deve impedir pagamento
→ nunca deve exigir internet

🔍 NOVOS CRITÉRIOS DE TESTES (DEVEM PASSAR)
✔ Ambulante sem internet

cadastrar

cobrar cash

imprimir

continuar trabalhando

✔ Comerciante novo não sincronizado

deve funcionar normalmente

✔ NFC Local

deve reconhecer sempre

✔ Lógica baseada APENAS EM CONECTIVIDADE

online = aceita digital payments

offline = aceita apenas cash

sem erro técnico

✔ Nenhuma mensagem técnica

Nada de:

servidor 10.51.164.109

cannot connect database

sync required

pending approval

🎯 RESULTADO ESPERADO

Após correção:

✔ Zero “merchant not found”
✔ Zero “não sincronizado”
✔ Zero NFC falhando quando existe
✔ Zero bloqueio injustificado
✔ Operação contínua
✔ SQLite = réplica oficial
✔ Backend = apenas sincronização
✔ UX limpa, estável, segura



Drpdown do cadastro comerciantes não mostra nenhum mercado de varios que tenho cadastrado no servidor
