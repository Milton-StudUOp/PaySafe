# PaySafe - Plano de Negócios Executivo

## 1. Resumo Executivo

**PaySafe** é uma plataforma completa de pagamentos e gestão de vendedores informais, focada em mercados e feiras na África, com capacidade offline-first para áreas com conectividade limitada.

### Proposta de Valor Única
>
> "Pagamentos digitais que funcionam mesmo sem internet, trazendo inclusão financeira para vendedores de mercados tradicionais."

### Métricas-Chave do MVP

| Componente | Status | Funcionalidades |
|------------|--------|-----------------|
| Backend API | ✅ Completo | 15 endpoints, autenticação, sincronização |
| Dashboard Web | ✅ Completo | Gestão de comerciantes, relatórios, admin |
| Terminal POS | ✅ Completo | Pagamentos offline, NFC, cache robusto |

---

## 2. Análise de Mercado

### 2.1 Mercado-Alvo Primário: Moçambique

| Indicador | Valor | Fonte |
|-----------|-------|-------|
| População | 33 milhões | INE 2024 |
| Economia informal | ~40% do PIB | Banco Mundial |
| Penetração mobile money | 22% | GSMA 2023 |
| Mercados formais registados | 1,200+ | Ministério Indústria |
| Vendedores informais | 3+ milhões | Estimativa |

### 2.2 Problema que Resolvemos

```
┌─────────────────────────────────────────────────────────────────┐
│  HOJE (Sem PaySafe)                                             │
├─────────────────────────────────────────────────────────────────┤
│  ❌ Vendedores só aceitam dinheiro físico                       │
│  ❌ Sem histórico de vendas → difícil acesso a crédito          │
│  ❌ Gestão de mercados é manual (papel)                         │
│  ❌ Cobrança de taxas/quotas é ineficiente                      │
│  ❌ Operadores não têm visibilidade das transações              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  COM PaySafe                                                    │
├─────────────────────────────────────────────────────────────────┤
│  ✅ Aceita M-Pesa, e-Mola, mKesh + dinheiro                     │
│  ✅ Histórico digital → scoring de crédito                      │
│  ✅ Dashboard para gestão centralizada                          │
│  ✅ Cobrança automática de taxas                                │
│  ✅ Relatórios em tempo real                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Competidores

| Competidor | Força | Fraqueza | Nossa Vantagem |
|------------|-------|----------|----------------|
| M-Pesa/e-Mola | Brand, escala | Não foca mercados | Solução especializada |
| POS bancários | Infraestrutura | Caros, precisam net | Offline-first, barato |
| Papel/Manual | Familiar | Ineficiente | Digital simples |
| Startups similares | Inovação | Pouca penetração | Execução local |

### 2.4 TAM/SAM/SOM

```
TAM (Total Addressable Market) - África Subsaariana
├── 1 bilhão de pessoas
├── ~200 milhões em economia informal
└── Potencial: $10B+ em transações/ano

SAM (Serviceable Addressable Market) - Moçambique + PALOP
├── 80 milhões de pessoas
├── ~15 milhões vendedores informais
└── Potencial: $500M em transações/ano

SOM (Serviceable Obtainable Market) - 3 anos
├── 5,000 mercados/locais
├── 100,000 comerciantes
└── Meta: $50M em transações/ano
└── Receita: $2-5M/ano
```

---

## 3. Modelo de Negócio

### 3.1 Modelo Recomendado: SaaS + Transaction Fee

```
┌────────────────────────────────────────────────────────────────┐
│                    FONTES DE RECEITA                           │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  1. ASSINATURA MENSAL (por mercado/operador)                   │
│     ├── Básico:       $100/mês (até 50 comerciantes)          │
│     ├── Profissional: $250/mês (até 200 comerciantes)         │
│     └── Enterprise:   $500+/mês (ilimitado)                   │
│                                                                │
│  2. TAXA POR TRANSAÇÃO                                         │
│     ├── Pagamentos digitais: 0.5% do valor                    │
│     ├── Mínimo: $0.01 por transação                           │
│     └── Máximo: $1.00 por transação                           │
│                                                                │
│  3. SETUP & ONBOARDING                                         │
│     ├── Configuração inicial: $500-2,000                      │
│     ├── Treinamento: $200/dia                                 │
│     └── Hardware (se fornecido): markup 20%                   │
│                                                                │
│  4. SERVIÇOS ADICIONAIS (Fase 2)                              │
│     ├── Relatórios premium: $50/mês                           │
│     ├── Crédito para comerciantes: 5% fee                     │
│     └── Integração customizada: $2,000+                       │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### 3.2 Projeção de Unit Economics

