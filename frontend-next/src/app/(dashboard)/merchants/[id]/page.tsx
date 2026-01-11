"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { Merchant, Transaction } from "@/types"
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    User,
    MapPin,
    Phone,
    CreditCard,
    Clock,
    FileText,
    ArrowLeft,
    MoreVertical,
    Shield,
    DollarSign,
    Lock,
    Edit,
    Ban,
    History
} from "lucide-react"
import Header from "@/components/layout/Header"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { EditMerchantDialog } from "@/components/features/merchants/EditMerchantDialog"
import { ResetMerchantPasswordDialog } from "@/components/features/merchants/ResetMerchantPasswordDialog"
import { StatusBadge } from "@/components/StatusBadge"

export default function MerchantDetailPage() {
    const { id } = useParams()
    const router = useRouter()
    const [merchant, setMerchant] = useState<Merchant | null>(null)
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
            // Use Promise.allSettled to handle individual failures gracefully
            // Merchant is required, transactions and audit logs are optional
            const [resMerchant, resTransac, resAudit] = await Promise.allSettled([
                api.get(`/merchants/${id}`),
                api.get(`/transactions?merchant_id=${id}&limit=50`),
                api.get(`/audit-logs/entity/MERCHANT/${id}`)
            ])

            // Merchant is required - if it fails, show error
            if (resMerchant.status === 'fulfilled') {
                setMerchant(resMerchant.value.data)
            } else {
                console.error("Error fetching merchant:", resMerchant.reason)
                setMerchant(null)
                return
            }

            // Transactions - optional, show empty if fails
            if (resTransac.status === 'fulfilled') {
                setTransactions(resTransac.value.data)
            } else {
                console.warn("Could not load transactions:", resTransac.reason)
                setTransactions([])
            }

            // Audit logs - optional, show empty if fails (403 for non-admin is expected)
            if (resAudit.status === 'fulfilled') {
                setAuditLogs(resAudit.value.data)
            } else {
                console.warn("Could not load audit logs:", resAudit.reason)
                setAuditLogs([])
            }
        } catch (error) {
            console.error("Error fetching merchant details:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusChange = async (newStatus: "ATIVO" | "SUSPENSO" | "BLOQUEADO") => {
        if (!merchant) return

        const observation = prompt(`Justifique a alteração de status para ${newStatus}:`)
        if (!observation || observation.trim().length === 0) {
            alert("Observação é obrigatória para alterar o status.")
            return
        }

        try {
            await api.put(`/merchants/${merchant.id}`, {
                status: newStatus,
                requester_notes: observation
            })
            // Refresh to get audit log update
            fetchData()
        } catch (error) {
            console.error("Error updating status:", error)
            alert("Erro ao atualizar status.")
        }
    }

    if (loading) {
        return <div className="p-8 flex justify-center text-emerald-500">Carregando detalhes...</div>
    }

    if (!merchant) {
        return <div className="p-8 text-center">Comerciante não encontrado.</div>
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">{merchant.full_name}</h1>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{merchant.merchant_type}</Badge>
                        <Badge variant={merchant.status === 'ATIVO' ? 'success' : 'destructive'}>{merchant.status}</Badge>
                        {(merchant as any).approval_status && (merchant as any).approval_status !== "APROVADO" && (
                            <StatusBadge status={(merchant as any).approval_status} showIcon={true} />
                        )}
                        <span className="text-sm text-slate-500">• ID: {merchant.id}</span>
                    </div>
                </div>
                <div className="flex gap-2">
                    <ResetMerchantPasswordDialog merchant={merchant} />
                    <EditMerchantDialog merchant={merchant} onSuccess={fetchData} />
                    {merchant.status === 'ATIVO' ? (
                        <Button
                            variant="destructive"
                            className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100 dark:bg-transparent shadow-none"
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

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                    <TabsTrigger value="finance">Financeiro</TabsTrigger>
                    {/* <TabsTrigger value="transactions">Transações</TabsTrigger> */}
                    <TabsTrigger value="audit">Auditoria</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* --- PERSONAL INFO --- */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dados Pessoais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <InfoRow icon={<User />} label="Nome" value={merchant.full_name} />
                                <InfoRow icon={<Phone />} label="Telefone" value={merchant.phone_number || "-"} />
                                <InfoRow icon={<FileText />} label="Documento" value={`${merchant.id_document_type || "Doc"}: ${merchant.id_document_number || "-"} (Exp: ${merchant.id_document_expiry ? new Date(merchant.id_document_expiry).toLocaleDateString() : 'N/A'})`} />
                                <InfoRow icon={<CreditCard />} label="Operadora" value={merchant.mobile_operator || "-"} />
                            </CardContent>
                        </Card>

                        {/* --- BUSINESS INFO --- */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-slate-500 uppercase tracking-wider">Dados Comerciais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {merchant.merchant_type === 'CIDADAO' ? (
                                    <>
                                        <InfoRow icon={<MapPin />} label="Província" value={merchant.province || "-"} />
                                        <InfoRow icon={<MapPin />} label="Distrito/Município" value={merchant.district || "-"} />
                                    </>
                                ) : (
                                    <>
                                        <InfoRow icon={<MapPin />} label="Mercado" value={merchant.market_name || (merchant.market_id ? `Mercado ID ${merchant.market_id}` : "-")} />
                                        <InfoRow icon={<MapPin />} label="Província" value={merchant.market_province || "-"} />
                                        <InfoRow icon={<MapPin />} label="Distrito" value={merchant.market_district || "-"} />
                                    </>
                                )}
                                <InfoRow icon={<CreditCard />} label="Ramo de Negócio" value={merchant.business_type || "-"} />
                                <InfoRow icon={<FileText />} label="Nome Comercial" value={merchant.business_name || "-"} />
                                <InfoRow icon={<Shield />} label="NFC UID" value={merchant.nfc_uid || "Não vinculado"} />
                                <div className="pt-4 border-t border-slate-100">
                                    <p className="text-sm font-medium mb-2">Contas Móveis</p>
                                    <div className="grid grid-cols-3 gap-2 text-sm">
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-slate-400 block text-[10px] uppercase">M-Pesa</span>
                                            {merchant.mpesa_number || "-"}
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-slate-400 block text-[10px] uppercase">e-Mola</span>
                                            {merchant.emola_number || "-"}
                                        </div>
                                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                                            <span className="text-slate-400 block text-[10px] uppercase">mKesh</span>
                                            {merchant.mkesh_number || "-"}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="finance">
                    <div className="space-y-6">
                        {/* Cards Removed as per request */}
                        {/* <div className="grid gap-4 md:grid-cols-3">...</div> */}

                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base">Histórico de Transações</CardTitle>
                                <CardDescription>Últimas 50 transações realizadas por este comerciante.</CardDescription>
                            </CardHeader>
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
                                                <TableCell className="font-mono text-xs text-slate-500">...{t.transaction_uuid ? t.transaction_uuid.slice(-8) : 'N/A'}</TableCell>
                                                <TableCell className="font-bold text-slate-900">{Number(t.amount || 0).toFixed(2)} {t.currency || "MZN"}</TableCell>
                                                <TableCell className="text-sm">{t.payment_method}</TableCell>
                                                <TableCell className="text-sm text-slate-500">{t.created_at ? new Date(t.created_at).toLocaleString() : 'N/A'}</TableCell>
                                                <TableCell className="text-right">
                                                    <Badge variant={t.status === 'SUCESSO' ? 'success' : 'outline'}>{t.status}</Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {transactions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhuma transação registrada.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="audit">
                    <Card>
                        <CardHeader>
                            <CardTitle>Histórico de Auditoria</CardTitle>
                            <CardDescription>Registro de alterações e eventos importantes relacionados a este comerciante.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Data/Hora</TableHead>
                                        <TableHead>Ator</TableHead>
                                        <TableHead>Ação</TableHead>
                                        <TableHead>Descrição</TableHead>
                                        <TableHead>IP</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {auditLogs.map((log) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-sm text-slate-500">
                                                {new Date(log.created_at).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{log.actor_name || "Sistema"}</span>
                                                    <span className="text-xs text-slate-400">{log.actor_role}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs">{log.action}</Badge>
                                            </TableCell>
                                            <TableCell className="text-sm max-w-md truncate" title={log.description}>
                                                {log.description}
                                            </TableCell>
                                            <TableCell className="text-xs text-slate-400 font-mono">
                                                {log.ip_address}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {auditLogs.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-slate-500">Nenhum registro de auditoria encontrado.</TableCell>
                                        </TableRow>
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
