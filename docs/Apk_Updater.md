🚀 MASTER PROMPT — ATUALIZAÇÃO REMOTA CONTROLADA DE APK (POS ANDROID)

@terminal_pos_android
@backend-api
@audit_service

Implemente um sistema profissional de atualização remota de APK, totalmente controlado pelo backend, adequado para POS Android corporativos, sem dependência de Google Play Store.

🎯 OBJETIVO

Garantir que todos os dispositivos POS instalados:

saibam quando existe nova versão do aplicativo

consigam baixar o APK de forma segura

instalem a atualização automaticamente

sejam bloqueados quando a versão for considerada insegura

registrem auditoria completa do processo

🧱 PRINCÍPIOS OBRIGATÓRIOS

O backend decide a versão válida

O POS apenas obedece

Nenhuma atualização manual

Nenhuma dependência da Play Store

Nenhum downgrade permitido

Atualização auditável

UX clara e profissional

🧠 ARQUITETURA GERAL
┌───────────────────────┐
│ POS Android           │
│ App Atual             │
└───────────┬───────────┘
            │  GET /app/version
            ▼
┌────────────────────────────────┐
│ Backend API                     │
│ • Versão atual                 │
│ • Versão mínima permitida      │
│ • URL do APK                   │
│ • Hash de integridade          │
└───────────┬────────────────────┘
            │  HTTPS download
            ▼
┌────────────────────────────────┐
│ Storage Seguro (APK)            │
│ S3 / Nginx / Cloud Storage     │
└────────────────────────────────┘

🧩 COMPONENTE 1 — CONTROLE DE VERSÃO NO BACKEND
📌 Endpoint obrigatório
GET /app/version

📤 Resposta obrigatória
{
  "latest_version": "2.4.0",
  "min_required_version": "2.3.0",
  "apk_url": "https://server/apk/pos_2.4.0.apk",
  "sha256": "e3b0c44298fc1c149afbf4c8996fb924",
  "force_update": true,
  "release_notes": "Correções críticas de NFC e modo offline"
}

📌 Regras

latest_version: versão mais recente disponível

min_required_version: versão mínima que pode operar

force_update: se true, bloqueia uso do app

sha256: usado para verificar integridade

apk_url: somente HTTPS

🧩 COMPONENTE 2 — VERIFICAÇÃO DE VERSÃO NO POS
📌 Quando verificar

O POS deve verificar versão:

ao abrir o app

após login

ao voltar de background

quando recuperar conectividade

pelo menos 1x por dia

🧩 COMPONENTE 3 — LÓGICA DE DECISÃO NO POS
🔴 Caso 1 — Atualização obrigatória

Se:

current_version < min_required_version


👉 Comportamento:

bloquear uso do sistema

exibir mensagem:

Atualização obrigatória necessária para continuar.


iniciar download automaticamente

impedir cancelamento

🟡 Caso 2 — Atualização recomendada

Se:

current_version < latest_version


👉 Comportamento:

mostrar aviso

permitir adiar

permitir continuar operação

sugerir atualização

🟢 Caso 3 — App atualizado

Nenhuma ação necessária.

🧩 COMPONENTE 4 — DOWNLOAD SEGURO DO APK
📌 Regras obrigatórias

download apenas via HTTPS

salvar em diretório privado do app

validar sha256

rejeitar APK com hash inválido

apagar APK após instalação

🧩 COMPONENTE 5 — INSTALAÇÃO DO APK
📌 Requisitos técnicos

manter mesmo applicationId

APK deve estar assinado corretamente

usar:

PackageInstaller

ou REQUEST_INSTALL_PACKAGES

📌 Fluxo

baixar APK

validar hash

solicitar permissão (se necessário)

instalar sobre versão atual

reiniciar app

🧩 COMPONENTE 6 — UX PROFISSIONAL
📌 Mensagens permitidas
Nova versão disponível.
Atualização em andamento...
Atualização concluída com sucesso.

❌ Mensagens proibidas

erro técnico

IP

stack trace

termos de sistema

“download falhou, tente manualmente”

🧩 COMPONENTE 7 — AUDITORIA OBRIGATÓRIA

Registrar no backend:

POS ID

versão antiga

versão nova

data/hora

sucesso ou falha

motivo da falha

IP do dispositivo

Exemplo de evento:

APP_UPDATE_SUCCESS
APP_UPDATE_FAILED

🧩 COMPONENTE 8 — SEGURANÇA

impedir downgrade

impedir APK não assinado

validar hash

não permitir atualização fora do backend oficial

bloquear versões inseguras

🧩 COMPONENTE 9 — COMPATIBILIDADE COM POS CORPORATIVO

Se o dispositivo suportar:

silent install

MDM

OTA corporativo

👉 usar atualização sem interação do agente.

Caso contrário:

solicitar permissão padrão Android

🔍 CHECKLIST DE VALIDAÇÃO

✔ POS detecta nova versão
✔ POS baixa APK corretamente
✔ POS valida hash
✔ POS instala atualização
✔ POS bloqueia versão antiga se exigido
✔ POS registra auditoria
✔ POS não depende da Play Store

🎯 RESULTADO FINAL ESPERADO

Após implementação:

✔ Atualizações remotas controladas
✔ Nenhuma intervenção manual
✔ Sistema sempre atualizado
✔ Risco reduzido
✔ Padrão bancário / governamental
✔ Arquitetura profissional