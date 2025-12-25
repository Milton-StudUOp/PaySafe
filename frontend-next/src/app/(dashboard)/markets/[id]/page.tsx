"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { Market, Merchant, Agent, POSDevice } from "@/types"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    MapPin,
    ArrowLeft,
    Store,
    Users,
    Terminal,
    DollarSign,
    MoreVertical,
    Calendar,
    MonitorSmartphone,
    Info
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { EditMarketDialog } from "@/components/forms/EditMarketDialog"
import { CreateMerchantDialog } from "@/components/forms/CreateMerchantDialog"
import { CreatePosDialog } from "@/components/forms/CreatePosDialog"
import { MarketRevenueChart } from "@/components/features/markets/MarketRevenueChart"

export default function MarketDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [market, setMarket] = useState<Market | null>(null)
    const [merchants, setMerchants] = useState<Merchant[]>([])
    const [agents, setAgents] = useState<Agent[]>([])
    const [posDevices, setPosDevices] = useState<POSDevice[]>([])
    const [loading, setLoading] = useState(true)

    // Note: In a real app, we would paginate these lists or fetch them only when tab is clicked.
    // For now, we will fetch standard lists and filter client-side (or simple backend queries if endpoints existed)
    // The backend's 'get_market' returns stats, but not the full lists of sub-entities. 
    // We should probably add specific endpoints or just use the main list endpoints with filters.
    // "GET /merchants/?market_id=X" is ideal.
    // Since we don't have explicit filter params in the basic list endpoints yet, we might need to rely on what we have.
    // Actually, `list_merchants` is basic. 
    // HACK: I will fetch all and filter client side for this demo, OR add strict filters to backend quickly? 
    // Backend `list_merchants` takes skip/limit. It doesn't filter.
    // I already updated backend `get_market` to return STATS.
    // For proper functionality, I should add `get_market_merchants` to backend?
    // Let's rely on the lists for now or just fetch all (MVP). 
    // Ideally, for the "Comerciantes" tab, we want a list. 
    // I will simulate it by fetching all merchants and agent and filtering.

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [resMarket, resMerchants, resAgents] = await Promise.all([
                api.get(`/markets/${id}`),
                api.get(`/merchants/`), // Potentially heavy, ideally filter by query param
                api.get(`/agents/`)
            ])

            setMarket(resMarket.data)

            // Client-side filtering (Not scalable but functional for MVP)
            const allMerchants: Merchant[] = resMerchants.data
            setMerchants(allMerchants.filter(m => m.market_id === Number(id)))

            const allAgents: Agent[] = resAgents.data
            setAgents(allAgents.filter(a => a.assigned_market_id === Number(id)))

            // Fetch POS devices (filtering by market location)
            const resPos = await api.get('/pos-devices/')
            const allPos: POSDevice[] = resPos.data
            // Filter POS that are in the same district/province as the market
            const marketData = resMarket.data
            setPosDevices(allPos.filter(p =>
                p.district === marketData.district &&
                p.province === marketData.province
            ))

        } catch (error) {
            console.error("Error fetching market details:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="p-8 flex justify-center text-emerald-500">Carregando detalhes...</div>
    }

    if (!market) {
        return <div className="p-8 text-center">Mercado não encontrado.</div>
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{market.name}</h1>
                        <div className="flex items-center gap-2 mt-1 flex-wrap text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5" />
                                {market.district}, {market.province}
                            </span>
                            <span className="text-slate-300">•</span>
                            <Badge variant={market.status === 'ATIVO' ? 'success' : 'secondary'}>{market.status}</Badge>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <EditMarketDialog market={market} onSuccess={fetchData} />
                </div>
            </div>

            {/* TABS */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="merchants">Comerciantes</TabsTrigger>
                    <TabsTrigger value="agents">Agentes</TabsTrigger>
                    <TabsTrigger value="pos">Terminais POS</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    {/* STATS CARDS */}
                    <div className="grid gap-4 md:grid-cols-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Balanço do Dia</CardTitle>
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(market.total_collected_today || 0)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Balanço do Mês</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(market.total_collected_month || 0)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Comerciantes</CardTitle>
                                <Store className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{market.merchants_count || 0}</div>
                                <p className="text-xs text-muted-foreground">{market.active_merchants_count || 0} ativos</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Equipe de Campo</CardTitle>
                                <Users className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{market.agents_count || 0}</div>
                                <p className="text-xs text-muted-foreground">Agentes atribuídos</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <Card className="h-[300px]">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Info className="h-4 w-4" /> Informações do Mercado
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-sm text-slate-500">ID do Sistema</span>
                                    <span className="font-mono text-sm">{market.id}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-sm text-slate-500">Província</span>
                                    <span className="text-sm font-medium">{market.province}</span>
                                </div>
                                <div className="flex justify-between border-b pb-2">
                                    <span className="text-sm text-slate-500">Distrito/Município</span>
                                    <span className="text-sm font-medium">{market.district || "-"}</span>
                                </div>
                                <div className="flex justify-between pb-2">
                                    <span className="text-sm text-slate-500">Registrado em</span>
                                    <span className="text-sm">{market.created_at ? new Date(market.created_at).toLocaleDateString() : "-"}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="h-[300px]">
                            <CardHeader>
                                <CardTitle>Desempenho da Semana</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[240px] w-full">
                                <MarketRevenueChart marketId={Number(id)} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="merchants">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Comerciantes Registrados</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {merchants.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                Nenhum comerciante neste mercado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        merchants.map(m => (
                                            <TableRow key={m.id}>
                                                <TableCell className="font-medium">{m.full_name}</TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">{m.merchant_type}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm">{m.phone_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant={m.status === 'ATIVO' ? 'success' : 'secondary'}>{m.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/merchants/${m.id}`)}>
                                                        Ver
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="agents">
                    <Card>
                        <CardHeader>
                            <CardTitle>Agentes Atribuídos</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Nome</TableHead>
                                        <TableHead>Telefone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {agents.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                Nenhum agente atribuído a este mercado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        agents.map(a => (
                                            <TableRow key={a.id}>
                                                <TableCell className="font-mono">{a.agent_code}</TableCell>
                                                <TableCell className="font-medium">{a.full_name}</TableCell>
                                                <TableCell>{a.phone_number}</TableCell>
                                                <TableCell>
                                                    <Badge variant={a.status === 'ATIVO' ? 'success' : 'secondary'}>{a.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/agents/${a.id}`)}>
                                                        Ver
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="pos">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Terminais POS</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Serial</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {posDevices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                Nenhum POS ativo neste mercado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        posDevices.map(p => (
                                            <TableRow key={p.id}>
                                                <TableCell className="font-mono">{p.serial_number}</TableCell>
                                                <TableCell>{p.model}</TableCell>
                                                <TableCell>
                                                    <Badge variant={p.status === 'ATIVO' ? 'success' : 'secondary'}>{p.status}</Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="sm" onClick={() => router.push(`/pos/${p.id}`)}>
                                                        Ver
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div >
    )
}
