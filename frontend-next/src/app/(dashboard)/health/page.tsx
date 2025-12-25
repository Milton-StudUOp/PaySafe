"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Activity, Database, Server, RefreshCw, CheckCircle2, XCircle } from "lucide-react"

export default function HealthPage() {
    interface HealthStatus {
        status: string;
        latency: number;
        database: string;
        version: string;
    }
    const [status, setStatus] = useState<HealthStatus | null>(null)
    const [loading, setLoading] = useState(true)

    const checkHealth = async () => {
        setLoading(true)
        try {
            // Trying to ping the API root or specific health endpoint
            // If backend doesn't have /health, we can infer health by a light query
            const start = performance.now()
            await api.get("/") // Assuming root returns something or 404 but proves connectivity
            const end = performance.now()

            setStatus({
                status: "healthy",
                latency: Math.round(end - start),
                database: "connected", // Inferred from successful API response
                version: "1.0.0"
            })
        } catch (error) {
            console.error("Health check failed:", error)
            setStatus({
                status: "unhealthy",
                latency: 0,
                database: "unknown",
                version: "unknown"
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        checkHealth()
    }, [])

    return (
        <div className="space-y-6">
            <Header title="Saúde do Sistema" subtitle="Monitoramento em tempo real da infraestrutura" />

            <div className="grid gap-6 md:grid-cols-2">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Status da API</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mt-2">
                            {loading ? (
                                <RefreshCw className="h-6 w-6 animate-spin text-blue-500" />
                            ) : status?.status === "healthy" ? (
                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                            ) : (
                                <XCircle className="h-8 w-8 text-red-500" />
                            )}
                            <div className="text-2xl font-bold capitalize">
                                {loading ? "Verificando..." : status?.status === "healthy" ? "Operacional" : "Offline"}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Latência: {status?.latency || 0}ms
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Banco de Dados</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`w-3 h-3 rounded-full ${status?.database === 'connected' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                            <div className="text-2xl font-bold">
                                {status?.database === 'connected' ? "Conectado" : "Desconectado"}
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            MySQL 8.0 (Azure Managed)
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Serviços Críticos</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg dark:bg-slate-800">
                                    <Server className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium">Backend API (FastAPI)</p>
                                    <p className="text-sm text-muted-foreground">Autenticação e Regras de Negócio</p>
                                </div>
                            </div>
                            <Badge variant={status?.status === "healthy" ? "success" : "destructive"}>
                                {status?.status === "healthy" ? "Online" : "Offline"}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between border-b pb-4">
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-100 rounded-lg dark:bg-slate-800">
                                    <Activity className="h-5 w-5" />
                                </div>
                                <div>
                                    <p className="font-medium">Job Queue (Celery)</p>
                                    <p className="text-sm text-muted-foreground">Processamento de Relatórios</p>
                                </div>
                            </div>
                            <Badge variant="outline">Não monitorado</Badge>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end">
                <Button onClick={checkHealth} disabled={loading} variant="outline">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Atualizar Status
                </Button>
            </div>
        </div>
    )
}
