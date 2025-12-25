"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Market } from "@/types"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, MapPin, Loader2, Search, Store, Users } from "lucide-react"
import { CreateMarketDialog } from "@/components/forms/CreateMarketDialog"
import { EditMarketDialog } from "@/components/forms/EditMarketDialog"
import { StatusBadge } from "@/components/StatusBadge"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import Link from "next/link"
import { useAuth } from "@/lib/auth"

export default function MarketsPage() {
    const { user } = useAuth()
    const [markets, setMarkets] = useState<Market[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")

    // Check if user can create/edit markets (Admin and Funcionario only, NOT Supervisor)
    const canManageMarkets = user?.role && ['ADMIN', 'FUNCIONARIO'].includes(user.role)

    useEffect(() => {
        fetchMarkets()
    }, [])

    const fetchMarkets = async () => {
        setLoading(true)
        try {
            const res = await api.get("/markets/")
            setMarkets(res.data)
        } catch (error) {
            console.error("Error fetching markets:", error)
        } finally {
            setLoading(false)
        }
    }

    const filteredMarkets = markets.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.district?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            m.province?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'ALL' || m.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-6">
            <Header
                title="Mercados"
                subtitle="Gestão de locais de operação e performance"
            />

            <Card>
                <CardContent className="p-6">
                    {/* TOOLBAR */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-end">
                        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar por nome, município..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Status</SelectItem>
                                    <SelectItem value="ATIVO">Ativos</SelectItem>
                                    <SelectItem value="INATIVO">Inativos</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {canManageMarkets && (
                            <CreateMarketDialog onSuccess={fetchMarkets}>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                                    <Plus className="mr-2 h-4 w-4" /> Novo Mercado
                                </Button>
                            </CreateMarketDialog>
                        )}
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
                                        <TableHead>Nome / Local</TableHead>
                                        <TableHead className="text-center">Comerciantes</TableHead>
                                        <TableHead className="text-center">Agentes</TableHead>
                                        <TableHead className="text-center">Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredMarkets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                                Nenhum mercado encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMarkets.map((m) => (
                                            <TableRow key={m.id} className="group">
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-slate-900 flex items-center gap-2">
                                                            <MapPin className="h-3.5 w-3.5 text-emerald-500" />
                                                            {m.name}
                                                        </span>
                                                        <span className="text-xs text-slate-500 ml-5">
                                                            {m.district} • {m.province}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                                                        <Store className="h-3 w-3" />
                                                        {m.merchants_count || 0}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-medium">
                                                        <Users className="h-3 w-3" />
                                                        {m.agents_count || 0}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <div className="flex flex-col gap-1 items-center">
                                                        <Badge variant={m.status === "ATIVO" ? "success" : "secondary"}>
                                                            {m.status}
                                                        </Badge>
                                                        {(m as any).approval_status && (m as any).approval_status !== "APROVADO" && (
                                                            <StatusBadge status={(m as any).approval_status} showIcon={true} className="text-[10px] h-5" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-100 group-hover:opacity-100 transition-opacity">
                                                        <Link href={`/markets/${m.id}`}>
                                                            <Button variant="ghost" size="sm" className="h-8 text-slate-600">
                                                                Detalhes
                                                            </Button>
                                                        </Link>
                                                        {canManageMarkets && (
                                                            <EditMarketDialog market={m} onSuccess={fetchMarkets}>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600">
                                                                    <div className="sr-only">Editar</div>
                                                                    <svg
                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                        viewBox="0 0 24 24"
                                                                        fill="none"
                                                                        stroke="currentColor"
                                                                        strokeWidth="2"
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        className="h-4 w-4"
                                                                    >
                                                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                                                                    </svg>
                                                                </Button>
                                                            </EditMarketDialog>
                                                        )}
                                                    </div>
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
