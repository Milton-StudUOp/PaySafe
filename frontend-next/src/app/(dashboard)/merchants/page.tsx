"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Merchant, Market } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Plus, Search, Loader2, Download, Calendar as CalendarIcon, MoreHorizontal, Eye } from "lucide-react"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import { Input } from "@/components/ui/input"
import { CreateMerchantDialog } from "@/components/forms/CreateMerchantDialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StatusBadge } from "@/components/StatusBadge"
import Link from "next/link"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { useAuth } from "@/lib/auth"

export default function MerchantsPage() {
    const [merchants, setMerchants] = useState<Merchant[]>([])
    const [markets, setMarkets] = useState<Market[]>([])
    const [loading, setLoading] = useState(true)
    const { toast } = useToast()
    const { user } = useAuth()

    // Filters
    const [search, setSearch] = useState("")
    const [activeTab, setActiveTab] = useState("ALL")
    const [marketFilter, setMarketFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [paymentStatusFilter, setPaymentStatusFilter] = useState("ALL")
    const [provinceFilter, setProvinceFilter] = useState("ALL")
    const [districtFilter, setDistrictFilter] = useState("")



    // State for billing date dialog
    const [editingDateMerchant, setEditingDateMerchant] = useState<Merchant | null>(null)
    const [newStartDate, setNewStartDate] = useState("")
    const [updatingDate, setUpdatingDate] = useState(false)

    const openDateDialog = (merchant: Merchant) => {
        setEditingDateMerchant(merchant)
        const initialDate = merchant.billing_start_date
            ? merchant.billing_start_date.toString()
            : (merchant.registered_at ? new Date(merchant.registered_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0])

        setNewStartDate(initialDate)
    }

    const handleUpdateDate = async () => {
        if (!editingDateMerchant || !newStartDate) return

        try {
            setUpdatingDate(true)
            await api.put(`/merchant-fees/${editingDateMerchant.id}/billing-date`, {
                start_date: newStartDate
            })

            toast({
                title: "Sucesso",
                description: `Data de início de cobrança atualizada.`,
                variant: "success",
                className: "bg-green-50 border-green-200 text-green-800"
            })

            setEditingDateMerchant(null)
            fetchMerchantsData()
        } catch (error) {
            console.error(error)
            toast({
                title: "Erro",
                description: "Falha ao atualizar data.",
                variant: "destructive"
            })
        } finally {
            setUpdatingDate(false)
        }
    }

    const fetchMerchantsData = async () => {
        setLoading(true)
        try {
            const params: any = {}
            if (provinceFilter !== "ALL") params.province = provinceFilter
            if (districtFilter) params.district = districtFilter

            const [resMerchants, resMarkets] = await Promise.all([
                api.get("/merchants/", { params }),
                api.get("/markets/")
            ])
            setMerchants(resMerchants.data)
            setMarkets(resMarkets.data)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMerchantsData()
        }, 500)
        return () => clearTimeout(timer)
    }, [provinceFilter, districtFilter])

    const filteredMerchants = merchants.filter((m: Merchant) => {
        // Tab Filter
        if (activeTab !== "ALL" && m.merchant_type !== activeTab) return false

        // Search Filter
        const searchLower = search.toLowerCase()
        const matchesSearch =
            m.full_name.toLowerCase().includes(searchLower) ||
            m.phone_number?.includes(searchLower) ||
            m.nfc_uid?.toLowerCase().includes(searchLower) ||
            m.id.toString().includes(searchLower)

        if (!matchesSearch) return false

        // Market Filter
        if (marketFilter !== "ALL" && m.market_id?.toString() !== marketFilter) return false

        // Status Filter
        if (statusFilter !== "ALL" && m.status !== statusFilter) return false

        // Payment Status Filter
        if (paymentStatusFilter !== "ALL" && m.payment_status !== paymentStatusFilter) return false

        return true
    })

    const getStatusColor = (status: string) => {
        switch (status) {
            case "ATIVO": return "success";
            case "SUSPENSO": return "destructive";
            case "BLOQUEADO": return "destructive";
            case "INATIVO": return "secondary";
            default: return "secondary";
        }
    }

    const handleExportCSV = () => {
        if (!filteredMerchants || filteredMerchants.length === 0) return;

        const headers = ["ID", "Nome", "Nome Comercial", "Tipo", "Mercado", "Telefone", "UID/Doc", "Status"];
        const csvContent = [
            headers.join(","),
            ...filteredMerchants.map((row: Merchant) => {
                const marketName = markets.find(m => m.id === row.market_id)?.name || row.market_id || "-";
                return [
                    row.id,
                    `"${row.full_name}"`,
                    `"${row.business_name || ''}"`,
                    `"${row.merchant_type}"`,
                    `"${marketName}"`,
                    `"${row.phone_number || ''}"`,
                    `"${row.nfc_uid || row.id_document_number || ''}"`,
                    `"${row.status}"`
                ].join(",")
            })
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `merchants_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <Header
                title="Comerciantes"
                subtitle="Gestão completa de comerciantes fixos e ambulantes"
                actions={
                    <CreateMerchantDialog onSuccess={fetchMerchantsData}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20">
                            <Plus className="mr-2 h-4 w-4" /> Novo Comerciante
                        </Button>
                    </CreateMerchantDialog>
                }
            />

            <Card className="border-none shadow-sm ring-1 ring-slate-200">
                <CardContent className="p-6">

                    {/* --- TABS & FILTERS --- */}
                    <Tabs defaultValue="ALL" onValueChange={setActiveTab} className="mb-6">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <TabsList>
                                <TabsTrigger value="ALL">Todos</TabsTrigger>
                                <TabsTrigger value="FIXO">Fixos</TabsTrigger>
                                <TabsTrigger value="AMBULANTE">Ambulantes</TabsTrigger>
                            </TabsList>

                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-9" onClick={handleExportCSV}>
                                    <Download className="mr-2 h-4 w-4" /> Exportar CSV
                                </Button>
                            </div>
                        </div>
                    </Tabs>

                    {/* --- SEARCH & ADVANCED FILTERS --- */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                        <div className="md:col-span-3 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Buscar Nome/Doc..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        {/* PROVINCE FILTER */}
                        <div className="md:col-span-2">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={provinceFilter}
                                onChange={(e) => setProvinceFilter(e.target.value)}
                            >
                                <option value="ALL">Todas Províncias</option>
                                <option value="Maputo">Maputo</option>
                                <option value="Matola">Matola</option>
                                <option value="Gaza">Gaza</option>
                                <option value="Inhambane">Inhambane</option>
                                <option value="Sofala">Sofala</option>
                                <option value="Manica">Manica</option>
                                <option value="Tete">Tete</option>
                                <option value="Zambézia">Zambézia</option>
                                <option value="Nampula">Nampula</option>
                                <option value="Niassa">Niassa</option>
                                <option value="Cabo Delgado">Cabo Delgado</option>
                            </select>
                        </div>

                        {/* DISTRICT FILTER */}
                        <div className="md:col-span-2">
                            <Input
                                placeholder="Município..."
                                className="bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={districtFilter}
                                onChange={(e) => setDistrictFilter(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={marketFilter}
                                onChange={(e) => setMarketFilter(e.target.value)}
                            >
                                <option value="ALL">Todas Mercados</option>
                                {markets.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-2">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Todos Status</option>
                                <option value="ATIVO">Ativo</option>
                                <option value="SUSPENSO">Suspenso</option>
                                <option value="BLOQUEADO">Bloqueado</option>
                                <option value="INATIVO">Inativo</option>
                            </select>
                        </div>

                        {/* PAYMENT STATUS FILTER */}
                        <div className="md:col-span-1">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={paymentStatusFilter}
                                onChange={(e) => setPaymentStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Pagamento</option>
                                <option value="REGULAR">Regular</option>
                                <option value="IRREGULAR">Irregular</option>
                            </select>
                        </div>

                        <div className="flex justify-end">
                            <Button variant="ghost" className="text-slate-500 p-2" onClick={() => {
                                setSearch("")
                                setMarketFilter("ALL")
                                setStatusFilter("ALL")
                                setPaymentStatusFilter("ALL")
                                setProvinceFilter("ALL")
                                setDistrictFilter("")
                                setActiveTab("ALL")
                            }}>
                                Limpar
                            </Button>
                        </div>
                    </div>

                    {/* --- TABLE --- */}
                    {loading ? (
                        <TableSkeleton columnCount={9} rowCount={10} />
                    ) : (
                        <div className="rounded-md border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[80px]">ID</TableHead>
                                        <TableHead>Comerciante</TableHead>
                                        <TableHead>Nome Comercial</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Mercado</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>UID / Doc</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Pagamento</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMerchants.map((merchant: Merchant) => (
                                        <TableRow key={merchant.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-mono text-xs text-slate-500">#{merchant.id}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-900">{merchant.full_name}</span>
                                                    <span className="text-xs text-slate-500">{merchant.business_type || "Não informado"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {merchant.business_name || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={merchant.merchant_type === 'FIXO' ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}>
                                                    {merchant.merchant_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                {markets.find(m => m.id === merchant.market_id)?.name || merchant.market_id || "N/A"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span>{merchant.phone_number || "-"}</span>
                                                    {merchant.mobile_operator && (
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">{merchant.mobile_operator}</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-slate-500">
                                                {merchant.nfc_uid || merchant.id_document_number || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge variant={getStatusColor(merchant.status)}>
                                                        {merchant.status}
                                                    </Badge>
                                                    {(merchant as any).approval_status && (merchant as any).approval_status !== "APROVADO" && (
                                                        <StatusBadge status={(merchant as any).approval_status} showIcon={true} className="text-[10px] h-5" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {merchant.payment_status === "IRREGULAR" ? (
                                                    <div className="flex flex-col items-start">
                                                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                                                            Irregular
                                                        </Badge>
                                                        <span className="text-[10px] text-red-500 font-medium">
                                                            {(Number(merchant.overdue_balance) > 0
                                                                ? Number(merchant.overdue_balance)
                                                                : (merchant.days_overdue || 0) * 10
                                                            ).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })} em atraso
                                                        </span>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-start">
                                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                            Regular
                                                        </Badge>
                                                        {(Number(merchant.credit_balance) > 0) && (
                                                            <span className="text-[10px] text-emerald-600 font-medium">
                                                                +{Number(merchant.credit_balance).toLocaleString('pt-MZ', { style: 'currency', currency: 'MZN' })}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-slate-700">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <Link href={`/merchants/${merchant.id}`}>
                                                            <DropdownMenuItem>
                                                                <Eye className="mr-2 h-4 w-4" />
                                                                Ver Detalhes
                                                            </DropdownMenuItem>
                                                        </Link>


                                                        {user?.role === "ADMIN" && (
                                                            <DropdownMenuItem onClick={() => openDateDialog(merchant)}>
                                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                                <span>Alterar Início Cobrança</span>
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredMerchants.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                <div className="flex flex-col items-center gap-2">
                                                    <Search className="h-8 w-8 opacity-20" />
                                                    <p>Nenhum comerciante encontrado com os filtros atuais.</p>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>



            <Dialog open={!!editingDateMerchant} onOpenChange={(open) => !open && setEditingDateMerchant(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Alterar Início de Cobrança</DialogTitle>
                        <DialogDescription>
                            Defina a data a partir da qual as taxas diárias (10 MT) começam a ser calculadas para <b>{editingDateMerchant?.full_name}</b>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="flex flex-col items-center justify-center gap-2">
                            <Label htmlFor="startDate" className="text-sm font-medium text-slate-700">Início da Cobrança</Label>
                            <Input
                                id="startDate"
                                type="date"
                                className="w-[150px] text-center border-slate-300 bg-white shadow-sm focus:border-emerald-500 focus:ring-emerald-500/20 rounded-md"
                                value={newStartDate}
                                onChange={(e) => setNewStartDate(e.target.value)}
                            />
                        </div>
                        <p className="text-sm text-slate-500 text-center px-8">
                            Taxas anteriores a esta data serão ignoradas.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingDateMerchant(null)} className="border-slate-200 text-slate-700 hover:bg-slate-50">Cancelar</Button>
                        <Button
                            onClick={handleUpdateDate}
                            disabled={updatingDate}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        >
                            {updatingDate && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
