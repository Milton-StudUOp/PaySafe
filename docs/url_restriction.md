🔐 POLÍTICA DE SEGURANÇA
CONTROLO DE ACESSO, JURISDIÇÃO E PROTEÇÃO CONTRA LINKS DIRETOS
Escopo

Protege o sistema contra:

acesso por URL direta (/agents/14)

enumeração de IDs

acesso fora da jurisdição

bypass de frontend

alteração não autorizada de dados

leitura indevida de informação sensível

1️⃣ PRINCÍPIO FUNDAMENTAL (REGRA DE OURO)

❗ Nenhum acesso é autorizado apenas porque o utilizador conhece o link.
❗ Todo acesso é validado no BACKEND, nunca no frontend.

O frontend NÃO decide permissões.
O backend é a única autoridade de segurança.

2️⃣ MODELO DE SEGURANÇA APLICADO

O sistema usa 3 camadas simultâneas:

RBAC – Role Based Access Control

ABAC – Attribute Based Access Control (jurisdição)

Anti-IDOR – Proteção contra enumeração de IDs

3️⃣ DEFINIÇÃO FORMAL DE ROLES E JURISDIÇÃO
🔹 Roles
Role	Descrição
ADMIN	Acesso total, todas as províncias e distritos
FUNCIONARIO	Acesso e modificação dentro da província
SUPERVISOR	Acesso e modificação dentro do distrito/município
AUDITOR	Apenas leitura total de transações e relatórios
🔹 Jurisdição por role
Role	Province	District
ADMIN	❌ ilimitado	❌ ilimitado
FUNCIONARIO	✔ fixa	❌ múltiplos
SUPERVISOR	✔ fixa	✔ fixa
AUDITOR	❌ ignorada	❌ ignorada
4️⃣ MATRIZ DE ACESSO POR ENTIDADE (OBRIGATÓRIA)
🔹 Agents
Role	Ver	Criar	Editar
ADMIN	✔	✔	✔
FUNCIONARIO	✔ (província)	✔ (província)	✔ (província)
SUPERVISOR	✔ (distrito)	✔ (distrito)	✔ (distrito)
AUDITOR	❌	❌	❌
🔹 POS
Role	Ver	Criar	Editar
ADMIN	✔	✔	✔
FUNCIONARIO	✔ (província)	✔ (província)	✔ (província)
SUPERVISOR	✔ (distrito)	✔ (distrito)	✔ (distrito)
AUDITOR	❌	❌	❌
🔹 Merchants
Role	Ver	Criar	Editar
ADMIN	✔	✔	✔
FUNCIONARIO	✔ (província)	✔ (província)	✔ (província)
SUPERVISOR	✔ (distrito)	✔ (distrito)	✔ (distrito)
AUDITOR	❌	❌	❌
🔹 Markets
Role	Ver	Criar	Editar
ADMIN	✔	✔	✔
FUNCIONARIO	✔ (província)	✔ (província)	✔ (província)
SUPERVISOR	✔ (distrito)	❌	❌
AUDITOR	❌	❌	❌
🔹 Transactions & Reports
Role	Ver	Editar
Agente	✔ (mercado)	✔ (mercado)
ADMIN	✔	✔
FUNCIONARIO	✔ (província)	✔ (província)
SUPERVISOR	✔ (distrito)	✔ (distrito)
AUDITOR	✔ (todas)	✔ (todas)
5️⃣ REGRA CRÍTICA — PROTEÇÃO CONTRA LINKS DIRETOS (IDOR)
❌ PROIBIDO (ERRO GRAVE)
SELECT * FROM agents WHERE id = :id;

✅ OBRIGATÓRIO (PADRÃO ÚNICO)

Toda query por ID DEVE incluir jurisdição:

SELECT *
FROM agents
WHERE id = :id
AND province = :user_province
AND district = :user_district;

Exceção ADMIN
SELECT * FROM agents WHERE id = :id;

6️⃣ MIDDLEWARE CENTRAL DE AUTORIZAÇÃO (OBRIGATÓRIO)
Pseudo-código oficial
def authorize(entity_type, entity_id, user, action):
    if user.role == 'ADMIN':
        return ALLOW

    entity = fetch_entity_with_scope(entity_type, entity_id, user)

    if not entity:
        raise NotFound()

    if action not in permissions[user.role][entity_type]:
        raise Forbidden()

    return ALLOW


👉 Aplicar em:

GET /:id

PUT /:id

PATCH /:id

