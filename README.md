# 🏪 Paysafe POS System

Sistema completo de cobrança para mercados em Moçambique.

## � Arquitectura

```
paysafe-system/
├── backend-api/         # FastAPI + MySQL
├── web-dashboard/       # Reflex (Admin Panel)
└── mobile-pos/          # Flutter (POS Android)
```

## �️ Base de Dados

| Tabela | Descrição |
|--------|-----------|
| `markets` | Mercados / Localizações |
| `merchants` | Comerciantes (FIXO/AMBULANTE) |
| `agents` | Agentes com PIN |
| `pos_devices` | Dispositivos POS |
| `transactions` | Transações financeiras |
| `receipts` | Recibos rastreáveis |
| `balances` | Saldos por comerciante |
| `users` | Usuários web (ADMIN/SUPERVISOR/AUDITOR) |
| `audit_logs` | Log de auditoria |

## 🚀 Instalação

### 1. MySQL
```sql
CREATE DATABASE paysafe_db;
```

### 2. Backend
```bash
cd backend-api
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
# Editar .env com credenciais
alembic upgrade head
uvicorn app.main:app --reload
```
**API Docs:** http://localhost:8000/docs

### 3. Dashboard (opcional)
```bash
cd web-dashboard
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
reflex init && reflex run
```
**Dashboard:** http://localhost:3000

### 4. Mobile (opcional)
```bash
cd mobile-pos
flutter pub get
flutter run
```

## 📡 Endpoints API

| Recurso | Endpoint |
|---------|----------|
| Auth | `POST /api/v1/auth/token` |
| Markets | `/api/v1/markets/` |
| Merchants | `/api/v1/merchants/` |
| Agents | `/api/v1/agents/` + `/login` |
| POS Devices | `/api/v1/pos-devices/` |
| Transactions | `/api/v1/transactions/` |
| Receipts | `/api/v1/receipts/` + `/lookup/{code}` |

## � Segurança
- Senhas: Argon2
- Auth: JWT Bearer Token
- POS: API Key Hash
- Agents: PIN Hash

## 📋 Próximos Passos
1. Criar endpoint de registro de users
2. Integrar dashboard com novos endpoints
3. Implementar app mobile com NFC + Impressão
