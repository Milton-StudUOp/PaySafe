🛡️ MASTER PROMPT — SISTEMA DE AUDITORIA DE CLASSE MUNDIAL
🎯 OBJETIVO GERAL

Desenvolver um Sistema de Auditoria Centralizado, Imutável, Detalhista e Investigativo, capaz de:

Monitorar TODAS as ações do sistema

Registrar operações legítimas e ilegítimas

Detectar fraudes, tentativas de invasão e abusos

Fornecer rastreabilidade completa (quem, quando, onde, como, por quê)

Atender padrões bancários, governamentais e OWASP

Suportar investigações forenses

Ter UX clara, filtros avançados e exportações oficiais

🧱 1️⃣ PRINCÍPIOS FUNDAMENTAIS (OBRIGATÓRIOS)

Nada acontece no sistema sem gerar auditoria

Logs são imutáveis (append-only)

Frontend NUNCA grava auditoria diretamente

Auditoria é feita no backend

Auditoria não pode ser desligada

Admin NÃO pode apagar auditoria

Auditoria sobrevive a falhas e ataques

🧱 2️⃣ TABELA CENTRAL DE AUDITORIA (IMUTÁVEL)

Criar tabela audit_logs com nível forense:

CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Quem
    actor_type ENUM(
        'ADMIN',
        'FUNCIONARIO',
        'SUPERVISOR',
        'AUDITOR',
        'AGENT',
        'MERCHANT',
        'SYSTEM',
        'UNKNOWN'
    ) NOT NULL,

    actor_id BIGINT NULL,
    actor_name VARCHAR(200) NULL,
    actor_role VARCHAR(50) NULL,

    -- Onde (jurisdição)
    actor_province VARCHAR(100) NULL,
    actor_district VARCHAR(100) NULL,

    -- O quê
    action VARCHAR(100) NOT NULL,   -- CREATE, UPDATE, DELETE, LOGIN, BLOCK, etc
    entity VARCHAR(100) NOT NULL,   -- AGENT, POS, MERCHANT, TRANSACTION, USER...
    entity_id BIGINT NULL,

    -- Detalhes
    description TEXT NOT NULL,

    -- Antes e depois (forense)
    before_data JSON NULL,
    after_data JSON NULL,

    -- Origem técnica
    ip_address VARCHAR(50) NOT NULL,
    user_agent TEXT NULL,
    request_method VARCHAR(10) NULL,
    request_path TEXT NULL,

    -- Classificação
    severity ENUM('INFO','LOW','MEDIUM','HIGH','CRITICAL') DEFAULT 'INFO',
    event_type ENUM(
        'NORMAL',
        'SECURITY',
        'FRAUD',
        'ACCESS_VIOLATION',
        'SYSTEM_ERROR'
    ) DEFAULT 'NORMAL',

    -- Correlação
    correlation_id CHAR(36) NULL, -- ligar vários eventos da mesma ação
    session_id VARCHAR(100) NULL,

    -- Tempo
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_actor (actor_type, actor_id),
    INDEX idx_entity (entity, entity_id),
    INDEX idx_action (action),
    INDEX idx_severity (severity),
    INDEX idx_event_type (event_type),
    INDEX idx_created_at (created_at)
);

🧱 3️⃣ EVENTOS QUE DEVEM SER AUDITADOS (LISTA OBRIGATÓRIA)
🔐 Autenticação & Sessão

LOGIN_SUCCESS

LOGIN_FAILED

LOGOUT

SESSION_EXPIRED

PASSWORD_RESET

PIN_RESET

MULTIPLE_FAILED_LOGINS

🔒 Segurança & Invasão

UNAUTHORIZED_ACCESS_ATTEMPT

ID_ENUMERATION_ATTEMPT

ACCESS_OUTSIDE_JURISDICTION

API_KEY_INVALID

TOKEN_INVALID

TOKEN_EXPIRED

SUSPICIOUS_BEHAVIOR_DETECTED

🏛️ Administração

CREATE_USER

UPDATE_USER

SUSPEND_USER

CHANGE_ROLE

FORCE_LOGOUT

📍 Jurisdição

REQUEST_JURISDICTION_CHANGE

APPROVE_JURISDICTION_CHANGE

