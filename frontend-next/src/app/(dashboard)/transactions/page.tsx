"use client"

import { useEffect, useState, useMemo } from "react"
import api from "@/lib/api"
import { Transaction } from "@/types"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, Activity, ArrowRight, TrendingUp } from "lucide-react"
import { useRouter } from "next/navigation"
import { useLocations } from "@/hooks/useLocations"
import { useAuth } from "@/lib/auth"
import { NewPaymentDialog } from "@/components/features/payments/NewPaymentDialog"
import { useToast } from "@/components/ui/use-toast"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { TransactionFilters } from "@/components/features/transactions/TransactionFilters"

// Interfaces aligned with TransactionFilters
interface TransactionStats {
    total_collected_today: number;
    total_collected_month: number;
    transactions_count_today: number;
    ticket_average_month: number;
}

interface Market {
    id: number;
    name: string;
    province?: string;
    district?: string;
}

interface Agent {
    id: number;
    full_name: string;
    agent_code: string;
    assigned_market_id?: number;
}

interface POSDevice {
    id: number;
    serial_number: string;
    province?: string;
    assigned_agent_id?: number;
}

export default function TransactionsPage() {
    useDocumentTitle("transactions")

    const router = useRouter()
    const { toast } = useToast()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [stats, setStats] = useState<TransactionStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Dropdown data
    const [markets, setMarkets] = useState<Market[]>([])
    const [agents, setAgents] = useState<Agent[]>([])
    const [posDevices, setPosDevices] = useState<POSDevice[]>([])

    // Filters State
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [methodFilter, setMethodFilter] = useState("ALL")
    const [provinceFilter, setProvinceFilter] = useState("ALL")
    const [districtFilter, setDistrictFilter] = useState("")
    const [marketFilter, setMarketFilter] = useState("ALL")
    const [agentFilter, setAgentFilter] = useState("ALL")
    const [posFilter, setPosFilter] = useState("ALL")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    // Use locations hook for filters
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>("ALL")

    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId && selectedProvinceId !== "ALL" ? parseInt(selectedProvinceId) : undefined
    )

    const { user } = useAuth()
    const canPay = user?.role === "FUNCIONARIO"
    const canExport = ["ADMIN", "AUDITOR", "SUPERVISOR", "FUNCIONARIO"].includes(user?.role || "")

    // Calculate subtotals from filtered transactions (like Excel SUBTOTAL)
    const subtotals = useMemo(() => {
        const successTransactions = transactions.filter(t => t.status === "SUCESSO")
        const totalAmount = successTransactions.reduce((sum, t) => {
            const amt = typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount ?? 0)
            return sum + (isNaN(amt) ? 0 : amt)
        }, 0)
        const count = successTransactions.length
        const avgTicket = count > 0 ? totalAmount / count : 0

        return {
            totalAmount,
            count,
            avgTicket,
            totalTransactions: transactions.length
        }
    }, [transactions])

    const fetchDropdownData = async () => {
        try {
            const [marketsRes, agentsRes, posRes] = await Promise.allSettled([
                api.get("/markets/"),
                api.get("/agents/"),
                api.get("/pos-devices/")
            ])

            if (marketsRes.status === "fulfilled") setMarkets(marketsRes.value.data || [])
            if (agentsRes.status === "fulfilled") setAgents(agentsRes.value.data || [])
            if (posRes.status === "fulfilled") setPosDevices(posRes.value.data || [])
        } catch (e) {
            console.error("Failed to fetch dropdown data", e)
        }
    }

    const fetchStats = async () => {
        try {
            const res = await api.get("/transactions/stats")
            setStats(res.data)
        } catch (e) {
            console.error("Failed to fetch stats", e)
        }
    }

    const fetchData = () => {
        fetchStats()
        fetchTransactions()
        fetchDropdownData()
    }

    // Initial fetch only
    useEffect(() => {
        fetchData()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when filters change (Debounced)
    useEffect(() => {
        if (loading) return

        const timer = setTimeout(() => {
            fetchTransactions()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, statusFilter, methodFilter, provinceFilter, districtFilter, marketFilter, agentFilter, posFilter, startDate, endDate])

    const fetchTransactions = async () => {
        try {
            const params: Record<string, string> = {}
            if (searchTerm) params.search = searchTerm
            if (statusFilter !== "ALL") params.status = statusFilter
            if (methodFilter !== "ALL") params.payment_method = methodFilter
            if (provinceFilter !== "ALL") params.province = provinceFilter
            if (districtFilter) params.district = districtFilter
            if (marketFilter !== "ALL") params.market_id = marketFilter
            if (agentFilter !== "ALL") params.agent_id = agentFilter
            if (posFilter !== "ALL") params.pos_id = posFilter
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate

            const res = await api.get("/transactions/", { params })
            setTransactions(res.data)
        } catch (error) {
            console.error("Error fetching transactions:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleSuccessPayment = () => {
        fetchData()
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const params: Record<string, string> = {}
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate
            if (statusFilter !== "ALL") params.status = statusFilter
            if (methodFilter !== "ALL") params.payment_method = methodFilter
            if (provinceFilter !== "ALL") params.province = provinceFilter
            if (districtFilter) params.district = districtFilter
            if (marketFilter !== "ALL") params.market_id = marketFilter
            if (agentFilter !== "ALL") params.agent_id = agentFilter
            if (posFilter !== "ALL") params.pos_id = posFilter

            const response = await api.get("/transactions/export", {
                params,
                responseType: "blob",
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = url

            const contentDisposition = response.headers["content-disposition"]
            let filename = `transacoes_${new Date().toISOString().split('T')[0]}.csv`
            if (contentDisposition) {
                const match = contentDisposition.match(/filename=(.+)/)
                if (match) filename = match[1]
            }

            link.setAttribute("download", filename)
            document.body.appendChild(link)
            link.click()
            link.remove()

            toast({
                title: "✅ Exportação Concluída",
                description: `Transações exportadas com sucesso.`,
            })
        } catch (error) {
            console.error("Erro ao exportar:", error)
            toast({
                title: "Erro na Exportação",
                description: "Não foi possível exportar as transações. Tente novamente.",
                variant: "destructive",
            })
        } finally {
            setExporting(false)
        }
    }

    const clearFilters = () => {
        setSearchTerm("")
        setSelectedProvinceId("ALL")
        setProvinceFilter("ALL")
        setDistrictFilter("")
        setStatusFilter("ALL")
        setMethodFilter("ALL")
        setMarketFilter("ALL")
        setAgentFilter("ALL")
        setPosFilter("ALL")
        setStartDate("")
        setEndDate("")
    }

    const hasActiveFilters = searchTerm || statusFilter !== "ALL" || methodFilter !== "ALL" ||
        provinceFilter !== "ALL" || districtFilter || marketFilter !== "ALL" ||
        agentFilter !== "ALL" || posFilter !== "ALL" || startDate || endDate

    return (
        <div className="space-y-6">
            <Header
                title="Transações"
                subtitle="Histórico completo de cobranças e auditoria"
                actions={
                    canPay && (
                        <NewPaymentDialog onSuccess={handleSuccessPayment} />
                    )
                }
            />

            {/* DYNAMIC KPI STATS - Updates based on filtered data */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className={hasActiveFilters ? "ring-2 ring-emerald-200 bg-emerald-50/30" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {hasActiveFilters ? "Subtotal Filtrado" : "Cobrado Hoje"}
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(
                                hasActiveFilters ? subtotals.totalAmount : (stats?.total_collected_today || 0)
                            )}
                        </div>
                        {hasActiveFilters && (
                            <p className="text-xs text-muted-foreground mt-1">
                                Soma dos filtros aplicados
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card className={hasActiveFilters ? "ring-2 ring-blue-200 bg-blue-50/30" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {hasActiveFilters ? "Transações Filtradas" : "Transações Hoje"}
                        </CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {hasActiveFilters ? subtotals.count : (stats?.transactions_count_today || 0)}
                        </div>
                        {hasActiveFilters && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {subtotals.totalTransactions} total ({subtotals.count} sucessos)
                            </p>
                        )}
                    </CardContent>
                </Card>
                <Card className={hasActiveFilters ? "ring-2 ring-purple-200 bg-purple-50/30" : ""}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            {hasActiveFilters ? "Ticket Médio (Filtrado)" : "Ticket Médio (Mês)"}
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(
                                hasActiveFilters ? subtotals.avgTicket : (stats?.ticket_average_month || 0)
                            )}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Mês</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(stats?.total_collected_month || 0)}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* FILTER COMPONENT */}
            <TransactionFilters
                markets={markets}
                agents={agents}
                posDevices={posDevices}
                provinces={provinces}
                municipalities={municipalities}

                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}

                provinceFilter={provinceFilter}
                setProvinceFilter={(val) => {
                    setProvinceFilter(val)
                    setDistrictFilter("")
                    if (val === "ALL") {
                        setSelectedProvinceId("ALL")
                    } else {
                        const prov = provinces.find(p => p.name === val)
                        if (prov) setSelectedProvinceId(prov.id.toString())
                    }
                }}

                districtFilter={districtFilter}
                setDistrictFilter={setDistrictFilter}

                marketFilter={marketFilter}
                setMarketFilter={setMarketFilter}

                agentFilter={agentFilter}
                setAgentFilter={setAgentFilter}

                posFilter={posFilter}
                setPosFilter={setPosFilter}

                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}

                methodFilter={methodFilter}
                setMethodFilter={setMethodFilter}

                startDate={startDate}
                setStartDate={setStartDate}

                endDate={endDate}
                setEndDate={setEndDate}

                onRefresh={async () => {
                    setRefreshing(true)
                    await fetchTransactions()
                    setRefreshing(false)
                    toast({ title: "✅ Dados Atualizados", description: "Transações recarregadas com sucesso." })
                }}
                onExport={handleExport}
                onClear={clearFilters}

                loading={loading}
                refreshing={refreshing}
                exporting={exporting}
                canExport={canExport}
            />

            {/* RESULTS TABLE */}
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="pl-4">UUID</TableHead>
                                <TableHead>Valor</TableHead>
                                <TableHead>Comerciante</TableHead>
                                <TableHead>Agente</TableHead>
                                <TableHead>Mercado</TableHead>
                                <TableHead>Método</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Data</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {transactions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                        {loading ? "Carregando..." : "Nenhuma transação encontrada com os filtros atuais."}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                transactions.map((t) => (
                                    <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50 group" onClick={() => router.push(`/transactions/${t.transaction_uuid}`)}>
                                        <TableCell className="font-mono text-xs text-slate-500 pl-4">
                                            {t.transaction_uuid.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell className="font-bold">
                                            {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(typeof t.amount === 'string' ? parseFloat(t.amount) : (t.amount || 0))}
                                        </TableCell>
                                        <TableCell className="text-sm font-medium text-slate-700">
                                            {t.merchant?.full_name || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-sm text-slate-500">
                                            {t.agent?.agent_code || t.funcionario?.full_name || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {t.merchant?.market_name || "—"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs font-normal">{t.payment_method}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={t.status === "SUCESSO" ? "success" : t.status === "FALHOU" ? "destructive" : "secondary"}>
                                                {t.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {new Date(t.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