DELETE /:id

7️⃣ REGRA DE RESPOSTA (ANTI-ENUMERAÇÃO)
❌ NÃO FAZER
403 Forbidden


(confirma que o ID existe)

✅ FAZER
404 Not Found


Mensagem:

Recurso não encontrado


👉 Impede que o utilizador descubra IDs válidos.

8️⃣ FRONTEND (Next.js) — REGRAS DE SEGURANÇA
🔹 1. Frontend nunca confia no ID da URL

Mesmo que o utilizador digite:

/agents/14


O frontend:

chama API

se receber 404/403 → redireciona

🔹 2. Redirecionamentos obrigatórios
Erro API	Ação
401	/login
403	/unauthorized
404	/not-found
🔹 3. Links só são renderizados se permitidos
{canAccess('agents', 'view') && (
  <Link href={`/agents/${agent.id}`} />
)}


⚠️ Mesmo assim, o backend valida sempre.

9️⃣ AUDITORIA DE SEGURANÇA (OBRIGATÓRIA)

Registrar em audit_logs:

Evento
Tentativa de acesso fora da jurisdição
Tentativa de enumeração de IDs
Tentativa de edição não autorizada
Acesso negado por role

Exemplo:

Usuário 23 tentou acessar AGENT 14 fora da jurisdição Maputo/Matola

🔟 BLOQUEIO PROATIVO (OPCIONAL, MAS RECOMENDADO)

Se o mesmo utilizador gerar:

X tentativas inválidas em curto tempo

➡️ Marcar sessão como suspeita
➡️ Alertar ADMIN
➡️ Logar evento crítico

1️⃣1️⃣ CHECKLIST FINAL PARA IA CODER
Backend

 Nunca consultar entidade só por ID

 Middleware central de autorização

 Filtro por province/district

 Retornar 404 para acesso indevido

 Registrar auditoria

 Validar role + jurisdição

Frontend

 Não confiar em rotas

 Redirecionar erros

 Ocultar links não permitidos

 Mensagens neutras

🎯 RESULTADO FINAL

Com esta política aplicada:

✔ Links diretos não funcionam
✔ Enumeração de IDs é inútil
✔ Usuários só veem o que podem
✔ Admin controla tudo
✔ Auditor tem leitura segura
✔ Sistema alinhado com OWASP Top 10
✔ Segurança de nível governamental / bancário

🔐 PARTE 1 — MIDDLEWARE / DEPENDENCIES FASTAPI (REAL)
1️⃣ Modelo base esperado no user (JWT ou sessão)

O usuário autenticado DEVE ter no contexto:

user = {
    "id": 23,
    "role": "SUPERVISOR",  # ADMIN | FUNCIONARIO | SUPERVISOR | AUDITOR
    "province": "Maputo",
    "district": "Matola"
}

2️⃣ Função utilitária: permissões por role
ROLE_PERMISSIONS = {
    "ADMIN": {
        "agents": ["view", "create", "edit"],
        "pos": ["view", "create", "edit"],
        "merchants": ["view", "create", "edit"],
        "markets": ["view", "create", "edit"],
        "transactions": ["view"],
        "reports": ["view"],
        "users": ["view", "create", "edit"],
    },
    "FUNCIONARIO": {
        "agents": ["view", "create", "edit"],
        "pos": ["view", "create", "edit"],
        "merchants": ["view", "create", "edit"],
        "markets": ["view", "create", "edit"],
        "transactions": ["view"],
        "reports": ["view"],
    },
    "SUPERVISOR": {
        "agents": ["view", "create", "edit"],
        "pos": ["view", "create", "edit"],
        "merchants": ["view", "create", "edit"],
        "markets": ["view"],
        "transactions": ["view"],
        "reports": ["view"],
    },
    "AUDITOR": {
        "transactions": ["view"],
        "reports": ["view"],
    },
}