| Métrica | Valor |
|---------|-------|
| CAC (Custo Aquisição Cliente) | $200-500 |
| LTV (Lifetime Value) - 3 anos | $4,000-8,000 |
| Margem Bruta | 70-80% |
| Churn Mensal Esperado | 2-5% |
| LTV:CAC Ratio | 8:1 - 16:1 ✅ |

---

## 4. Projeção Financeira (3 Anos)

### 4.1 Cenário Conservador

| Ano | Mercados | Comerciantes | Tx/Mês ($M) | Receita/Mês | Receita/Ano |
|-----|----------|--------------|-------------|-------------|-------------|
| 1 | 30 | 1,500 | $1.5 | $10,500 | $126,000 |
| 2 | 100 | 5,000 | $5.0 | $35,000 | $420,000 |
| 3 | 300 | 15,000 | $15.0 | $105,000 | $1,260,000 |

### 4.2 Breakdown de Receita (Ano 3)

```
Assinaturas (300 mercados × $250/mês)      = $75,000/mês
Taxas transação ($15M × 0.5%)              = $75,000/mês
Setup novos clientes (10/mês × $1,000)     = $10,000/mês
─────────────────────────────────────────────────────────
RECEITA TOTAL                              = $160,000/mês
                                           = $1.92M/ano
```

### 4.3 Estrutura de Custos (Ano 3)

| Categoria | Mensal | % Receita |
|-----------|--------|-----------|
| Infraestrutura (AWS/Cloud) | $3,000 | 2% |
| Equipe (8 pessoas) | $25,000 | 16% |
| Vendas & Marketing | $15,000 | 9% |
| Operações & Suporte | $10,000 | 6% |
| Administrativo | $5,000 | 3% |
| **TOTAL CUSTOS** | **$58,000** | **36%** |
| **MARGEM OPERACIONAL** | **$102,000** | **64%** |

---

## 5. Go-to-Market Strategy

### 5.1 Fase 1: Prova de Conceito (Meses 1-6)

**Meta:** 10 mercados piloto em Maputo

```
Ações:
├── Identificar 10 mercados parceiros
├── Instalar terminais e treinar agentes
├── Coletar feedback intensivamente
├── Ajustar produto baseado em uso real
└── Documentar casos de sucesso

Investimento: $30,000
Resultado: Validação de mercado
```

### 5.2 Fase 2: Expansão Maputo (Meses 7-12)

**Meta:** 50 mercados na Grande Maputo

```
Ações:
├── Contratar equipe de vendas (3 pessoas)
├── Parcerias com associações de mercados
├── Marketing local (rádios comunitárias, flyers)
├── Programa de referência (mercado indica mercado)
└── Integração com mais carteiras (mKesh, etc)

Investimento: $80,000
Resultado: Produto-mercado fit comprovado
```

### 5.3 Fase 3: Escala Nacional (Anos 2-3)

**Meta:** 300+ mercados em Moçambique

```
Ações:
├── Expansão para províncias: Nampula, Beira, etc
├── Parcerias B2B (bancos, operadoras mobile)
├── Licenciamento para terceiros
├── Entrada em Angola/outros PALOP
└── Buscar investimento Série A

Investimento: $500,000+
Resultado: Líder de mercado regional
```

---

## 6. Parcerias Estratégicas

### 6.1 Parceiros Prioritários

| Parceiro | Benefício Mútuo | Status |
|----------|-----------------|--------|
| **Vodacom/M-Pesa** | Integração pagamentos | A abordar |
| **Movitel/e-Mola** | Integração pagamentos | A abordar |
| **INAMI** (Mercados) | Acesso direto | A abordar |
| **Municípios** | Digitalização taxas | Potencial alto |
| **FSDMoc** | Financiamento inicial | A abordar |
| **Bancos locais** | Crédito comerciantes | Fase 2 |

### 6.2 Modelo Win-Win com Operadoras

