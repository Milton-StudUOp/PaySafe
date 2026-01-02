"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { Agent, Transaction, Market, POSDevice } from "@/types"
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
    User,
    MapPin,
    Phone,
    CreditCard,
    ArrowLeft,
    Ban,
    Shield,
    Lock,
    Edit,
    History,
    Terminal,
    Trash2
} from "lucide-react"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { EditAgentDialog } from "@/components/forms/EditAgentDialog"
import { AssignPosDialog } from "@/components/forms/AssignPosDialog"
import { ResetPinDialog } from "@/components/forms/ResetPinDialog"

export default function AgentDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [agent, setAgent] = useState<Agent | null>(null)
    const [market, setMarket] = useState<Market | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            const resAgent = await api.get(`/agents/${id}`)
            const agentData = resAgent.data
            setAgent(agentData)

            // Parallel fetch for related data using Promise.allSettled
            const requests = [
                api.get(`/transactions/agent/${id}`),
                api.get(`/audit-logs/entity/AGENT/${id}`)
            ]
            if (agentData.assigned_market_id) {
                requests.push(api.get(`/markets/${agentData.assigned_market_id}`))
            } else {
                requests.push(Promise.resolve({ data: null } as any))
            }

            const results = await Promise.allSettled(requests)
            const [resTransac, resAudit, resMarket] = results

            // Transactions - optional
            if (resTransac.status === 'fulfilled') {
                setTransactions(Array.isArray(resTransac.value.data) ? resTransac.value.data : [])
            } else {
                console.warn("Could not load transactions:", resTransac.reason)
                setTransactions([])
            }

            // Audit logs - optional (403 for non-admin is expected)
            if (resAudit.status === 'fulfilled') {
                setAuditLogs(Array.isArray(resAudit.value.data) ? resAudit.value.data : [])
            } else {
                console.warn("Could not load audit logs:", resAudit.reason)
                setAuditLogs([])
            }

            // Market - optional
            if (resMarket.status === 'fulfilled') {
                setMarket(resMarket.value.data)
            } else {
                console.warn("Could not load market:", resMarket.reason)
                setMarket(null)
            }

            setError(null)
        } catch (err: unknown) {
            const errorMessage = err instanceof Error ? err.message : 'Erro desconhecido ao carregar agente'
            console.error("Error fetching agent details:", err)
            setError(errorMessage)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (newStatus: "ATIVO" | "SUSPENSO" | "INATIVO") => {
        if (!agent) return

        const observation = prompt(`Justifique a alteração de status para ${newStatus}:`)
        if (!observation || observation.trim().length === 0) {
            alert("Observação é obrigatória para alterar o status.")
            return
        }

        try {
            await api.put(`/agents/${agent.id}`, {
                status: newStatus,
                requester_notes: observation
            })
            setAgent({ ...agent, status: newStatus })
        } catch (err) {
            console.error("Error updating status:", err)
            alert("Erro ao atualizar status.")
        }
    }

    const handleUnassignPos = async (posId: number) => {
        if (!confirm("Tem certeza que deseja desvincular este POS?")) return
        try {
            await api.post(`/pos-devices/${posId}/unassign`)
            fetchData() // Refresh to update list
        } catch (err) {
            console.error("Error unassigning POS:", err)
            alert("Erro ao desvincular POS.")
        }
    }

    if (loading) {
        return <div className="p-8 flex justify-center text-emerald-500">Carregando detalhes...</div>
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="text-red-500 mb-4">Erro ao carregar agente: {error}</div>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        )
    }

    if (!agent) {
        return <div className="p-8 text-center">Agente não encontrado.</div>
    }

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{agent.full_name}</h1>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className="font-mono">{agent.agent_code}</Badge>
                        <Badge variant={agent.status === 'ATIVO' ? 'success' : 'destructive'}>{agent.status}</Badge>
                        <span className="text-sm text-slate-500">• ID: {agent.id}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <ResetPinDialog agentId={agent.id}>
                        <Button variant="outline" className="text-slate-600 bg-white">
                            <Lock className="mr-2 h-4 w-4" /> Resetar PIN
                        </Button>
                    </ResetPinDialog>

                    <EditAgentDialog agent={agent} onSuccess={fetchData}>
                        <Button variant="outline" className="text-slate-600 bg-white">
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </Button>
                    </EditAgentDialog>

                    {agent.status === 'ATIVO' ? (
                        <Button
                            variant="destructive"
                            className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-transparent shadow-none border"
                            onClick={() => handleStatusChange("SUSPENSO")}
                        >
                            <Ban className="mr-2 h-4 w-4" /> Suspender
                        </Button>
                    ) : (
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                            onClick={() => handleStatusChange("ATIVO")}
                        >
                            <Shield className="mr-2 h-4 w-4" /> Reativar
                        </Button>
                    )}
                </div>
            </div>

            {/* TABS */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-slate-100 p-1">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="pos">POS Atribuído</TabsTrigger>
                    <TabsTrigger value="stats">Estatísticas</TabsTrigger>
                    <TabsTrigger value="transactions">Transações</TabsTrigger>
                    <TabsTrigger value="audit">Auditoria</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* PERSONAL INFO */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dados Pessoais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<User />} label="Nome Completo" value={agent.full_name} />
                                <InfoRow icon={<Phone />} label="Telefone" value={agent.phone_number || "-"} />
                                <InfoRow icon={<CreditCard />} label="Código" value={agent.agent_code} />
                                <InfoRow icon={<History />} label="Último Login" value={agent.last_login_at ? new Date(agent.last_login_at).toLocaleString() : "Nunca"} />
                            </CardContent>
                        </Card>

                        {/* OPERATIONAL INFO */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dados Operacionais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<MapPin />} label="Mercado Base" value={market?.name || "Não atribuído"} />
                                <InfoRow icon={<MapPin />} label="Província" value={market?.province || "-"} />
                                <InfoRow icon={<MapPin />} label="Distrito" value={market?.district || "-"} />
                                <InfoRow icon={<Terminal />} label="Status da Conta" value={agent.status} />
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="pos" className="space-y-6">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Dispositivos POS</CardTitle>
                                <CardDescription>Gerencie os terminais vinculados a este agente.</CardDescription>
                            </div>
                            <AssignPosDialog agentId={agent.id} onSuccess={fetchData}>
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
                                    <Terminal className="mr-2 h-4 w-4" /> Atribuir Novo
                                </Button>
                            </AssignPosDialog>
                        </CardHeader>
                        <CardContent>
                            {!agent.pos_devices || agent.pos_devices.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed rounded-md bg-slate-50">
                                    <Terminal className="h-12 w-12 mb-4 opacity-50" />
                                    <p>Nenhum POS atribuído atualmente.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Serial Number</TableHead>
                                            <TableHead>Modelo</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead>Visto Por Último</TableHead>
                                            <TableHead className="text-right">Ações</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {(agent.pos_devices || []).map((pos) => (
                                            <TableRow key={pos.id}>
                                                <TableCell className="font-mono font-medium">{pos.serial_number || "-"}</TableCell>
                                                <TableCell>{pos.model || "Genérico"}</TableCell>
                                                <TableCell>
                                                    <Badge variant={pos.status === 'ATIVO' ? 'success' : 'outline'}>{pos.status || "UNKNOWN"}</Badge>
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm">
                                                    {pos.last_seen ? new Date(pos.last_seen).toLocaleString() : "Nunca"}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleUnassignPos(pos.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" /> Desvincular
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="stats">
                    <div className="grid gap-4 md:grid-cols-3 mb-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Cobrado Hoje</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(agent.total_collected_today || 0)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Cobrado este Mês</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900">{new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(agent.total_collected_month || 0)}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500">Transações Hoje</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-900 font-mono">
                                    {agent.transactions_count_today || 0}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="transactions">
                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>UUID</TableHead>
                                        <TableHead>Valor</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell className="font-mono text-xs text-slate-500">...{t.transaction_uuid?.slice(-8) || "N/A"}</TableCell>
                                            <TableCell className="font-bold text-slate-900">{parseFloat(String(t.amount || 0)).toFixed(2)} {t.currency || "MZN"}</TableCell>
                                            <TableCell className="text-sm">{t.payment_method || "-"}</TableCell>
                                            <TableCell className="text-sm text-slate-500">{t.created_at ? new Date(t.created_at).toLocaleString() : "-"}</TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={t.status === 'SUCESSO' ? 'success' : 'outline'}>{t.status || "UNKNOWN"}</Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {transactions.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma transação registrada por este agente.</TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="audit">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Auditoria</CardTitle>
                            <CardDescription>Registro de todas as alterações e ações relativas a este agente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Ator</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead className="text-right">IP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum registro de auditoria encontrado.</TableCell>
                                        </TableRow>
                                    ) : (
                                        auditLogs.map((log: any) => (
                                            <TableRow key={log.id}>
                                                <TableCell className="text-slate-500 text-xs">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-sm">{log.actor_name}</span>
                                                        <span className="text-xs text-slate-400">{log.actor_role}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                                                </TableCell>
                                                <TableCell className="text-sm max-w-md truncate" title={log.description}>
                                                    {log.description}
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-slate-400 font-mono">
                                                    {log.ip_address || "-"}
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
        </div>
    )
}

function InfoRow({ icon, label, value }: { icon: any, label: string, value: string }) {
    return (
        <div className="flex items-start gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors">
            <div className="mt-0.5 text-slate-400 h-5 w-5 [&>svg]:h-5 [&>svg]:w-5">
                {icon}
            </div>
            <div>
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="text-sm text-slate-900 font-medium">{value}</p>
            </div>
        </div>
    )
}
