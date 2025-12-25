"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Agent, Market } from "@/types"
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
import { Plus, Search, Loader2, Download, Eye, MapPin } from "lucide-react"
import { Input } from "@/components/ui/input"
import { CreateAgentDialog } from "@/components/forms/CreateAgentDialog"
import { StatusBadge } from "@/components/StatusBadge"
import Link from "next/link"

export default function AgentsPage() {
    console.log("Agents Page Loaded v2")
    const [agents, setAgents] = useState<Agent[]>([])
    const [markets, setMarkets] = useState<Market[]>([])
    const [loading, setLoading] = useState(true)

    // Filters
    const [search, setSearch] = useState("")
    const [marketFilter, setMarketFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [provinceFilter, setProvinceFilter] = useState("ALL")
    const [districtFilter, setDistrictFilter] = useState("")

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timer)
    }, [provinceFilter, districtFilter])

    const fetchData = async () => {
        setLoading(true)
        try {
            const params: any = {}
            if (provinceFilter !== "ALL") params.province = provinceFilter
            if (districtFilter) params.district = districtFilter

            const [resAgents, resMarkets] = await Promise.all([
                api.get("/agents/", { params }),
                api.get("/markets/")
            ])
            setAgents(resAgents.data)
            setMarkets(resMarkets.data)
        } catch (error) {
            console.error("Error fetching data:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredAgents = agents.filter((a: Agent) => {
        const searchLower = search.toLowerCase()
        const matchesSearch =
            a.full_name.toLowerCase().includes(searchLower) ||
            a.agent_code.toLowerCase().includes(searchLower) ||
            a.phone_number?.includes(searchLower)

        if (!matchesSearch) return false

        if (marketFilter !== "ALL" && a.assigned_market_id?.toString() !== marketFilter) return false
        if (statusFilter !== "ALL" && a.status !== statusFilter) return false

        return true
    })

    const getMarketName = (id?: number) => {
        if (!id) return "N/A"
        return markets.find(m => m.id === id)?.name || `ID: ${id}`
    }

    return (
        <div className="space-y-6">
            <Header
                title="Agentes"
                subtitle="Gestão da equipe de campo"
                actions={
                    <CreateAgentDialog onSuccess={fetchData}>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20">
                            <Plus className="mr-2 h-4 w-4" /> Novo Agente
                        </Button>
                    </CreateAgentDialog>
                }
            />

            <Card className="border-none shadow-sm ring-1 ring-slate-200">
                <CardContent className="p-6">
                    {/* FILTERS */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
                        <div className="md:col-span-5 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Buscar por Nome, Código ou Celular..."
                                className="pl-9 bg-slate-50 border-slate-200 focus:bg-white transition-colors"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>

                        <div className="md:col-span-3 relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                type="search"
                                placeholder="Buscar Código/Nome..."
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
                                <option value="ALL">Todos Mercados</option>
                                {markets.map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="md:col-span-1">
                            <select
                                className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">Status</option>
                                <option value="ATIVO">Ativo</option>
                                <option value="INATIVO">Inativo</option>
                                <option value="SUSPENSO">Suspenso</option>
                            </select>
                        </div>

                        <div className="md:col-span-2 flex justify-end gap-2">
                            <Button variant="ghost" className="text-slate-500 px-2" onClick={() => {
                                setSearch("")
                                setProvinceFilter("ALL")
                                setDistrictFilter("")
                                setMarketFilter("ALL")
                                setStatusFilter("ALL")
                            }}>
                                Limpar
                            </Button>
                            <Button variant="outline" className="text-slate-600 px-3">
                                <Download className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Código</TableHead>
                                        <TableHead>Agente</TableHead>
                                        <TableHead>Contato</TableHead>
                                        <TableHead>Mercado / Região</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Cobrado Hoje</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAgents.map((agent) => (
                                        <TableRow key={agent.id} className="hover:bg-slate-50/50">
                                            <TableCell className="font-mono font-medium text-emerald-700">{agent.agent_code}</TableCell>
                                            <TableCell className="font-medium text-slate-900">{agent.full_name}</TableCell>
                                            <TableCell className="text-slate-500 text-sm">{agent.phone_number || "-"}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col text-sm">
                                                    <span className="font-medium text-slate-700">{getMarketName(agent.assigned_market_id)}</span>
                                                    {agent.assigned_region && (
                                                        <span className="text-xs text-slate-400 flex items-center mt-0.5">
                                                            <MapPin className="h-3 w-3 mr-1" /> {agent.assigned_region}
                                                        </span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col gap-1 items-start">
                                                    <Badge variant={agent.status === "ATIVO" ? "success" : "secondary"}>
                                                        {agent.status}
                                                    </Badge>
                                                    {(agent as any).approval_status && (agent as any).approval_status !== "APROVADO" && (
                                                        <StatusBadge status={(agent as any).approval_status} showIcon={true} className="text-[10px] h-5" />
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-slate-600 font-medium">
                                                {/* Placeholder for real stats */}
                                                {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(agent.total_collected_today || 0)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/agents/${agent.id}`}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-emerald-600">
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredAgents.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                Nenhum agente encontrado com os filtros selecionados.
                                            </TableCell>
                                        </TableRow>
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
