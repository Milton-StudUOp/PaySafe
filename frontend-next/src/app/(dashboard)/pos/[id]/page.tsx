"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { POSDevice, Agent, Transaction } from "@/types"
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
    MonitorSmartphone,
    ArrowLeft,
    Lock,
    Unlock,
    Activity,
    User,
    Wifi,
    Edit
} from "lucide-react"
import { EditPosDialog } from "@/components/forms/EditPosDialog"

export default function POSDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [pos, setPos] = useState<POSDevice | null>(null)
    const [agent, setAgent] = useState<Agent | null>(null)
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)



    useEffect(() => {
        if (id) {
            fetchData()
        }
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/pos-devices/${id}`)
            setPos(res.data)

            // Parallel fetch for related data using Promise.allSettled
            const requests = [
                api.get(`/transactions?pos_id=${id}`),
                api.get(`/audit-logs/entity/POS/${id}`)
            ]

            if (res.data.assigned_agent_id) {
                requests.push(api.get(`/agents/${res.data.assigned_agent_id}`))
            } else {
                requests.push(Promise.resolve({ data: null } as any))
            }

            const results = await Promise.allSettled(requests)
            const [resTransac, resAudit, resAgent] = results

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

            // Agent - optional
            if (resAgent.status === 'fulfilled') {
                setAgent(resAgent.value.data)
            } else {
                console.warn("Could not load agent:", resAgent.reason)
                setAgent(null)
            }

        } catch (error) {
            console.error("Error fetching POS details:", error)
        } finally {
            setLoading(false)
        }
    }



    const handleToggleBlock = async () => {
        if (!pos) return
        const newStatus = pos.status === 'BLOQUEADO' ? 'ATIVO' : 'BLOQUEADO'
        const actionLabel = newStatus === 'BLOQUEADO' ? 'BLOQUEAR' : 'DESBLOQUEAR'

        const observation = prompt(`Justifique a ação de ${actionLabel} este dispositivo:`)
        if (!observation || observation.trim().length === 0) {
            alert("Observação é obrigatória para alterar o status.")
            return
        }

        try {
            await api.put(`/pos-devices/${id}`, {
                status: newStatus,
                requester_notes: observation
            })
            fetchData()
        } catch (error) {
            alert("Erro ao alterar status.")
            console.error(error)
        }
    }

    if (loading) {
        return <div className="p-8 flex justify-center text-emerald-500">Carregando dispositivo...</div>
    }

    if (!pos) {
        return <div className="p-8 text-center">Dispositivo não encontrado.</div>
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
                        <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">{pos.serial_number}</h1>
                        <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                            <MonitorSmartphone className="h-3.5 w-3.5" />
                            <span>{pos.model}</span>
                            <span className="text-slate-300">•</span>
                            <Badge variant={pos.status === 'ATIVO' ? 'success' : pos.status === 'BLOQUEADO' ? 'destructive' : 'secondary'}>
                                {pos.status}
                            </Badge>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2">
                    <EditPosDialog pos={pos} onSuccess={fetchData}>
                        <Button variant="outline" className="text-slate-600 bg-white">
                            <Edit className="mr-2 h-4 w-4" /> Editar
                        </Button>
                    </EditPosDialog>



                    <Button
                        variant={pos.status === 'BLOQUEADO' ? "default" : "destructive"}
                        onClick={handleToggleBlock}
                    >
                        {pos.status === 'BLOQUEADO' ? (
                            <> <Unlock className="mr-2 h-4 w-4" /> Desbloquear </>
                        ) : (
                            <> <Lock className="mr-2 h-4 w-4" /> Bloquear </>
                        )}
                    </Button>
                </div>
            </div>



            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* INFO CARD */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Informações Técnicas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between py-2 border-b text-sm">
                            <span className="text-muted-foreground">Última Conexão</span>
                            <div className="flex items-center gap-1 font-medium">
                                <Wifi className="h-3 w-3 text-emerald-500" />
                                {pos.last_seen ? new Date(pos.last_seen).toLocaleString() : "Nunca"}
                            </div>
                        </div>
                        <div className="flex justify-between py-2 border-b text-sm">
                            <span className="text-muted-foreground">ID do Sistema</span>
                            <span className="font-mono">{pos.id}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-sm">
                            <span className="text-muted-foreground">Província</span>
                            <span className="font-medium">{pos.province || "-"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-sm">
                            <span className="text-muted-foreground">Município</span>
                            <span className="font-medium">{pos.district || "-"}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b text-sm">
                            <span className="text-muted-foreground">Registrado em</span>
                            <span>{new Date(pos.created_at || new Date()).toLocaleDateString()}</span>
                        </div>
                    </CardContent>
                </Card>

                {/* AGENT CARD */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Agente Associado</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {agent ? (
                            <div className="flex flex-col items-center text-center py-2">
                                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-3">
                                    <User className="h-6 w-6" />
                                </div>
                                <h3 className="font-bold">{agent.full_name}</h3>
                                <p className="text-sm text-muted-foreground">{agent.agent_code}</p>
                                <Button variant="link" size="sm" onClick={() => router.push(`/agents/${agent.id}`)}>
                                    Ver Perfil
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                                <User className="h-8 w-8 mb-2 opacity-20" />
                                <p>Nenhum agente atribuído</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* STATS CARD */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Performance Hoje</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Total Cobrado</span>
                            <span className="text-xl font-bold text-emerald-600">
                                {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(pos.total_collected_today || 0)}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-sm text-muted-foreground">Transações</span>
                            <span className="text-lg font-medium">{pos.transactions_count_today || 0}</span>
                        </div>
                        <div className="pt-4 border-t mt-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-muted-foreground">Acumulado Mês</span>
                                <span className="font-medium">
                                    {new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(pos.total_collected_month || 0)}
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Tabs defaultValue="transactions" className="w-full">
                <TabsList>
                    <TabsTrigger value="transactions">Últimas Transações</TabsTrigger>
                    <TabsTrigger value="audit">Auditoria (Log de Eventos)</TabsTrigger>
                </TabsList>
                <TabsContent value="transactions" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-4 py-3">UUID</th>
                                            <th className="px-4 py-3">Valor</th>
                                            <th className="px-4 py-3">Agente</th>
                                            <th className="px-4 py-3">Data</th>
                                            <th className="px-4 py-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {transactions.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                                                    Nenhuma transação registrada neste POS.
                                                </td>
                                            </tr>
                                        ) : (
                                            transactions.map((t) => (
                                                <tr key={t.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-xs text-slate-500">...{t.transaction_uuid?.slice(-8) || "N/A"}</td>
                                                    <td className="px-4 py-3 font-bold">{Number(t.amount || 0).toFixed(2)} {t.currency || "MZN"}</td>
                                                    <td className="px-4 py-3">{t.agent?.agent_code || "-"}</td>
                                                    <td className="px-4 py-3 text-slate-500">{new Date(t.created_at).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-right">
                                                        <Badge variant={t.status === 'SUCESSO' ? 'success' : 'outline'}>{t.status}</Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="audit" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Segurança</CardTitle>
                            <CardDescription>Registro de bloqueios, alterações e eventos de segurança.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="rounded-md border">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-slate-50 text-slate-500 font-medium border-b">
                                        <tr>
                                            <th className="px-4 py-3">Data/Hora</th>
                                            <th className="px-4 py-3">Ator</th>
                                            <th className="px-4 py-3">Ação</th>
                                            <th className="px-4 py-3">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y">
                                        {auditLogs.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                                                    Nenhum registro de auditoria encontrado.
                                                </td>
                                            </tr>
                                        ) : (
                                            auditLogs.map((log: any) => (
                                                <tr key={log.id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-medium">{log.actor_name}</span>
                                                            <span className="text-xs text-slate-400">{log.actor_role}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.description}>{log.description}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