REJECT_JURISDICTION_CHANGE

EDIT_BLOCKED_PENDING_APPROVAL

🧾 Operações de Negócio

CREATE_AGENT

UPDATE_AGENT

CREATE_POS

BLOCK_POS

ROTATE_API_KEY

CREATE_MERCHANT

UPDATE_MERCHANT

CREATE_MARKET

UPDATE_MARKET

💰 Financeiro

TRANSACTION_CREATED

TRANSACTION_FAILED

TRANSACTION_CANCELLED

RECEIPT_PRINTED

RECEIPT_REPRINTED

🤖 Sistema

SYSTEM_JOB_RUN

DATA_SYNC

OFFLINE_SYNC

SYSTEM_ERROR

DATABASE_ERROR

🧱 4️⃣ REGRAS DE GRAVAÇÃO (BACKEND)
TODA ação deve registrar:

Quem executou

O que tentou fazer

O que conseguiu ou não

Dados antes e depois

IP

Rota

Jurisdição

Severidade automática

Exemplo (FastAPI):
audit_log(
    actor=user,
    action="UPDATE_AGENT",
    entity="AGENT",
    entity_id=agent_id,
    before_data=old_data,
    after_data=new_data,
    severity="MEDIUM",
    event_type="NORMAL"
)

Tentativa ilegal:
audit_log(
    actor=user,
    action="UNAUTHORIZED_ACCESS_ATTEMPT",
    entity="AGENT",
    entity_id=agent_id,
    severity="HIGH",
    event_type="SECURITY"
)

🧱 5️⃣ DETECÇÃO AUTOMÁTICA DE FRAUDE (REGRAS)

Implementar regras automáticas que geram eventos CRITICAL:

Muitas reimpressões em curto tempo

Muitas falhas de login

Tentativas repetidas de acesso fora da jurisdição

POS ativo sem transações por longo período

Agente com cancelamentos excessivos

Tentativas de enumeração de ID sequencial

Cada regra:

Gera audit_log

Gera alerta visível no dashboard

Pode bloquear automaticamente (opcional)

🧱 6️⃣ PÁGINA WEB — LOGS DE AUDITORIA (UX PROFISSIONAL)
Rota

/audit-logs

Filtros avançados (todos funcionais):

Período (data/hora)

Actor type

Actor role

Entidade

Ação

Severidade

Tipo de evento

Província

Distrito

IP

Texto livre (description)

Apenas eventos CRÍTICOS

Tabela:

Data/Hora

Quem

Ação

Entidade

Severidade

IP

Evento

Ação: Ver detalhe

🧱 7️⃣ DETALHE DO LOG (FORENSE)

Ao abrir um log:

Quem (nome, role, jurisdição)

IP + User-Agent

Ação completa

Entidade afetada

BEFORE vs AFTER (JSON diff visual)

Linha do tempo de eventos correlacionados

Classificação de risco

Observações automáticas do sistema

🧱 8️⃣ EXPORTAÇÃO & COMPLIANCE

Permitir exportar:

CSV (dados crus)

PDF oficial (com cabeçalho, data, assinatura)

Exportação respeita filtros aplicados.

🧱 9️⃣ PERMISSÕES DE AUDITORIA
Role Ver logs Ver detalhes Exportar
ADMIN ✔ ✔ ✔
AUDITOR ✔ ✔ ✔
SUPERVISOR ❌ ❌ ❌
FUNCIONARIO ❌ ❌ ❌
AGENT ❌ ❌ ❌
MERCHANT ❌ ❌ ❌
🧱 🔟 REGRAS DE SEGURANÇA DA AUDITORIA

Logs não podem ser editados

Logs não podem ser apagados

Logs não podem ser ocultados

Logs não dependem do frontend

Logs registram até falhas

Logs registram tentativas ilegais

🎯 RESULTADO ESPERADO

Após implementação:

✔ Sistema auditável ponta-a-ponta
✔ Investigação forense possível
✔ Detecção precoce de fraude
✔ Compliance governamental
✔ Histórico imutável
✔ Segurança de classe mundial
✔ Transparência total
✔ Confiança institucional


ao tentar Alterar PIN diz Erro ao identificar o agente. Faça login novamente sendo que as credenciais estão certas e ele logado