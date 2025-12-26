# PaySafe Backend API

<div align="center">

![PaySafe](../frontend-next/public/PAYSAFE_Squared.png)

**API RESTful para Sistema de Gestão de Pagamentos em Mercados Municipais**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0+-4479A1?style=flat-square&logo=mysql&logoColor=white)](https://mysql.com)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=flat-square)](LICENSE)

</div>

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Tecnologias](#tecnologias)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Configuração](#configuração)
- [Execução](#execução)
- [Endpoints API](#endpoints-api)
- [Modelos de Dados](#modelos-de-dados)
- [Autenticação](#autenticação)
- [Scripts Utilitários](#scripts-utilitários)
- [Desenvolvimento](#desenvolvimento)

---

## Visão Geral

O **PaySafe Backend API** é uma API RESTful construída com FastAPI que fornece todos os serviços necessários para o sistema de gestão de pagamentos em mercados municipais. A API suporta:

- ✅ Gestão de comerciantes e agentes
- ✅ Processamento de transações (M-Pesa, e-Mola, Cash)
- ✅ Registo e gestão de dispositivos POS
- ✅ Sistema de aprovações e auditoria
- ✅ Relatórios e estatísticas
- ✅ Autenticação JWT com RBAC

---

## Tecnologias

| Tecnologia | Versão | Descrição |
|------------|--------|-----------|
| **FastAPI** | 0.115+ | Framework web async de alto desempenho |
| **Python** | 3.11+ | Linguagem de programação |
| **SQLAlchemy** | 2.0+ | ORM assíncrono |
| **MySQL** | 8.0+ | Base de dados relacional |
| **Alembic** | 1.14+ | Migrações de base de dados |
| **Pydantic** | 2.10+ | Validação de dados |
| **python-jose** | 3.3+ | JWT tokens |
| **Passlib** | 1.7+ | Hash de passwords (Argon2) |
| **Uvicorn** | 0.32+ | Servidor ASGI |
| **Gunicorn** | 21+ | Process manager (produção) |
| **structlog** | 24.4+ | Logging estruturado (JSON) |

---

## Arquitetura

```
backend-api/
├── app/
│   ├── __init__.py
│   ├── main.py              # Entrada principal FastAPI
│   ├── config.py            # Configuração (pydantic-settings)
│   ├── database.py          # Engine e session SQLAlchemy
│   ├── logging_config.py    # Configuração de logs estruturados
│   ├── middleware/
│   │   └── rate_limit.py    # Rate limiting middleware
│   ├── models/              # Modelos SQLAlchemy
│   │   ├── agent.py
│   │   ├── audit_log.py
│   │   ├── balance.py
│   │   ├── jurisdiction_change_request.py
│   │   ├── location.py
│   │   ├── market.py
│   │   ├── merchant.py
│   │   ├── pos_device.py
│   │   ├── receipt.py
│   │   ├── transaction.py
│   │   └── user.py
│   ├── routers/             # Endpoints API
│   │   ├── agents.py
│   │   ├── approvals.py
│   │   ├── audit_logs.py
│   │   ├── auth.py
│   │   ├── locations.py
│   │   ├── markets.py
│   │   ├── merchants.py
│   │   ├── payments.py
│   │   ├── pos_devices.py
│   │   ├── receipts.py
│   │   ├── reports.py
│   │   ├── transactions.py
│   │   └── users.py
│   ├── schemas/             # Schemas Pydantic
│   └── services/            # Lógica de negócio
├── scripts/                 # Scripts utilitários
│   ├── create_admin.py
│   ├── seed_locations.py
│   └── ...
├── alembic/                 # Migrações de BD
├── requirements.txt
├── run_prod_linux.sh
└── run_prod_windows.bat
```

### Diagrama de Camadas

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENTS                               │
│            (Frontend Web, Terminal POS Android)              │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
├─────────────────────────────────────────────────────────────┤
│  Middleware: CORS, Rate Limiting, Logging                   │
├─────────────────────────────────────────────────────────────┤
│  Routers: /auth, /agents, /merchants, /transactions, ...   │
├─────────────────────────────────────────────────────────────┤
│  Services: Business Logic                                   │
├─────────────────────────────────────────────────────────────┤
│  Models: SQLAlchemy ORM                                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                     MySQL Database                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Instalação

### Pré-requisitos

- Python 3.11+
- MySQL 8.0+
- pip ou pipenv

### Passos

```bash
# 1. Navegar para o directório do backend
cd backend-api

# 2. Criar ambiente virtual
python -m venv venv

# 3. Activar ambiente virtual
# Windows:
venv\Scripts\activate
# Linux/Mac:
source venv/bin/activate

# 4. Instalar dependências
pip install -r requirements.txt
```

---

## Configuração

### Ficheiro .env

Criar ficheiro `.env` na pasta `backend-api/`:

```env
# App
SECRET_KEY=sua-chave-secreta-muito-longa-e-segura

# Database (MySQL)
DATABASE_URL=mysql+aiomysql://usuario:senha@localhost:3306/paysafe

# Portal SDK (integração com gateway de pagamentos)
PORTAL_API_KEY=sua-api-key
PORTAL_PUBLIC_KEY=sua-public-key
PORTAL_ADDRESS=api.portal.com
PORTAL_PORT=443
PORTAL_SSL=true

# Logging
LOG_LEVEL=INFO
```

### Variáveis de Ambiente

| Variável | Descrição | Obrigatório |
|----------|-----------|-------------|
| `SECRET_KEY` | Chave para JWT tokens | ✅ |
| `DATABASE_URL` | URL de conexão MySQL | ✅ |
| `PORTAL_API_KEY` | API Key do portal de pagamentos | ✅ |
| `PORTAL_PUBLIC_KEY` | Chave pública do portal | ✅ |
| `PORTAL_ADDRESS` | Endereço do portal | ✅ |
| `PORTAL_PORT` | Porta do portal | ✅ |
| `PORTAL_SSL` | Usar SSL | Não (default: true) |
| `LOG_LEVEL` | Nível de logging | Não (default: INFO) |

---

## Execução

### Desenvolvimento

```bash
# Activar venv
venv\Scripts\activate  # Windows
source venv/bin/activate  # Linux

# Iniciar servidor de desenvolvimento
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Produção

**Windows:**

```bash
run_prod_windows.bat
```

**Linux:**

```bash
chmod +x run_prod_linux.sh
./run_prod_linux.sh
```

O servidor estará disponível em:

- **API**: <http://localhost:8000>
- **Docs (Swagger)**: <http://localhost:8000/docs>
- **Docs (ReDoc)**: <http://localhost:8000/redoc>

---

## Endpoints API

### Base URL

```
http://localhost:8000/api/v1
```

### Health Checks

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/` | GET | Status básico |
| `/health` | GET | Health check simples |
| `/health/full` | GET | Health check completo (DB, sistema) |
| `/stats` | GET | Estatísticas do sistema |

### Autenticação (`/auth`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/auth/login` | POST | Login web (username/password) |
| `/auth/pos-login` | POST | Login POS (code/PIN + device) |
| `/auth/refresh` | POST | Refresh token |
| `/auth/me` | GET | Dados do utilizador autenticado |

### Utilizadores (`/users`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/users` | GET | Listar utilizadores |
| `/users` | POST | Criar utilizador |
| `/users/{id}` | GET | Obter utilizador |
| `/users/{id}` | PUT | Atualizar utilizador |
| `/users/{id}` | DELETE | Eliminar utilizador |

### Agentes (`/agents`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/agents` | GET | Listar agentes |
| `/agents` | POST | Criar agente |
| `/agents/{id}` | GET | Obter agente |
| `/agents/{id}` | PUT | Atualizar agente |
| `/agents/{id}` | DELETE | Eliminar agente |
| `/agents/login` | POST | Login de agente |
| `/agents/{id}/reset-pin` | POST | Resetar PIN |

### Comerciantes (`/merchants`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/merchants` | GET | Listar comerciantes |
| `/merchants` | POST | Criar comerciante |
| `/merchants/{id}` | GET | Obter comerciante |
| `/merchants/{id}` | PUT | Atualizar comerciante |
| `/merchants/{id}` | DELETE | Eliminar comerciante |
| `/merchants/nfc/{nfc_id}` | GET | Buscar por NFC |

### Transações (`/transactions`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/transactions` | GET | Listar transações |
| `/transactions` | POST | Criar transação |
| `/transactions/{id}` | GET | Obter transação |
| `/transactions/{id}/void` | POST | Anular transação |

### Mercados (`/markets`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/markets` | GET | Listar mercados |
| `/markets` | POST | Criar mercado |
| `/markets/{id}` | GET | Obter mercado |
| `/markets/{id}` | PUT | Atualizar mercado |

### Dispositivos POS (`/pos-devices`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/pos-devices` | GET | Listar dispositivos |
| `/pos-devices` | POST | Registar dispositivo |
| `/pos-devices/{id}` | GET | Obter dispositivo |
| `/pos-devices/{id}` | PUT | Atualizar dispositivo |
| `/pos-devices/{id}/bind` | POST | Vincular a agente |

### Aprovações (`/approvals`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/approvals/pending` | GET | Listar pendentes |
| `/approvals/{id}/approve` | POST | Aprovar pedido |
| `/approvals/{id}/reject` | POST | Rejeitar pedido |

### Relatórios (`/reports`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/reports/daily` | GET | Relatório diário |
| `/reports/monthly` | GET | Relatório mensal |
| `/reports/export` | GET | Exportar dados |

### Localizações (`/locations`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/locations/provinces` | GET | Listar províncias |
| `/locations/municipalities` | GET | Listar municípios |

### Audit Logs (`/audit-logs`)

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/audit-logs` | GET | Listar logs de auditoria |

---

## Modelos de Dados

### User (Utilizador)

```python
- id: int
- username: str
- email: str
- hashed_password: str
- role: str (admin/operator/readonly)
- is_active: bool
- province_id: int (nullable)
- municipality_id: int (nullable)
```

### Agent (Agente)

```python
- id: int
- agent_code: str (unique)
- name: str
- phone: str
- pin_hash: str
- status: str (active/inactive/suspended)
- market_id: int
- scope: str (national/provincial/municipal)
```

### Merchant (Comerciante)

```python
- id: int
- nfc_id: str (unique)
- name: str
- business_name: str
- phone: str
- nif: str
- banca: str
- market_id: int
- status: str
```

### Transaction (Transação)

```python
- id: int
- reference: str (unique)
- merchant_id: int
- agent_id: int
- pos_device_id: int
- amount: decimal
- payment_method: str (cash/mpesa/emola)
- status: str (completed/pending/voided)
- created_at: datetime
```

### POSDevice (Dispositivo POS)

```python
- id: int
- serial_number: str (unique)
- model: str
- status: str (active/inactive)
- agent_id: int (nullable)
- province_id: int
- municipality_id: int
```

---

## Autenticação

### JWT Tokens

A API usa **JWT (JSON Web Tokens)** para autenticação:

```bash
# Exemplo de login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "senha123"}'

# Resposta
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Uso do Token

```bash
# Requisição autenticada
curl -X GET "http://localhost:8000/api/v1/users" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

### Roles (Papéis)

| Role | Permissões |
|------|------------|
| `admin` | Acesso total ao sistema |
| `operator` | CRUD de entidades, transações |
| `readonly` | Apenas visualização |
| `agent` | Login POS, transações próprias |

### Scope (Âmbito Geográfico)

Os utilizadores podem ter acesso limitado por:

- **National**: Acesso a todo o país
- **Provincial**: Acesso apenas à sua província
- **Municipal**: Acesso apenas ao seu município

---

## Scripts Utilitários

### Criar Administrador

```bash
python -m scripts.create_admin
```

### Seed de Localizações

```bash
python -m scripts.seed_locations
```

### Migrações de Base de Dados

```bash
# Criar nova migração
alembic revision --autogenerate -m "descrição"

# Aplicar migrações
alembic upgrade head

# Reverter migração
alembic downgrade -1
```

---

## Desenvolvimento

### Estrutura de um Router

```python
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

router = APIRouter(prefix="/example", tags=["example"])

@router.get("/")
async def list_examples(db: AsyncSession = Depends(get_db)):
    # Implementação
    pass
```

### Adicionar Novo Endpoint

1. Criar/editar router em `app/routers/`
2. Registar no `app/routers/__init__.py`
3. Criar schemas em `app/schemas/`
4. Criar testes (opcional)

### Rate Limiting

A API tem rate limiting de **300 requisições por minuto** por IP.

### Logging

Logs estruturados em JSON:

```json
{
  "timestamp": "2025-12-26T08:00:00Z",
  "level": "info",
  "event": "request_completed",
  "method": "GET",
  "path": "/api/v1/users",
  "status_code": 200,
  "duration_ms": 45
}
```

---

## Testes

```bash
# Executar testes
pytest

# Com cobertura
pytest --cov=app
```

---

## Licença

Proprietary © 2025 PaySafe Moçambique. Todos os direitos reservados.

---

<div align="center">

**PaySafe Backend API**

*Potenciando pagamentos seguros em mercados municipais*

</div>
