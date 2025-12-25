"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { User } from "@/types"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    CardDescription
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    ArrowLeft,
    Shield,
    Lock,
    Power,
    History,
    User as UserIcon,
    Mail,
    Phone
} from "lucide-react"
import { ResetPasswordDialog } from "@/components/forms/ResetPasswordDialog"
import { EditUserDialog } from "@/components/forms/EditUserDialog"

export default function UserDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [user, setUser] = useState<User | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) fetchData()
    }, [id])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/users/${id}`)
            setUser(res.data)
        } catch (error) {
            console.error("Error fetching user:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleToggleBlock = async () => {
        if (!user) return
        const action = user.status === 'SUSPENSO' ? 'activate' : 'block'
        const confirmMsg = action === 'block'
            ? "Deseja SUSPENDER este usuário? Ele perderá acesso imediato."
            : "Deseja REATIVAR este usuário?"

        if (!confirm(confirmMsg)) return

        try {
            await api.post(`/users/${id}/${action}`)
            fetchData()
        } catch (error) {
            alert("Erro ao alterar status.")
        }
    }

    if (loading) return <div className="p-8 flex justify-center text-emerald-500">Carregando...</div>
    if (!user) return <div className="p-8 text-center">Usuário não encontrado.</div>

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="shrink-0">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-xl font-bold tracking-tight text-slate-900">
                                {user.full_name}
                            </h1>
                            <Badge variant={user.status === 'ATIVO' ? 'success' : user.status === 'SUSPENSO' ? 'destructive' : 'secondary'}>
                                {user.status}
                            </Badge>
                            <Badge variant="outline">{user.role}</Badge>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                            {user.email} • Último login: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Nunca'}
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <EditUserDialog user={user} onSuccess={fetchData}>
                        <Button variant="outline">
                            <UserIcon className="mr-2 h-4 w-4" /> Editar
                        </Button>
                    </EditUserDialog>

                    <ResetPasswordDialog userId={user.id} userName={user.full_name}>
                        <Button variant="outline">
                            <Lock className="mr-2 h-4 w-4" /> Resetar Senha
                        </Button>
                    </ResetPasswordDialog>

                    <Button
                        variant={user.status === 'SUSPENSO' ? 'default' : 'destructive'}
                        onClick={handleToggleBlock}
                    >
                        <Power className="mr-2 h-4 w-4" />
                        {user.status === 'SUSPENSO' ? 'Reativar Conta' : 'Suspender Conta'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="audit">Auditoria & Logs</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <UserIcon className="h-4 w-4 text-slate-500" /> Dados Pessoais
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-3 gap-4 border-b pb-2">
                                    <span className="text-sm text-muted-foreground">Nome Completo</span>
                                    <span className="col-span-2 text-sm font-medium">{user.full_name}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 border-b pb-2">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2"><Mail className="h-3 w-3" /> Email</span>
                                    <span className="col-span-2 text-sm font-medium">{user.email}</span>
                                </div>
                                <div className="grid grid-cols-3 gap-4 pb-2">
                                    <span className="text-sm text-muted-foreground flex items-center gap-2"><Phone className="h-3 w-3" /> Telefone</span>
                                    <span className="col-span-2 text-sm font-medium">{user.phone_number || "—"}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-slate-500" /> Permissões e Segurança
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center justify-between border p-3 rounded-lg bg-slate-50">
                                    <div>
                                        <p className="font-medium text-sm">Nível de Acesso: {user.role}</p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {user.role === 'ADMIN' && "Acesso total ao sistema."}
                                            {user.role === 'SUPERVISOR' && "Gestão de Mercados e Agentes."}
                                            {user.role === 'FUNCIONARIO' && "Operações básicas."}
                                            {user.role === 'AUDITOR' && "Acesso somente leitura aos logs."}
                                        </p>
                                    </div>
                                    <Shield className="h-8 w-8 text-primary/20" />
                                </div>

                                {/* JURISDICTION DISPLAY */}
                                {(user.scope_province || user.scope_district) && (
                                    <div className="border-t pt-4 mt-4">
                                        <h4 className="text-sm font-semibold mb-2 text-slate-700">Jurisdição Geográfica</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            {user.scope_province && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Província</span>
                                                    <span className="text-sm font-medium">{user.scope_province}</span>
                                                </div>
                                            )}
                                            {user.scope_district && (
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">Município</span>
                                                    <span className="text-sm font-medium">{user.scope_district}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <div className="text-sm space-y-2 pt-2">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Criado em:</span>
                                        <span>{new Date(user.created_at || new Date()).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">ID Interno:</span>
                                        <span className="font-mono">{user.id}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="audit" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <History className="h-4 w-4 text-slate-500" /> Histórico de Atividades
                            </CardTitle>
                            <CardDescription>
                                Ações realizadas por este usuário ou alterações em sua conta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center p-8 text-muted-foreground text-sm border-dashed border-2 rounded-lg">
                                Sistema de logs de auditoria detalhados em construção...
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