```
┌─────────────────────────────────────────────────────────────┐
│  PROPOSTA PARA M-PESA/E-MOLA                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  "Nós trazemos novos comerciantes para sua plataforma"      │
│                                                             │
│  PaySafe oferece:                                           │
│  ├── Terminal que aceita M-Pesa (mais usuários)            │
│  ├── Onboarding de comerciantes sem custo para operadora   │
│  └── Dados de transação (anonimizados) para insights       │
│                                                             │
│  PaySafe pede:                                              │
│  ├── Comissão reduzida (0.3% vs 1%)                        │
│  ├── Co-marketing                                          │
│  └── API prioritária                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Equipe Necessária

### 7.1 Ano 1 (Equipa Mínima)

| Posição | Pessoas | Salário/mês | Perfil |
|---------|---------|-------------|--------|
| CEO/Fundador | 1 | $2,000 | Visão, vendas, fundraising |
| CTO/Dev Lead | 1 | $2,500 | Manutenção sistema |
| Vendas/Operações | 2 | $800 cada | Field sales, suporte |
| **TOTAL** | **4** | **$6,100** | |

### 7.2 Ano 2-3 (Escala)

| Posição | Pessoas | Salário/mês |
|---------|---------|-------------|
| Executivos | 2 | $5,000 |
| Desenvolvimento | 2 | $4,000 |
| Vendas | 3 | $3,000 |
| Operações/Suporte | 2 | $1,600 |
| Marketing | 1 | $1,500 |
| Admin/Finanças | 1 | $1,200 |
| **TOTAL** | **11** | **$16,300** |

---

## 8. Investimento & Funding

### 8.1 Necessidades de Capital

| Fase | Valor | Uso |
|------|-------|-----|
| **Seed (Agora)** | $50,000-100,000 | Piloto, equipe inicial |
| **Pre-Series A** | $300,000-500,000 | Expansão Maputo |
| **Series A** | $1-2M | Escala nacional/regional |

### 8.2 Fontes de Financiamento

| Fonte | Probabilidade | Valor Típico |
|-------|---------------|--------------|
| **Bootstrapping/Auto** | Alta | $10-50k |
| **FFA** (Friends/Family/Angels) | Média | $20-100k |
| **FSDMoc/USAID** | Média | $50-200k (grant) |
| **VCs Africanos** (Novastar, TLcom) | Média-baixa | $500k-2M |
| **DFIs** (IFC, FMO) | Baixa inicial | $1M+ |

### 8.3 Uso do Capital Seed ($100k)

```
Equipe (12 meses)           $45,000   45%
├── Salários
└── Benefícios

Operações                   $25,000   25%
├── Infraestrutura cloud
├── Hardware terminais piloto
└── Viagens/transporte

Vendas & Marketing          $15,000   15%
├── Material promocional
├── Eventos/feiras
└── Marketing digital

Contingência                $15,000   15%
├── Imprevistos
└── Oportunidades
```

---

## 9. Riscos & Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Baixa adoção inicial | Média | Alto | Piloto focado, feedback rápido |
| Competição de grandes players | Média | Alto | Diferenciação (offline), parcerias |
| Regulamentação | Baixa | Alto | Compliance proativo, advogados |
| Problemas técnicos | Média | Médio | Sistema testado, suporte rápido |
| Falta de funding | Média | Alto | Bootstrap inicial, revenue early |
| Fraude | Média | Médio | Controles, verificação agentes |

---

## 10. Métricas de Sucesso (KPIs)

### 10.1 Ano 1

| KPI | Meta | Frequência |
|-----|------|------------|
| Mercados ativos | 30 | Mensal |
| Comerciantes registrados | 1,500 | Mensal |
| Transações/mês | 10,000+ | Semanal |
| Volume transacionado | $1M+ | Mensal |
| NPS (satisfação) | >50 | Trimestral |
| Churn | <5%/mês | Mensal |
| Receita recorrente | $10k+/mês | Mensal |

### 10.2 Milestones Críticos

```
M1-M3:   Primeiro mercado piloto funcionando
M4-M6:   10 mercados, $3k receita/mês
M7-M9:   25 mercados, break-even operacional
M10-M12: 50 mercados, $15k receita/mês
M18:     100 mercados, $50k receita/mês
M24:     Expansão para segunda cidade
M36:     300 mercados, $150k receita/mês, regional
```

---

## 11. Próximos Passos Imediatos

### Ações para os Próximos 30 Dias

| # | Ação | Responsável | Prazo |
|---|------|-------------|-------|
| 1 | Finalizar versão beta do POS | Dev | Semana 1 |
| 2 | Identificar 3 mercados piloto | Founder | Semana 2 |
| 3 | Apresentação para parceiros | Founder | Semana 3 |
| 4 | Iniciar piloto primeiro mercado | Equipe | Semana 4 |
| 5 | Documentar aprendizados | Todos | Contínuo |

---

## 12. Conclusão

PaySafe está posicionado para capturar uma oportunidade significativa no mercado de pagamentos para economia informal em Moçambique e África.

**Vantagens competitivas:**

- ✅ Solução técnica robusta (offline-first)
- ✅ Foco específico em mercados (nicho defensável)
- ✅ Equipe com conhecimento local
- ✅ MVP funcional e testado

**Necessidade imediata:**

- 💰 Financiamento seed de $50-100k
- 🤝 Parceiros operadores de mercado
- 👥 Equipe de campo para vendas

---

*Documento preparado em Dezembro 2024*
*Versão 1.0*
