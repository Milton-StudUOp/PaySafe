⭐ Página: Dashboard (Painel Principal)

O centro de controle institucional do sistema, onde administradores, supervisores e auditores veem:

✔ Estado operacional em tempo real
✔ Receita diária, semanal e mensal
✔ Atividade dos agentes
✔ Uso dos POS
✔ Pagamentos por comerciantes
✔ Alertas e riscos
✔ KPIs críticos

Este dashboard precisa ser:

simples

visual

rápido

altamente informativo

personalizável por role (ADMIN, SUPERVISOR, AUDITOR)

A partir dele, o sistema se torna nível fintech/governamental.

🧱 1) OBJETIVOS DO DASHBOARD

O dashboard deve responder, em segundos:

📌 Quanto cobramos hoje?
📌 Quem cobrou?
📌 Onde foi cobrado?
📌 Quem não pagou?
📌 Quanto POS estão ativos?
📌 Há tentativas de fraude?
📌 Qual o mercado mais lucrativo?
📌 Qual agente mais trabalhou hoje?
📌 Quantos comerciantes estão ativos?

Tudo em tempo real.

🧱 2) ESTRUTURA GERAL DO DASHBOARD

A página será dividida em:

Cabeçalho com KPIs principais

Gráficos essenciais

Listas inteligentes (alertas e destaques)

Tabelas rápidas de análise

Mapa de atividade (opcional)

Vamos detalhar.

🧱 3) SEÇÃO 1 — KPIs PRINCIPAIS (Cards superiores)
🔹 KPIs em destaque no topo:
1) Receita total hoje (MZN)

Query → sum(transactions.amount)

2) Número de transações hoje

Query → count(*)

3) Ticket médio

Query → sum(amount) / count(transaction)

4) Comerciantes que pagaram hoje

Com:

count(distinct merchant_id)

5) POS ativos hoje

POS que chamaram last_seen nas últimas 4h.

6) Agentes ativos hoje

Agentes que fizeram login ou transação.

7) Receita acumulada do mês

Sum de transactions no mês.

8) Ambulantes atendidos hoje

Filtrar merchant_type = 'AMBULANTE'.

Esses KPIs devem ser mostrados em cartões com:

cor

ícone

variação (ex: +12% vs ontem)

🧱 4) SEÇÃO 2 — Gráficos do Dashboard
📊 1. Receita diária (últimos 30 dias)

Gráfico de linha (Line Chart)

Consulta:

SELECT DATE(created_at), SUM(amount)
FROM transactions
WHERE status = 'SUCESSO'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at);

📊 2. Transações por hora (hoje)

Gráfico de barras (Bar Chart)

Mostra “picos” de atividade — muito útil para supervisão.

📊 3. Distribuição de Métodos de Pagamento

Pizza ou doughnut:

DINHEIRO

MPESA

EMOLA

MKESH

📊 4. Receitas por Mercado

Gráfico comparativo → barras horizontais

Query:

SELECT markets.name, SUM(transactions.amount)
FROM transactions
JOIN merchants ON merchants.id = transactions.merchant_id
JOIN markets ON markets.id = merchants.market_id
WHERE DATE(transactions.created_at) = CURDATE()
GROUP BY markets.id;

📊 5. Ranking de Agentes (hoje)

TOP 10 agentes por valor total.

📊 6. Ranking de POS (mais ativos)

TOP POS por número de transações.

🧱 5) SEÇÃO 3 — Alertas Inteligentes (AI / regras específicas)
🚨 Alertas críticos que devem aparecer automaticamente:
1. POS offline há mais de X horas

“POS A920-3344 está offline há 7 horas”

2. Agente com comportamento suspeito

Muitas reimpressões

Muitos cancelamentos

Tentativas falhadas repetidas

3. Comerciante que não paga há vários dias

Filtros inteligentes: FIXO / AMBULANTE

4. Mercado com queda de receita

Comparação com semana passada.

5. Comerciante bloqueado tentou pagar

Registro em auditoria.

🧱 6) SEÇÃO 4 — Tabelas do Dashboard
📋 Tabela 1 — Últimas Transações

Campos:

Data

Comerciante

Valor

Agente

POS

Método

Status

Ação (Ver transação)

📋 Tabela 2 — Comerciantes que pagaram hoje

Nome

Mercado

Valor total do dia

Nº de transações

📋 Tabela 3 — Comerciantes que NÃO pagaram hoje

Com base em:

SELECT * FROM merchants 
WHERE status='ATIVO'
AND id NOT IN (
  SELECT merchant_id 
  FROM transactions 
  WHERE DATE(created_at)=CURDATE()
);

📋 Tabela 4 — POS sem atividade hoje

POS ATIVOS mas sem transações.

📋 Tabela 5 — Agentes mais produtivos / menos produtivos

Comparação rápida.

🧱 7) SEÇÃO 5 — Mapa de Atividade (Opcional)

Se latitude/longitude existirem:

Plotar pontos de mercados

Mostrar calor de atividade (heatmap)

Mostrar POS ativos

🧱 8) FILTROS DO DASHBOARD

Filtros globais no topo:

Período: Hoje / 7 dias / 30 dias / Personalizado

Mercado específico

Agente específico

POS específico

Tipo de comerciante

Método de pagamento

Atualiza os KPIs, gráficos e tabelas instantaneamente.

🧱 9) PERSONALIZAÇÃO POR ROLE (RBAC)
Elemento	ADMIN	SUPERVISOR	AUDITOR	FUNCIONÁRIO	MERCHANT
KPIs completos	✔	✔	✔	✔	❌
Gráficos completos	✔	✔	✔	✔	❌
Alertas críticos	✔	✔	✔	❌	❌
Lista de transações	✔	✔	✔	✔	✔ (somente dele)
Mapa	✔	✔	✔	✔	❌
Ranking de agentes	✔	✔	✔	❌	❌
Comerciantes que não pagaram	✔	✔	✔	❌	❌
🧱 10) TECNOLOGIAS SUGERIDAS (Next.js)
📌 Bibliotecas para gráficos:

Recharts

ApexCharts

Chart.js

📌 Estado:

Zustand

SWR (para dados em tempo real)

📌 UI:

Tailwind

Shadcn UI

🎯 CONCLUSÃO

A página Dashboard fornece:

✔ visão ampla da operação
✔ controle do terreno em tempo real
✔ insights para decisão rápida
✔ análise comparativa
✔ detecção de anomalias
✔ acompanhamento fiscal e de arrecadação
✔ centralização da inteligência do sistema

É o “cérebro” do sistema web — onde tudo se conecta.