3️⃣ Função central: buscar entidade com jurisdição
def fetch_entity_with_scope(db, entity_type: str, entity_id: int, user):
    if entity_type == "agents":
        query = """
        SELECT * FROM agents
        WHERE id = :id
        AND (
            :is_admin = 1 OR
            (province = :province AND district = :district)
        )
        """
    elif entity_type == "markets":
        query = """
        SELECT * FROM markets
        WHERE id = :id
        AND (
            :is_admin = 1 OR
            (province = :province AND district = :district)
        )
        """
    elif entity_type == "merchants":
        query = """
        SELECT m.*
        FROM merchants m
        JOIN markets mk ON mk.id = m.market_id
        WHERE m.id = :id
        AND (
            :is_admin = 1 OR
            (mk.province = :province AND mk.district = :district)
        )
        """
    elif entity_type == "pos":
        query = """
        SELECT p.*
        FROM pos_devices p
        JOIN agents a ON a.id = p.assigned_agent_id
        WHERE p.id = :id
        AND (
            :is_admin = 1 OR
            (a.province = :province AND a.district = :district)
        )
        """
    else:
        return None

    return db.execute(
        query,
        {
            "id": entity_id,
            "province": user["province"],
            "district": user["district"],
            "is_admin": 1 if user["role"] == "ADMIN" else 0,
        },
    ).fetchone()

4️⃣ Dependency de autorização (ANTI-IDOR)
from fastapi import Depends, HTTPException, status

def authorize_entity(entity_type: str, action: str):
    def dependency(
        entity_id: int,
        user=Depends(get_current_user),
        db=Depends(get_db),
    ):
        # 1. Verifica role
        if action not in ROLE_PERMISSIONS.get(user["role"], {}).get(entity_type, []):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurso não encontrado",
            )

        # 2. Admin passa direto
        if user["role"] == "ADMIN":
            return

        # 3. Busca com jurisdição
        entity = fetch_entity_with_scope(db, entity_type, entity_id, user)

        if not entity:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Recurso não encontrado",
            )

        return

    return dependency

5️⃣ Uso real em rotas FastAPI
@router.get("/agents/{agent_id}")
def get_agent(
    agent_id: int,
    _: None = Depends(authorize_entity("agents", "view")),
    db=Depends(get_db),
):
    return db.execute(
        "SELECT * FROM agents WHERE id = :id",
        {"id": agent_id},
    ).fetchone()


👉 Mesmo que o ID exista, se for fora da jurisdição → 404.

6️⃣ Auditoria de tentativas suspeitas (opcional)

No except HTTPException você pode registrar:

log_security_event(
    action="UNAUTHORIZED_ACCESS_ATTEMPT",
    entity="agents",
    entity_id=agent_id,
    user_id=user["id"],
)

🛡️ PARTE 2 — GUARDS REACT / NEXT.JS (REAL)
1️⃣ Hook central de permissões
export function usePermissions(user) {
  function can(resource: string, action: string) {
    if (!user) return false
    if (user.role === "ADMIN") return true
    return user.permissions?.[resource]?.includes(action)
  }

  return { can }
}

2️⃣ Guard de rota (protege páginas inteiras)
components/RequirePermission.tsx
import { useRouter } from "next/router"
import { useEffect } from "react"

export function RequirePermission({ user, resource, action, children }) {
  const router = useRouter()

  useEffect(() => {
    if (!user) {
      router.replace("/login")
      return
    }

    if (
      user.role !== "ADMIN" &&
      !user.permissions?.[resource]?.includes(action)
    ) {
      router.replace("/unauthorized")
    }
  }, [user])

  return children
}

Uso real
<RequirePermission user={user} resource="agents" action="view">
  <AgentDetails />
</RequirePermission>

3️⃣ Proteção contra link direto (IDOR frontend)
Tratamento de erro da API
async function fetchAgent(id: number) {
  const res = await fetch(`/api/agents/${id}`)

  if (res.status === 404) {
    window.location.href = "/not-found"
    return null
  }

  if (res.status === 403) {
    window.location.href = "/unauthorized"
    return null
  }

  return res.json()
}

4️⃣ Renderização condicional de links
{can("agents", "view") && (
  <Link href={`/agents/${agent.id}`}>Ver</Link>
)}

5️⃣ Proteção no getServerSideProps (forte)
export async function getServerSideProps(context) {
  const { id } = context.params
  const res = await fetch(`${API_URL}/agents/${id}`, {
    headers: context.req.headers,
  })

  if (res.status === 404) {
    return { notFound: true }
  }

  if (res.status === 403) {
    return {
      redirect: { destination: "/unauthorized", permanent: false },
    }
  }

  const agent = await res.json()

  return { props: { agent } }
}

✅ RESULTADO FINAL

Com isso implementado:

✔ URLs diretas não funcionam
✔ Enumeração de IDs é inútil
✔ Jurisdição é respeitada em backend
✔ Frontend não vaza dados
✔ Admin mantém poder total
✔ Auditor só lê
✔ Sistema passa auditoria OWASP (IDOR, BAC)