"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Transaction } from "@/types"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Loader2, DollarSign, CreditCard, Activity, ArrowRight, Download, Calendar, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useLocations } from "@/hooks/useLocations"
import { useAuth } from "@/lib/auth"
import { NewPaymentDialog } from "@/components/features/payments/NewPaymentDialog"
import { useToast } from "@/components/ui/use-toast"

interface TransactionStats {
    total_collected_today: number;
    total_collected_month: number;
    transactions_count_today: number;
    ticket_average_month: number;
}

export default function TransactionsPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [stats, setStats] = useState<TransactionStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)
    const [refreshing, setRefreshing] = useState(false)

    // Filters
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [methodFilter, setMethodFilter] = useState("ALL")
    const [provinceFilter, setProvinceFilter] = useState("ALL")
    const [districtFilter, setDistrictFilter] = useState("")
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

    const handleProvinceChange = (val: string) => {
        setSelectedProvinceId(val)
        setProvinceFilter(val === "ALL" ? "ALL" : getProvinceNameById(val) || "")
        setDistrictFilter("")
    }

    const handleDistrictChange = (val: string) => {
        setDistrictFilter(val === "ALL" ? "" : val)
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
    }

    // Initial fetch only (no auto-polling - user triggers refresh manually)
    useEffect(() => {
        fetchData()
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Re-fetch when filters change (Debounced)
    useEffect(() => {
        // We skip the first run to avoid double fetching with the polling/initial effect, 
        // but explicit filter changes should trigger immediate (debounced) update.
        if (loading) return // specific guard might be needed or just let it race (simplest)

        const timer = setTimeout(() => {
            fetchTransactions()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, statusFilter, methodFilter, provinceFilter, districtFilter, startDate, endDate])

    const fetchTransactions = async () => {
        // setLoading(true) // Don't show full loading spinner on background poll/refresh to avoid flickering
        try {
            const params: Record<string, string> = {}
            if (searchTerm) params.search = searchTerm
            if (statusFilter !== "ALL") params.status = statusFilter
            if (methodFilter !== "ALL") params.payment_method = methodFilter
            if (provinceFilter !== "ALL") params.province = provinceFilter
            if (districtFilter) params.district = districtFilter
            if (startDate) params.start_date = startDate
            if (endDate) params.end_date = endDate

            const res = await api.get("/transactions/", { params })
            setTransactions(res.data)
        } catch (error) {
            console.error("Error fetching transactions:", error)
            // Do NOT clear transactions on error to avoid flashing empty table during polling failures
            // setTransactions([]) 
        } finally {
            setLoading(false)
        }
    }

    const handleSuccessPayment = () => {
        fetchData()
        // Force immediate refresh
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

            const response = await api.get("/transactions/export", {
                params,
                responseType: "blob",
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = url

            // Extract filename from header or generate one
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

            {/* KPI STATS */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cobrado Hoje</CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(stats?.total_collected_today || 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Transações Hoje</CardTitle>
                        <Activity className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats?.transactions_count_today || 0}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Ticket Médio (Mês)</CardTitle>
                        <nav className="h-4 w-4 text-orange-600" />
                        {/* nav is not icon, assume simpler icon or just empty */}
                        <CreditCard className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(stats?.ticket_average_month || 0)}
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

            <Card>
                <CardContent className="p-6">
                    {/* FILTERS */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 flex-wrap">
                        <div className="relative w-full md:w-56">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar UUID..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        {/* PROVINCE FILTER */}
                        <Select value={selectedProvinceId} onValueChange={handleProvinceChange}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Todas Províncias" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas Províncias</SelectItem>
                                {provinces.map(p => (
                                    <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* DISTRICT FILTER */}
                        <Select
                            value={districtFilter || "ALL"}
                            onValueChange={handleDistrictChange}
                            disabled={selectedProvinceId === "ALL" || loadingMunicipalities}
                        >
                            <SelectTrigger className="w-full md:w-[150px]">
                                <SelectValue placeholder={
                                    selectedProvinceId === "ALL"
                                        ? "Selecione Província"
                                        : loadingMunicipalities
                                            ? "Carregando..."
                                            : "Todos Municípios"
                                } />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Municípios</SelectItem>
                                {municipalities.map(m => (
                                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Status</SelectItem>
                                <SelectItem value="SUCESSO">Sucesso</SelectItem>
                                <SelectItem value="FALHOU">Falhou</SelectItem>
                                <SelectItem value="CANCELADO">Cancelado</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={methodFilter} onValueChange={setMethodFilter}>
                            <SelectTrigger className="w-full md:w-[150px]">
                                <SelectValue placeholder="Método" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todos Métodos</SelectItem>
                                <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                                <SelectItem value="MPESA">M-Pesa</SelectItem>
                                <SelectItem value="EMOLA">e-Mola</SelectItem>
                                <SelectItem value="MKESH">mKesh</SelectItem>
                            </SelectContent>
                        </Select>

                        <Button variant="ghost" className="text-slate-500" onClick={() => {
                            setSearchTerm("")
                            setProvinceFilter("ALL")
                            setDistrictFilter("")
                            setStatusFilter("ALL")
                            setMethodFilter("ALL")
                            setStartDate("")
                            setEndDate("")
                        }}>
                            Limpar
                        </Button>
                    </div>

                    {/* DATE RANGE & EXPORT FILTERS - Second row */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 items-center flex-wrap border-t pt-4 mt-2">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Período:</span>
                        </div>
                        <Input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-auto"
                            placeholder="Data início"
                        />
                        <span className="text-muted-foreground">-</span>
                        <Input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-auto"
                            placeholder="Data fim"
                        />

                        {canExport && (
                            <Button
                                variant="outline"
                                onClick={handleExport}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                {exporting ? "Exportando..." : "Exportar CSV"}
                            </Button>
                        )}

                        {/* CONSULTAR / REFRESH BUTTON */}
                        <Button
                            onClick={async () => {
                                setRefreshing(true)
                                await fetchTransactions()
                                setRefreshing(false)
                                toast({ title: "✅ Dados Atualizados", description: "Transações recarregadas com sucesso." })
                            }}
                            disabled={refreshing || loading}
                            className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                            {refreshing ? "Consultando..." : "Consultar"}
                        </Button>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>UUID</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Comerciante</TableHead>
                                        <TableHead>Agente</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                Nenhuma transação encontrada.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        transactions.map((t) => (
                                            <TableRow key={t.id} className="cursor-pointer hover:bg-slate-50 group" onClick={() => router.push(`/transactions/${t.transaction_uuid}`)}>
                                                <TableCell className="font-mono text-xs text-slate-500">
                                                    {t.transaction_uuid.substring(0, 8)}...
                                                </TableCell>
                                                <TableCell className="font-bold">
                                                    {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(t.amount)}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {t.merchant?.full_name || "N/A"}
                                                </TableCell>
                                                <TableCell className="text-sm">
                                                    {t.agent?.agent_code || t.funcionario?.full_name || "N/A"}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-xs">{t.payment_method}</Badge>
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
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
