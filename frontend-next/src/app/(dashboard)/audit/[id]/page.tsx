"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Database, Activity, MapPin, Clock, Globe } from "lucide-react"

interface AuditLog {
    id: number;
    actor_type?: string;
    actor_id?: number;
    action?: string;
    entity?: string;
    entity_id?: number;
    description?: string;
    ip_address?: string;
    user_agent?: string;
    request_method?: string;
    request_path?: string;
    actor_name?: string;
    actor_role?: string;
    actor_province?: string;
    actor_district?: string;
    before_data?: any;
    after_data?: any;
    severity?: string;
    event_type?: string;
    created_at: string;
}

export default function AuditDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [log, setLog] = useState<AuditLog | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/audit-logs/${id}`)
            setLog(res.data)
        } catch (error) {
            console.error("Erro ao carregar log:", error)
        } finally {
            setLoading(false)
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

    const getSeverityBadge = (severity?: string) => {
        switch (severity) {
            case "CRITICAL": return <Badge variant="destructive">Crítico</Badge>
            case "HIGH": return <Badge className="bg-orange-500">Alta</Badge>
            case "MEDIUM": return <Badge className="bg-yellow-500">Média</Badge>
            case "LOW": return <Badge variant="secondary">Baixa</Badge>
            default: return <Badge variant="outline">Info</Badge>
        }
    }

    if (loading) return <div className="p-8 flex justify-center text-emerald-500">A carregar...</div>
    if (!log) return <div className="p-8 text-center">Registo não encontrado.</div>

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        Registo de Auditoria <span className="text-slate-400 font-mono text-base">#{log.id}</span>
                    </h1>
                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-4">
                        <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {new Date(log.created_at).toLocaleString('pt-PT')}
                        </span>
                        {getSeverityBadge(log.severity)}
                    </div>
                </div>
            </div>

            {/* Cards Principais */}
            <div className="grid gap-6 md:grid-cols-3">
                {/* QUEM */}
                <Card className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <User className="h-4 w-4" /> Quem
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold mb-1">{log.actor_name || log.actor_type || "—"}</div>
                        <div className="text-sm text-muted-foreground">{log.actor_role || "—"}</div>
                        {log.actor_id && (
                            <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded inline-block mt-2">
                                ID: {log.actor_id}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* O QUÊ */}
                <Card className="border-l-4 border-l-purple-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Activity className="h-4 w-4" /> O Quê
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Badge className="mb-2 text-lg px-3 py-1 bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">
                            {translateAction(log.action)}
                        </Badge>
                        <p className="text-sm text-slate-600 mt-2">{log.description || "—"}</p>
                    </CardContent>
                </Card>

                {/* ONDE */}
                <Card className="border-l-4 border-l-emerald-500">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                            <Database className="h-4 w-4" /> Entidade Afetada
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold">{translateEntity(log.entity)}</div>
                        {log.entity_id && (
                            <div className="text-sm font-mono bg-slate-100 px-2 py-1 rounded inline-block mt-1">
                                ID: {log.entity_id}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Origem */}
            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Globe className="h-4 w-4 text-slate-500" /> Origem da Requisição
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground text-xs uppercase">Endereço IP</span>
                                <div className="font-mono text-slate-700">{log.ip_address || "—"}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs uppercase">Método</span>
                                <div className="font-mono text-slate-700">{log.request_method || "—"}</div>
                            </div>
                            <div className="col-span-2">
                                <span className="text-muted-foreground text-xs uppercase">Navegador</span>
                                <div className="text-xs text-slate-500 truncate" title={log.user_agent}>{log.user_agent || "—"}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-slate-500" /> Localização do Ator
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground text-xs uppercase">Província</span>
                                <div className="font-medium text-slate-700">{log.actor_province || "—"}</div>
                            </div>
                            <div>
                                <span className="text-muted-foreground text-xs uppercase">Distrito</span>
                                <div className="font-medium text-slate-700">{log.actor_district || "—"}</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Alteração de Dados */}
            {(log.before_data || log.after_data) && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-slate-500" /> Alteração de Dados
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid md:grid-cols-2 gap-0 border rounded-md overflow-hidden">
                            <div className="bg-red-50 p-4 border-r">
                                <h4 className="font-semibold text-xs text-red-600 uppercase mb-2">Antes</h4>
                                {log.before_data ? (
                                    <pre className="text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
                                        {JSON.stringify(log.before_data, null, 2)}
                                    </pre>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Sem dados anteriores</span>
                                )}
                            </div>
                            <div className="bg-emerald-50 p-4">
                                <h4 className="font-semibold text-xs text-emerald-600 uppercase mb-2">Depois</h4>
                                {log.after_data ? (
                                    <pre className="text-xs font-mono text-slate-800 overflow-x-auto whitespace-pre-wrap">
                                        {JSON.stringify(log.after_data, null, 2)}
                                    </pre>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Sem dados novos</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
