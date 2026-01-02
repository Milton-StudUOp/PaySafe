"use client"

import { useMemo } from "react"
import { Search, Filter, X, Calendar as CalendarIcon, Download, RefreshCw, MapPin, Store, Users, Smartphone, CreditCard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { cn } from "@/lib/utils"

// Interfaces
interface Market { id: number; name: string; province?: string; district?: string }
interface Agent { id: number; full_name: string; agent_code: string; assigned_market_id?: number; }
interface POSDevice { id: number; serial_number: string; province?: string; assigned_agent_id?: number; }

interface TransactionFiltersProps {
    markets: Market[]
    agents: Agent[]
    posDevices: POSDevice[]
    provinces: { id: number; name: string }[]
    municipalities: { id: number; name: string }[]

    searchTerm: string
    setSearchTerm: (v: string) => void

    provinceFilter: string
    setProvinceFilter: (v: string) => void

    districtFilter: string
    setDistrictFilter: (v: string) => void

    marketFilter: string
    setMarketFilter: (v: string) => void

    agentFilter: string
    setAgentFilter: (v: string) => void

    posFilter: string
    setPosFilter: (v: string) => void

    statusFilter: string
    setStatusFilter: (v: string) => void

    methodFilter: string
    setMethodFilter: (v: string) => void

    startDate: string
    setStartDate: (v: string) => void

    endDate: string
    setEndDate: (v: string) => void

    onRefresh: () => void
    onExport: () => void
    onClear: () => void

    loading: boolean
    refreshing: boolean
    exporting: boolean
    canExport: boolean
}

export function TransactionFilters({
    markets, agents, posDevices, provinces, municipalities,
    searchTerm, setSearchTerm,
    provinceFilter, setProvinceFilter,
    districtFilter, setDistrictFilter,
    marketFilter, setMarketFilter,
    agentFilter, setAgentFilter,
    posFilter, setPosFilter,
    statusFilter, setStatusFilter,
    methodFilter, setMethodFilter,
    startDate, setStartDate,
    endDate, setEndDate,
    onRefresh, onExport, onClear,
    loading, refreshing, exporting, canExport
}: TransactionFiltersProps) {

    // 1. Build Lookup Maps for Relational Filtering
    const marketMap = useMemo(() => new Map(markets.map(m => [m.id, m])), [markets])
    const agentMap = useMemo(() => new Map(agents.map(a => [a.id, a])), [agents])

    // 2. Filter Logic (Robusta e Relacional)

    // Filtered Markets
    const filteredMarkets = useMemo(() => {
        if (provinceFilter === "ALL") return markets
        return markets.filter(m => m.province === provinceFilter)
    }, [markets, provinceFilter])

    // Filtered Agents
    const filteredAgents = useMemo(() => {
        let result = agents

        if (provinceFilter !== "ALL") {
            result = result.filter(a => {
                if (!a.assigned_market_id) return false
                const market = marketMap.get(a.assigned_market_id)
                return market?.province === provinceFilter
            })
        }

        if (marketFilter !== "ALL") {
            result = result.filter(a => a.assigned_market_id?.toString() === marketFilter)
        }

        return result
    }, [agents, provinceFilter, marketFilter, marketMap])

    // Filtered POS
    const filteredPOS = useMemo(() => {
        let result = posDevices

        if (provinceFilter !== "ALL") {
            result = result.filter(p => {
                if (p.province === provinceFilter) return true
                if (p.assigned_agent_id) {
                    const agent = agentMap.get(p.assigned_agent_id)
                    if (agent?.assigned_market_id) {
                        const market = marketMap.get(agent.assigned_market_id)
                        return market?.province === provinceFilter
                    }
                }
                return false
            })
        }

        if (marketFilter !== "ALL") {
            result = result.filter(p => {
                if (!p.assigned_agent_id) return false
                const agent = agentMap.get(p.assigned_agent_id)
                return agent?.assigned_market_id?.toString() === marketFilter
            })
        }

        if (agentFilter !== "ALL") {
            result = result.filter(p => p.assigned_agent_id?.toString() === agentFilter)
        }

        return result
    }, [posDevices, provinceFilter, marketFilter, agentFilter, agentMap, marketMap])

    const activeFiltersCount = [
        provinceFilter !== "ALL",
        districtFilter !== "",
        marketFilter !== "ALL",
        agentFilter !== "ALL",
        posFilter !== "ALL",
        statusFilter !== "ALL",
        methodFilter !== "ALL",
        startDate !== "",
        endDate !== ""
    ].filter(Boolean).length

    // Options for SearchableSelect components
    const provinceOptions = provinces.map(p => ({ label: p.name, value: p.name }))
    const municipalityOptions = municipalities.map(m => ({ label: m.name, value: m.name }))
    const marketOptions = filteredMarkets.map(m => ({ label: m.name, value: m.id.toString() }))
    const agentOptions = filteredAgents.map(a => ({ label: `${a.agent_code} - ${a.full_name}`, value: a.id.toString() }))
    const posOptions = filteredPOS.map(p => ({ label: p.serial_number, value: p.id.toString() }))

    return (
        <div className="space-y-4">
            {/* Top Bar: Search + Primary Actions */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-1 rounded-lg">
                <div className="relative w-full md:max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por UUID, Referência..."
                        className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-emerald-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm">
                        <CalendarIcon className="h-4 w-4 text-slate-500" />
                        <input
                            type="date"
                            className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 w-28 text-xs"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                        />
                        <span className="text-slate-300">|</span>
                        <input
                            type="date"
                            className="bg-transparent border-none focus:ring-0 p-0 text-slate-700 w-28 text-xs"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-1 ml-auto">
                        {canExport && (
                            <Button variant="outline" size="icon" onClick={onExport} disabled={exporting} title="Exportar CSV">
                                <Download className={cn("h-4 w-4", exporting && "animate-bounce")} />
                            </Button>
                        )}
                        <Button
                            variant="default"
                            size="sm"
                            onClick={onRefresh}
                            disabled={refreshing || loading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5", refreshing && "animate-spin")} />
                            <span className="hidden sm:inline">Atualizar</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Filter Pills / Advanced Filters */}
            <div className="bg-white border rounded-lg p-4 shadow-sm space-y-4">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtros Avançados
                        {activeFiltersCount > 0 && (
                            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 h-5 px-1.5">
                                {activeFiltersCount} ativos
                            </Badge>
                        )}
                    </h3>
                    {activeFiltersCount > 0 && (
                        <Button variant="ghost" size="sm" onClick={onClear} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2 text-xs">
                            <X className="h-3 w-3 mr-1" />
                            Limpar tudo
                        </Button>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Location Group */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> Localização
                        </label>

                        <SearchableSelect
                            options={provinceOptions}
                            value={provinceFilter}
                            onChange={setProvinceFilter}
                            placeholder="Todas Províncias"
                            searchPlaceholder="Buscar província..."
                        />

                        <SearchableSelect
                            options={municipalityOptions}
                            value={districtFilter || "ALL"}
                            onChange={(val) => setDistrictFilter(val === "ALL" ? "" : val)}
                            placeholder="Todos Municípios"
                            searchPlaceholder="Buscar município..."
                            disabled={!provinceFilter || provinceFilter === "ALL" || municipalities.length === 0}
                            icon={MapPin}
                        />

                        <SearchableSelect
                            options={marketOptions}
                            value={marketFilter}
                            onChange={(val) => {
                                setMarketFilter(val)
                                setAgentFilter("ALL")
                                setPosFilter("ALL")
                            }}
                            placeholder="Todos Mercados"
                            searchPlaceholder="Buscar mercado..."
                            icon={Store}
                            disabled={filteredMarkets.length === 0 && provinceFilter !== "ALL"}
                        />
                    </div>

                    {/* Entity Group */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <Users className="h-3 w-3" /> Entidades
                        </label>

                        <SearchableSelect
                            options={agentOptions}
                            value={agentFilter}
                            onChange={(val) => {
                                setAgentFilter(val)
                                setPosFilter("ALL")
                            }}
                            placeholder="Todos Agentes"
                            searchPlaceholder="Código ou nome..."
                            icon={Users}
                            disabled={filteredAgents.length === 0 && marketFilter !== "ALL"}
                        />

                        <SearchableSelect
                            options={posOptions}
                            value={posFilter}
                            onChange={setPosFilter}
                            placeholder="Todos POS"
                            searchPlaceholder="Serial number..."
                            icon={Smartphone}
                            disabled={filteredPOS.length === 0 && agentFilter !== "ALL"}
                        />
                    </div>

                    {/* Transaction Type Group */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <CreditCard className="h-3 w-3" /> Detalhes
                        </label>
                        <Select value={methodFilter} onValueChange={setMethodFilter}>
                            <SelectTrigger className="bg-white border-slate-200">
                                <SelectValue placeholder="Método Pagamento" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Métodos</SelectItem>
                                <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                                <SelectItem value="MPESA">M-Pesa</SelectItem>
                                <SelectItem value="EMOLA">e-Mola</SelectItem>
                                <SelectItem value="MKESH">mKesh</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className={cn("bg-white border-slate-200",
                                statusFilter === "SUCESSO" && "text-emerald-600 font-medium bg-emerald-50 border-emerald-200",
                                statusFilter === "FALHOU" && "text-red-600 font-medium bg-red-50 border-red-200"
                            )}>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Status</SelectItem>
                                <SelectItem value="SUCESSO">✅ Sucesso</SelectItem>
                                <SelectItem value="PENDENTE">⏳ Pendente</SelectItem>
                                <SelectItem value="FALHOU">❌ Falhou</SelectItem>
                                <SelectItem value="CANCELADO">🚫 Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    )
}
