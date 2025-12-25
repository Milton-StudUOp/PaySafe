"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Search, ArrowRight, FileText, Download } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { useToast } from "@/components/ui/use-toast"

interface AuditLog {
    id: number;
    actor_type?: string;
    actor_id?: number;
    actor_name?: string;
    action?: string;
    entity?: string;
    entity_id?: number;
    entity_name?: string;
    description?: string;
    ip_address?: string;
    created_at: string;
    severity?: string;
    event_type?: string;
}

export default function AuditPage() {
    const router = useRouter()
    const { toast } = useToast()
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [loading, setLoading] = useState(true)
    const [exporting, setExporting] = useState(false)

    // Filters
    const [searchTerm, setSearchTerm] = useState("")
    const [entityFilter, setEntityFilter] = useState("ALL")
    const [severityFilter, setSeverityFilter] = useState("ALL")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    useEffect(() => {
        fetchLogs()
    }, [])

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchLogs()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, entityFilter, severityFilter, startDate, endDate])

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const params: any = {}
            if (searchTerm) params.search = searchTerm
            if (entityFilter !== "ALL") params.entity = entityFilter
            if (severityFilter !== "ALL") params.severity = severityFilter
            if (startDate) params.start_date = new Date(startDate).toISOString()
            if (endDate) params.end_date = new Date(endDate).toISOString()

            const res = await api.get("/audit-logs/", { params })
            setLogs(res.data || [])
        } catch (error) {
            console.error("Erro ao buscar logs:", error)
            setLogs([])
        } finally {
            setLoading(false)
        }
    }

    const getSeverityBadge = (severity?: string) => {
        switch (severity) {
            case "CRITICAL": return <Badge variant="destructive">Crítico</Badge>
            case "HIGH": return <Badge className="bg-orange-500">Alta</Badge>
            case "MEDIUM": return <Badge className="bg-yellow-500">Média</Badge>
            case "LOW": return <Badge variant="secondary">Baixa</Badge>
            default: return <Badge variant="outline">Info</Badge>
        }
    }

    const translateAction = (action?: string) => {
        const map: Record<string, string> = {
            "LOGIN_SUCCESS": "Login Bem Sucedido",
            "LOGIN_FAILED": "Login Falhado",
            "CREATE_MERCHANT": "Comerciante Criado",
            "UPDATE_MERCHANT": "Comerciante Atualizado",
            "DELETE_MERCHANT": "Comerciante Removido",
            "CREATE_AGENT": "Agente Criado",
            "UPDATE_AGENT": "Agente Atualizado",
            "DELETE_AGENT": "Agente Removido",
            "CREATE_POS": "POS Criado",
            "UPDATE_POS": "POS Atualizado",
            "DELETE_POS": "POS Removido",
            "CREATE_MARKET": "Mercado Criado",
            "UPDATE_MARKET": "Mercado Atualizado",
            "DELETE_MARKET": "Mercado Removido",
            "REQUEST_JURISDICTION_CHANGE": "Mudança de Jurisdição",
            "ASSIGN_POS": "POS Atribuído",
            "UNASSIGN_POS": "POS Desatribuído",
            "ROTATE_KEY": "Chave Rotacionada",
            "BLOCK_POS": "POS Bloqueado",
            "UNBLOCK_POS": "POS Desbloqueado",
        }
        return action ? (map[action] || action) : "—"
    }

    const translateEntity = (entity?: string) => {
        const map: Record<string, string> = {
            "MERCHANT": "Comerciante",
            "AGENT": "Agente",
            "POS": "Dispositivo POS",
            "MARKET": "Mercado",
            "USER": "Utilizador",
            "TRANSACTION": "Transação",
            "SYSTEM": "Sistema",
        }
        return entity ? (map[entity] || entity) : "—"
    }

    const handleExport = async () => {
        setExporting(true)
        try {
            const params: any = {}
            if (searchTerm) params.search = searchTerm
            if (entityFilter !== "ALL") params.entity = entityFilter
            if (severityFilter !== "ALL") params.severity = severityFilter
            if (startDate) params.start_date = new Date(startDate).toISOString()
            if (endDate) params.end_date = new Date(endDate).toISOString()

            const response = await api.get("/audit-logs/export", {
                params,
                responseType: "blob",
            })

            const url = window.URL.createObjectURL(new Blob([response.data]))
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `auditoria_${new Date().toISOString().split('T')[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            link.remove()

            toast({
                title: "✅ Exportação Concluída",
                description: "Os dados foram exportados com sucesso.",
            })
        } catch (error) {
            console.error("Erro ao exportar:", error)
            toast({
                title: "Erro na Exportação",
                description: "Não foi possível exportar os dados. Tente novamente.",
                variant: "destructive",
            })
        } finally {
            setExporting(false)
        }
    }

    return (
        <div className="space-y-6">
            <Header
                title="Logs de Auditoria"
                subtitle="Histórico completo de ações do sistema"
            />

            <Card>
                <CardContent className="p-6">
                    {/* Filtros */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Pesquisar por descrição, IP, nome..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <Select value={entityFilter} onValueChange={setEntityFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Entidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas Entidades</SelectItem>
                                <SelectItem value="MERCHANT">Comerciante</SelectItem>
                                <SelectItem value="AGENT">Agente</SelectItem>
                                <SelectItem value="POS">Dispositivo POS</SelectItem>
                                <SelectItem value="MARKET">Mercado</SelectItem>
                                <SelectItem value="USER">Utilizador</SelectItem>
                            </SelectContent>
                        </Select>

                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                            <SelectTrigger className="w-full md:w-48">
                                <SelectValue placeholder="Severidade" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">Todas</SelectItem>
                                <SelectItem value="CRITICAL">Crítico</SelectItem>
                                <SelectItem value="HIGH">Alta</SelectItem>
                                <SelectItem value="MEDIUM">Média</SelectItem>
                                <SelectItem value="LOW">Baixa</SelectItem>
                                <SelectItem value="INFO">Info</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex items-center gap-2">
                            <Input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-auto"
                            />
                            <span className="text-muted-foreground">-</span>
                            <Input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-auto"
                            />
                        </div>

                        <Button
                            variant="outline"
                            onClick={handleExport}
                            className="shrink-0"
                            disabled={exporting}
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            {exporting ? "Exportando..." : "Exportar"}
                        </Button>
                    </div>

                    {/* Tabela */}
                    {loading ? (
                        <TableSkeleton columnCount={7} rowCount={8} />
                    ) : (
                        <div className="rounded-md border overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[160px]">Data/Hora</TableHead>
                                        <TableHead className="w-[90px]">Severidade</TableHead>
                                        <TableHead>Utilizador</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Entidade</TableHead>
                                        <TableHead className="w-[30%]">Descrição</TableHead>
                                        <TableHead className="w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {logs.map((log) => (
                                        <TableRow
                                            key={log.id}
                                            className="cursor-pointer hover:bg-slate-50 group"
                                            onClick={() => router.push(`/audit/${log.id}`)}
                                        >
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                                                {new Date(log.created_at).toLocaleString('pt-PT')}
                                            </TableCell>
                                            <TableCell>
                                                {getSeverityBadge(log.severity)}
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium text-sm">{log.actor_name || log.actor_type || "—"}</span>
                                            </TableCell>
                                            <TableCell>
                                                <span className="text-sm">{translateAction(log.action)}</span>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-medium">{log.entity_name || translateEntity(log.entity)}</span>
                                                    <div className="flex gap-1 text-xs text-muted-foreground">
                                                        <span>{translateEntity(log.entity)}</span>
                                                        {log.entity_id && <span>#{log.entity_id}</span>}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-600">
                                                <div className="line-clamp-2" title={log.description}>
                                                    {log.description || "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <ArrowRight className="h-4 w-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {logs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                <FileText className="h-8 w-8 text-slate-200 mx-auto mb-2" />
                                                <p>Nenhum registo encontrado</p>
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
