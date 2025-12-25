# Paysafe Backend API

API RESTful desenvolvida em Python (FastAPI) para gerenciar o sistema POS Paysafe.

## 🖥 Visão Geral

O backend é responsável por:

* Autenticação e gestão de usuários.
* Processamento e armazenamento de transações.
* Gestão de terminais e estabelecimentos.
* Interface com gateways de pagamento externos (via Portal SDK).

**Tecnologias:** FastAPI, SQLAlchemy (Async), MySQL, Uvicorn.

## 🛠 Pré-requisitos

* **Python**: 3.9 ou superior.
* **MySQL**: 8.0 ou superior (ou MariaDB compatível).
* **Virtualenv**: Recomendado para isolamento de dependências.

## 📦 Instalação

1. **Criar ambiente virtual**:

    ```bash
    python -m venv venv
    .\venv\Scripts\activate  # Windows
    # source venv/bin/activate # Linux/Mac
    ```

2. **Instalar dependências**:

    ```bash
    pip install -r requirements.txt
    ```

3. **Configurar Variáveis de Ambiente**:
    Crie um arquivo `.env` na raiz (use `.env.example` como base).
    Certifique-se de configurar a conexão com o banco de dados:

    ```ini
    DATABASE_URL=mysql+aiomysql://usuario:senha@localhost/nome_do_banco
    SECRET_KEY=sua_chave_secreta_segura
    ```

## 🗄 Banco de Dados

1. **Criar o banco no MySQL**:
    Crie um banco de dados vazio (ex: `paysafe_db`) no seu servidor MySQL.

2. **Rodar Migrações (Alembic)**:
    Isso criará as tabelas necessárias.

    ```bash
    alembic upgrade head
    ```

3. **Criar Usuário Admin**:
    Utilize o script utilitário para criar o primeiro usuário:

    ```bash
    python scripts/create_admin.py
    ```

## 🚀 Como Rodar

### Desenvolvimento

Roda com *hot-reload* ativado.

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Produção (Windows)

Utilize o script batch incluído:

```cmd
run_prod_windows.bat
```

Isso iniciará o servidor com múltiplos *workers* para melhor performance.

## 📜 Documentação da API

Após iniciar o servidor, a documentação interativa (Swagger UI) está disponível em:

* <http://localhost:8000/docs>
* <http://localhost:8000/redoc>

## 📁 Scripts Úteis (pasta `scripts/`)

* `create_admin.py`: Cria superusuário.
* `seed_locations.py`: Popula dados iniciais de locais (províncias/distritos).
* `fix_*.py`: Scripts de correção/migração de dados legados.
