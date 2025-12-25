# Lógica de Jurisdição - Sistema PaySafe

## Resumo

O sistema aplica filtros de jurisdição baseados no papel (role) do utilizador e na sua área de atuação geográfica.

## Hierarquia de Jurisdição

```
PROVÍNCIA (Province) 
  └── DISTRITO/MUNICÍPIO (District)
      └── MERCADO (Market)
```

## Regras por Papel (Role)

### 1. **ADMIN / AUDITOR**
- **Jurisdição**: Nacional (sem restrições)

### 2. **FUNCIONARIO**
- **Jurisdição**: Província específica (`scope_province`)

### 3. **SUPERVISOR**  
- **Jurisdição**: Distrito específico (`scope_district`)


### 4. **MERCHANT** (Comerciante)
- **Jurisdição**: Mercado específico (`scope_market`)

### 5. **AGENTE**
- **Jurisdição**: Mercado específico (`scope_market`)


## Aplicação no Backend

### Endpoints Cobertos

#### ✅ `/transactions/` (Listagem)

```python
# SUPERVISOR: filtrado por distrito
query = query.where(MarketModel.district == current_user.scope_district)

# FUNCIONARIO: filtrado por província  
query = query.where(MarketModel.province == current_user.scope_province)
```

#### ✅ `/transactions/stats` (Cards KPI)

```python
# Mesma lógica aplicada aos agregados:
# - Total Cobrado Hoje
# - Total Cobrado Mês
# - Ticket Médio
# - Contagem de Transações
```

#### ✅ `/transactions/export` (Exportação CSV)

```python
# Exportação respeita jurisdição automaticamente
# pois usa os mesmos filtros de listagem
```

## Modelo de Dados

```
Transaction
  └── merchant_id → Merchant
                      └── market_id → Market
                                       ├── province    (e.g. "Maputo")
                                       └── district    (e.g. "KaMpfumo")
```

## Exemplo Prático

### Cenário: Supervisor em Distrito X

```
User: João (SUPERVISOR)
scope_district: "KaMpfumo"
```

**O que João vê:**

- ✅ Transações em Mercado A (KaMpfumo)
- ✅ Transações em Mercado B (KaMpfumo)  
- ❌ Transações em Mercado C (KaMaxaquene) - distrito diferente
- ❌ Transações em Mercado D (Boane) - distrito diferente

**Cards KPI do João:**

- Total Cobrado: Soma apenas de transações em KaMpfumo
- Ticket Médio: Calculado apenas com transações de KaMpfumo

## Segurança

A jurisdição é aplicada a **NÍVEL DE SQL** (WHERE clauses), garantindo:

- ✅ Impossível contornar via frontend
- ✅ Auditável (logs de acesso)
- ✅ Performance otimizada (índices em province/district)
