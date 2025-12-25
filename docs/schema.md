# 📊 Schema do Sistema POS de Cobrança (Moçambique)

> **Versão:** 1.0  
> **Última atualização:** 10 de Dezembro de 2025  
> **Motor de BD:** MySQL 8+ / MariaDB 10+

---

## 📋 Índice

1. [Visão Geral](#-visão-geral)
2. [Diagrama de Relacionamentos](#-diagrama-de-relacionamentos)
3. [Definição das Tabelas](#-definição-das-tabelas)
   - [markets](#1-markets-mercados--localizações)
   - [merchants](#2-merchants-comerciantes--vendedores)
   - [agents](#3-agents-agentes--cobradores)
   - [pos_devices](#4-pos_devices-dispositivos-pos)
   - [transactions](#5-transactions-transações-financeiras)
   - [receipts](#6-receipts-recibos-rastreáveis)
   - [balances](#7-balances-saldos-por-comerciante)
   - [users](#8-users-usuários-web)
   - [audit_logs](#9-audit_logs-auditoria)
4. [Notas de Implementação](#-notas-de-implementação)
5. [Queries Úteis](#-queries-úteis)

---

## 🧱 Visão Geral

O sistema é composto por **9 entidades principais**:

| Tabela | Descrição | Relacionamentos |
|--------|-----------|-----------------|
| `markets` | Mercados / Localizações físicas | — |
| `merchants` | Comerciantes (fixos e ambulantes) | → markets |
| `agents` | Agentes / Cobradores com PIN POS | → markets |
| `pos_devices` | Dispositivos POS portáteis | → agents |
| `transactions` | Transações financeiras | → merchants, agents, pos_devices |
| `receipts` | Recibos impressos rastreáveis | → transactions, merchants, agents, pos_devices, markets |
| `balances` | Saldos acumulados por comerciante | → merchants |
| `users` | Usuários web (admins, auditores) | — |
| `audit_logs` | Log de auditoria imutável | — |

---

## 🔗 Diagrama de Relacionamentos

```
┌─────────────┐
│   markets   │
└──────┬──────┘
       │
       ├──────────────────────┬─────────────────────┐
       │                      │                     │
       ▼                      ▼                     │
┌─────────────┐        ┌─────────────┐              │
│  merchants  │        │   agents    │              │
└──────┬──────┘        └──────┬──────┘              │
       │                      │                     │
       │               ┌──────▼──────┐              │
       │               │ pos_devices │              │
       │               └──────┬──────┘              │
       │                      │                     │
       └──────────┬───────────┘                     │
                  │                                 │
           ┌──────▼──────┐                          │
           │transactions │                          │
           └──────┬──────┘                          │
                  │                                 │
           ┌──────▼──────┐                          │
           │  receipts   │◄─────────────────────────┘
           └─────────────┘

┌─────────────┐        ┌─────────────┐        ┌─────────────┐
│  balances   │        │    users    │        │ audit_logs  │
│ (merchants) │        │   (web)     │        │ (imutável)  │
└─────────────┘        └─────────────┘        └─────────────┘
```

---

## 📝 Definição das Tabelas

### Configuração Inicial

```sql
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
```

---

### 1. `markets` (Mercados / Localizações)

Representa os mercados ou localizações físicas onde os comerciantes operam.

```sql
CREATE TABLE markets (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    province VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    neighborhood VARCHAR(100),
    status ENUM('ATIVO','INATIVO') DEFAULT 'ATIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | BIGINT | Identificador único |
| `name` | VARCHAR(150) | Nome do mercado |
| `province` | VARCHAR(100) | Província (obrigatório) |
| `district` | VARCHAR(100) | Distrito |
| `neighborhood` | VARCHAR(100) | Bairro |
| `status` | ENUM | ATIVO ou INATIVO |
| `created_at` | TIMESTAMP | Data de criação |

---

### 2. `merchants` (Comerciantes / Vendedores)

Suporta dois tipos: **FIXO** (dados completos) e **AMBULANTE** (dados parciais).

```sql
CREATE TABLE merchants (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Tipo de vendedor
    merchant_type ENUM('FIXO','AMBULANTE') NOT NULL DEFAULT 'FIXO',

    -- Dados pessoais (fixos completos; ambulantes podem ser parciais)
    full_name VARCHAR(200) NOT NULL,
    id_document_type ENUM('BI','PASSAPORTE','DIRE','OUTRO') NULL,
    id_document_number VARCHAR(50) NULL,
    id_document_expiry DATE NULL,

    -- Contactos (podem ser NULL para ambulante)
    phone_number VARCHAR(20) NULL,
    mobile_operator ENUM('VODACOM','TMCEL','MOVITEL') NULL,

    -- Negócio
    business_type VARCHAR(100) NOT NULL,
    market_id BIGINT NOT NULL,

    -- Pagamentos móveis
    mpesa_number VARCHAR(20),
    emola_number VARCHAR(20),
    mkesh_number VARCHAR(20),

    -- Acesso ao portal do comerciante
    password_hash VARCHAR(255) NULL,
    last_login_at TIMESTAMP NULL,

    -- NFC (fixos normalmente terão; ambulantes podem não ter)
    nfc_uid VARCHAR(100) UNIQUE NULL,

    -- Estado
    status ENUM('ATIVO','SUSPENSO','BLOQUEADO') DEFAULT 'ATIVO',

    -- Datas
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_merchant_market
        FOREIGN KEY (market_id) REFERENCES markets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Obrigatório | Notas |
|-------|------|:-----------:|-------|
| `merchant_type` | ENUM | ✅ | FIXO ou AMBULANTE |
| `full_name` | VARCHAR(200) | ✅ | Nome completo ou apelido |
| `id_document_*` | — | ❌ | Opcional para ambulantes |
| `phone_number` | VARCHAR(20) | ❌ | Opcional para ambulantes |
| `business_type` | VARCHAR(100) | ✅ | Tipo de negócio |
| `market_id` | BIGINT | ✅ | FK para markets |
| `mpesa/emola/mkesh` | VARCHAR(20) | ❌ | Números de pagamento móvel |
| `password_hash` | VARCHAR(255) | ❌ | Para acesso ao portal |
| `nfc_uid` | VARCHAR(100) | ❌ | UID do cartão NFC (único) |
| `status` | ENUM | — | ATIVO, SUSPENSO, BLOQUEADO |

---

### 3. `agents` (Agentes / Cobradores)

Cobradores de campo com PIN para autenticação no POS.

```sql
CREATE TABLE agents (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    agent_code VARCHAR(50) UNIQUE NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,

    -- PIN de acesso ao sistema POS (hash, nunca em texto claro)
    pin_hash VARCHAR(255) NOT NULL,
    last_login_at TIMESTAMP NULL,

    assigned_market_id BIGINT,
    assigned_region VARCHAR(100),

    status ENUM('ATIVO','SUSPENSO','INATIVO') DEFAULT 'ATIVO',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_agent_market
        FOREIGN KEY (assigned_market_id) REFERENCES markets(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `agent_code` | VARCHAR(50) | Código único do agente |
| `full_name` | VARCHAR(200) | Nome completo |
| `phone_number` | VARCHAR(20) | Telefone do agente |
| `pin_hash` | VARCHAR(255) | Hash do PIN (bcrypt) |
| `assigned_market_id` | BIGINT | Mercado atribuído |
| `assigned_region` | VARCHAR(100) | Região/zona de cobrança |

---

### 4. `pos_devices` (Dispositivos POS)

Dispositivos POS portáteis atribuídos a agentes.

```sql
CREATE TABLE pos_devices (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    serial_number VARCHAR(100) UNIQUE NOT NULL,
    model VARCHAR(100),
    assigned_agent_id BIGINT,

    -- Token do dispositivo (hash, para autenticar POS na API)
    api_key_hash VARCHAR(255) NOT NULL,
    status ENUM('ATIVO','INATIVO','BLOQUEADO') DEFAULT 'ATIVO',

    last_seen TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_pos_agent
        FOREIGN KEY (assigned_agent_id) REFERENCES agents(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `serial_number` | VARCHAR(100) | Número de série único |
| `model` | VARCHAR(100) | Modelo do dispositivo (ex: H10P) |
| `assigned_agent_id` | BIGINT | Agente atribuído |
| `api_key_hash` | VARCHAR(255) | Hash da chave API |
| `last_seen` | TIMESTAMP | Última comunicação com servidor |

---

### 5. `transactions` (Transações Financeiras)

Todas as transações de cobrança realizadas.

```sql
CREATE TABLE transactions (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    transaction_uuid CHAR(36) NOT NULL UNIQUE,

    merchant_id BIGINT NOT NULL,
    agent_id BIGINT NOT NULL,
    pos_id BIGINT NOT NULL,

    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'MZN',

    payment_method ENUM('DINHEIRO','MPESA','EMOLA','MKESH') NOT NULL,
    payment_reference VARCHAR(100),

    nfc_uid VARCHAR(100),

    status ENUM('SUCESSO','FALHOU','CANCELADO') NOT NULL,

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_tx_merchant FOREIGN KEY (merchant_id) REFERENCES merchants(id),
    CONSTRAINT fk_tx_agent    FOREIGN KEY (agent_id)    REFERENCES agents(id),
    CONSTRAINT fk_tx_pos      FOREIGN KEY (pos_id)      REFERENCES pos_devices(id),

    INDEX idx_tx_created_at (created_at),
    INDEX idx_tx_merchant_date (merchant_id, created_at),
    INDEX idx_tx_pos_date (pos_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `transaction_uuid` | CHAR(36) | UUID único da transação |
| `amount` | DECIMAL(12,2) | Valor cobrado |
| `currency` | CHAR(3) | Moeda (padrão: MZN) |
| `payment_method` | ENUM | DINHEIRO, MPESA, EMOLA, MKESH |
| `payment_reference` | VARCHAR(100) | Referência do pagamento móvel |
| `nfc_uid` | VARCHAR(100) | UID NFC usado na transação |
| `status` | ENUM | SUCESSO, FALHOU, CANCELADO |

**Índices otimizados para:**
- Busca por data
- Histórico por comerciante
- Relatórios por POS

---

### 6. `receipts` (Recibos Rastreáveis)

Recibos impressos com código único rastreável.

```sql
CREATE TABLE receipts (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Código rastreável que vai impresso no recibo (ex: MKT12-2025-02-000123)
    receipt_code VARCHAR(50) NOT NULL UNIQUE,

    transaction_id BIGINT NOT NULL,

    -- Snapshot de contexto da emissão
    merchant_id BIGINT,
    agent_id BIGINT,
    pos_id BIGINT,
    market_id BIGINT,

    amount DECIMAL(12,2) NOT NULL,
    currency CHAR(3) DEFAULT 'MZN',

    issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    reprint_count INT DEFAULT 0,
    last_printed_at TIMESTAMP NULL,

    extra_data JSON NULL,

    CONSTRAINT fk_receipt_tx
        FOREIGN KEY (transaction_id) REFERENCES transactions(id),

    CONSTRAINT fk_receipt_merchant
        FOREIGN KEY (merchant_id) REFERENCES merchants(id),

    CONSTRAINT fk_receipt_agent
        FOREIGN KEY (agent_id) REFERENCES agents(id),

    CONSTRAINT fk_receipt_pos
        FOREIGN KEY (pos_id) REFERENCES pos_devices(id),

    CONSTRAINT fk_receipt_market
        FOREIGN KEY (market_id) REFERENCES markets(id),

    INDEX idx_receipt_code (receipt_code),
    INDEX idx_receipt_issued_at (issued_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `receipt_code` | VARCHAR(50) | Código impresso no papel (ex: `MKT12-2025-02-000123`) |
| `reprint_count` | INT | Quantas vezes foi reimpresso |
| `last_printed_at` | TIMESTAMP | Última impressão |
| `extra_data` | JSON | Dados extras para auditoria |

---

### 7. `balances` (Saldos por Comerciante)

Saldo acumulado de cada comerciante.

```sql
CREATE TABLE balances (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    merchant_id BIGINT NOT NULL,
    current_balance DECIMAL(14,2) DEFAULT 0.00,
    last_transaction_at TIMESTAMP,

    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_balance_merchant
        FOREIGN KEY (merchant_id) REFERENCES merchants(id),

    UNIQUE KEY uk_balance_merchant (merchant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

### 8. `users` (Usuários Web)

Usuários do painel web: administradores, auditores, supervisores.

```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    full_name VARCHAR(200) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    phone_number VARCHAR(20),

    password_hash VARCHAR(255) NOT NULL,

    role ENUM('ADMIN','AUDITOR','FUNCIONARIO','SUPERVISOR') NOT NULL,

    status ENUM('ATIVO','SUSPENSO','INATIVO') DEFAULT 'ATIVO',

    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Role | Permissões |
|------|------------|
| `ADMIN` | Acesso total ao sistema |
| `SUPERVISOR` | Gestão de agentes e mercados |
| `AUDITOR` | Apenas visualização e relatórios |
| `FUNCIONARIO` | Operações básicas |

---

### 9. `audit_logs` (Auditoria)

Log imutável de todas as ações no sistema.

```sql
CREATE TABLE audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    -- Quem fez a ação:
    --  AGENT  → agents.id
    --  ADMIN  → users.id (qualquer perfil web)
    --  SYSTEM → ações automáticas
    actor_type ENUM('AGENT','ADMIN','SYSTEM') NOT NULL,
    actor_id BIGINT,

    action VARCHAR(100) NOT NULL,
    entity VARCHAR(100) NOT NULL,
    entity_id BIGINT,

    description TEXT,
    ip_address VARCHAR(50),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_audit_entity (entity, entity_id),
    INDEX idx_audit_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `actor_type` | ENUM | AGENT, ADMIN, SYSTEM |
| `actor_id` | BIGINT | ID do agente ou usuário |
| `action` | VARCHAR(100) | Ex: CREATE, UPDATE, DELETE, LOGIN |
| `entity` | VARCHAR(100) | Nome da tabela afetada |
| `entity_id` | BIGINT | ID do registo afetado |
| `ip_address` | VARCHAR(50) | IP de origem |

---

### Finalização

```sql
SET FOREIGN_KEY_CHECKS = 1;
```

---

## 💡 Notas de Implementação

### Comerciantes Ambulantes

Para ambulantes sem documentação completa:

```sql
INSERT INTO merchants (merchant_type, full_name, business_type, market_id)
VALUES ('AMBULANTE', 'João Vendedor', 'Frutas', 1);
```

- `merchant_type = 'AMBULANTE'`
- `id_document_*`, `phone_number`, `nfc_uid` podem ficar `NULL`
- Mantém-se o histórico de cobranças via `full_name` e `id`

### Formato do Código de Recibo

Exemplo: **`MKT12-2025-12-000123`**

| Parte | Significado |
|-------|-------------|
| `MKT12` | Código do mercado |
| `2025-12` | Ano e mês |
| `000123` | Número sequencial |

### Fluxo de Recibos

```
1. Backend gera receipt_code
2. Guarda na tabela receipts
3. Envia para POS → POS imprime o código no papel
4. Auditor digita o código no sistema → vê todos os detalhes
```

---

## 🔍 Queries Úteis

### Comerciantes sem pagamento num período

```sql
SELECT m.id, m.full_name, m.merchant_type, m.business_type
FROM merchants m
LEFT JOIN transactions t ON t.merchant_id = m.id
    AND t.status = 'SUCESSO'
    AND DATE(t.created_at) = '2025-12-10'
WHERE m.status = 'ATIVO'
  AND t.id IS NULL;
```

### POS sem receita num dia

```sql
SELECT p.id, p.serial_number, a.full_name AS agent_name
FROM pos_devices p
LEFT JOIN agents a ON a.id = p.assigned_agent_id
LEFT JOIN transactions t ON t.pos_id = p.id
    AND t.status = 'SUCESSO'
    AND DATE(t.created_at) = '2025-12-10'
WHERE p.status = 'ATIVO'
  AND t.id IS NULL;
```

### Resumo de cobranças por mercado

```sql
SELECT 
    mk.name AS mercado,
    COUNT(t.id) AS total_transacoes,
    SUM(t.amount) AS valor_total,
    COUNT(DISTINCT t.merchant_id) AS comerciantes_atendidos
FROM transactions t
JOIN merchants m ON m.id = t.merchant_id
JOIN markets mk ON mk.id = m.market_id
WHERE t.status = 'SUCESSO'
  AND DATE(t.created_at) = '2025-12-10'
GROUP BY mk.id
ORDER BY valor_total DESC;
```

### Rastrear recibo pelo código

```sql
SELECT 
    r.receipt_code,
    r.amount,
    r.issued_at,
    r.reprint_count,
    m.full_name AS comerciante,
    m.merchant_type,
    a.full_name AS agente,
    mk.name AS mercado,
    p.serial_number AS pos
FROM receipts r
JOIN merchants m ON m.id = r.merchant_id
JOIN agents a ON a.id = r.agent_id
JOIN markets mk ON mk.id = r.market_id
JOIN pos_devices p ON p.id = r.pos_id
WHERE r.receipt_code = 'MKT12-2025-12-000123';
```

---

## 📌 Referência Rápida de ENUMs

| Tabela | Campo | Valores |
|--------|-------|---------|
| `markets` | status | ATIVO, INATIVO |
| `merchants` | merchant_type | FIXO, AMBULANTE |
| `merchants` | id_document_type | BI, PASSAPORTE, DIRE, OUTRO |
| `merchants` | mobile_operator | VODACOM, TMCEL, MOVITEL |
| `merchants` | status | ATIVO, SUSPENSO, BLOQUEADO |
| `agents` | status | ATIVO, SUSPENSO, INATIVO |
| `pos_devices` | status | ATIVO, INATIVO, BLOQUEADO |
| `transactions` | payment_method | DINHEIRO, MPESA, EMOLA, MKESH |
| `transactions` | status | SUCESSO, FALHOU, CANCELADO |
| `users` | role | ADMIN, AUDITOR, FUNCIONARIO, SUPERVISOR |
| `users` | status | ATIVO, SUSPENSO, INATIVO |
| `audit_logs` | actor_type | AGENT, ADMIN, SYSTEM |
