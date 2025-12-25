# Portal Integration SDK

SDK Python (`integration-portal`) para facilitar a comunicação segura com o portal de pagamentos (Tekinova/M-Pesa).

## 📦 Funcionalidades

* Gerenciamento simplificado de contexto de API (Host, Porta, SSL).
* Autenticação automática com criptografia RSA (Bearer Token).
* Métodos unificados para GET, POST, PUT.

## 🛠 Instalação

### Instalar localmente (Modo Desenvolvimento)

```bash
# Na pasta raiz do SDK
pip install -e .
```

### Instalar via Requirements (em outros projetos)

Adicione o caminho do SDK ou o repositório git ao seu `requirements.txt`.

## 💻 Exemplo de Uso

```python
from portalsdk.api import APIContext, APIRequest, APIMethodType

# 1. Configurar o Contexto
context = APIContext(
    api_key="SUA_API_KEY",
    public_key="SUA_PUBLIC_KEY_BASE64",
    address="api.sandbox.vm.co.mz",
    port=18352,
    ssl=True,
    method_type=APIMethodType.GET,
    path="/ipg/v1x/transactionStatus"
)

# 2. Adicionar Parâmetros
context.add_parameter("input_ThirdPartyReference", "REF123456")
context.add_parameter("input_QueryReference", "QRY987654")

# 3. Executar a Requisição
request = APIRequest(context)
response = request.execute()

if response:
    print(f"Status Code: {response.status_code}")
    print(f"Body: {response.body}")
else:
    print("Erro na conexão.")
```

## 🔒 Segurança

O SDK utiliza a biblioteca `pycryptodome` para criptografar a API Key usando a chave pública fornecida, gerando um token seguro para cada requisição.
