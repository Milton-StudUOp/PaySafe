"use client"

import React, { useEffect, useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowRight, FileText, XCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { StatusBadge } from "@/components/StatusBadge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from "@/components/ui/dialog"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface JurisdictionRequest {
    id: number
    entity_type: "MARKET" | "MERCHANT" | "AGENT" | "POS"
    entity_id: number
    entity_name?: string
    current_province?: string
    current_district?: string
    requested_province: string
    requested_district?: string
    requested_at: string
    status: "PENDENTE" | "APROVADO" | "REJEITADO" | "CANCELADO"
    review_notes?: string
    reviewed_at?: string
}

export default function MyRequestsPage() {
    const [requests, setRequests] = useState<JurisdictionRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [cancellingId, setCancellingId] = useState<number | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const res = await api.get("/approvals/my-requests")
            setRequests(res.data)
        } catch (error) {
            console.error("Error fetching my requests:", error)
            toast({
                title: "Erro",
                description: "Não foi possível carregar seus pedidos.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleCancel = async (requestId: number) => {
        setCancellingId(requestId)
        try {
            await api.post(`/approvals/${requestId}/cancel`)
            toast({
                title: "Sucesso",
                description: "Solicitação cancelada com sucesso. A entidade foi restaurada ao estado anterior.",
                variant: "success"
            })
            fetchRequests() // Refresh the list
        } catch (error: unknown) {
            console.error("Error cancelling request:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Não foi possível cancelar a solicitação.",
                variant: "destructive"
            })
        } finally {
            setCancellingId(null)
        }
    }

    const getEntityTypeBadge = (type: string) => {
        const colors: Record<string, string> = {
            MARKET: "bg-blue-100 text-blue-800",
            MERCHANT: "bg-purple-100 text-purple-800",
            AGENT: "bg-amber-100 text-amber-800",
            POS: "bg-emerald-100 text-emerald-800"
        }
        const labels: Record<string, string> = {
            MARKET: "Mercado",
            MERCHANT: "Comerciante",
            AGENT: "Agente",
            POS: "POS"
        }
        return (
            <Badge className={colors[type] || "bg-gray-100 text-gray-800"}>
                {labels[type] || type}
            </Badge>
        )
    }

    return (
        <div className="space-y-6">
            <Header
                title="Meus Pedidos de Aprovação"
                subtitle="Acompanhe o status das suas solicitações de alteração de jurisdição"
            />

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">Histórico de Solicitações</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <FileText className="h-12 w-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                            <p>Você não possui pedidos de aprovação.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Entidade</TableHead>
                                        <TableHead>Alteração Solicitada</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                <StatusBadge status={req.status} />
                                            </TableCell>
                                            <TableCell>
                                                {getEntityTypeBadge(req.entity_type)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {req.entity_name || `ID #${req.entity_id}`}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <span className="text-slate-500">{req.current_province || "N/A"}</span>
                                                    <ArrowRight className="h-3 w-3 text-slate-400" />
                                                    <span className="font-medium text-slate-900">{req.requested_province}</span>
                                                </div>
                                                {(req.current_district || req.requested_district) && (
                                                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                                                        <span>{req.current_district || "-"}</span>
                                                        <ArrowRight className="h-2 w-2" />
                                                        <span>{req.requested_district || "-"}</span>
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-slate-500 text-sm">
                                                {new Date(req.requested_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {/* Cancel Button - only for PENDENTE requests */}
                                                    {req.status === "PENDENTE" && (
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                                    disabled={cancellingId === req.id}
                                                                >
                                                                    {cancellingId === req.id ? (
                                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                                    ) : (
                                                                        <>
                                                                            <XCircle className="h-4 w-4 mr-1" />
                                                                            Cancelar
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle>Cancelar Solicitação?</AlertDialogTitle>
                                                                    <AlertDialogDescription>
                                                                        Tem certeza que deseja cancelar esta solicitação?
                                                                        <br /><br />
                                                                        A entidade <strong>{req.entity_name}</strong> será restaurada
                                                                        para a localização anterior:
                                                                        <br />
                                                                        <span className="font-medium">{req.current_province} / {req.current_district || '-'}</span>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Não, manter</AlertDialogCancel>
                                                                    <AlertDialogAction
                                                                        onClick={() => handleCancel(req.id)}
                                                                        className="bg-red-600 hover:bg-red-700"
                                                                    >
                                                                        Sim, cancelar
                                                                    </AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    )}

                                                    {/* View Details Button */}
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="ghost" size="sm">Ver</Button>
                                                        </DialogTrigger>
                                                        <DialogContent>
                                                            <DialogHeader>
                                                                <DialogTitle>Detalhes do Pedido #{req.id}</DialogTitle>
                                                                <DialogDescription>
                                                                    Status: <StatusBadge status={req.status} className="ml-1 inline-flex" />
                                                                </DialogDescription>
                                                            </DialogHeader>
                                                            <div className="space-y-4 py-4">
                                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                                    <div>
                                                                        <p className="text-muted-foreground">Entidade</p>
                                                                        <p className="font-medium">{req.entity_name} ({req.entity_type})</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-muted-foreground">Data do Pedido</p>
                                                                        <p>{new Date(req.requested_at).toLocaleString()}</p>
                                                                    </div>
                                                                </div>

                                                                <div className="bg-slate-50 p-4 rounded-lg space-y-3">
                                                                    <h4 className="font-medium text-sm">Alteração de Jurisdição</h4>
                                                                    <div className="flex items-center justify-between text-sm">
                                                                        <div>
                                                                            <p className="text-muted-foreground text-xs uppercase">De</p>
                                                                            <p className="font-medium">{req.current_province} / {req.current_district || '-'}</p>
                                                                        </div>
                                                                        <ArrowRight className="h-4 w-4 text-slate-400" />
                                                                        <div className="text-right">
                                                                            <p className="text-muted-foreground text-xs uppercase">Para</p>
                                                                            <p className="font-medium text-emerald-600">{req.requested_province} / {req.requested_district || '-'}</p>
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {req.status === "REJEITADO" && req.review_notes && (
                                                                    <div className="bg-red-50 text-red-800 p-4 rounded-lg border border-red-100">
                                                                        <h4 className="font-medium text-sm mb-1">Motivo da Rejeição</h4>
                                                                        <p className="text-sm">{req.review_notes}</p>
                                                                    </div>
                                                                )}

                                                                {req.status === "APROVADO" && (
                                                                    <div className="bg-emerald-50 text-emerald-800 p-4 rounded-lg border border-emerald-100">
                                                                        <p className="text-sm">Pedido aprovado e alterações aplicadas.</p>
                                                                    </div>
                                                                )}

                                                                {req.status === "CANCELADO" && (
                                                                    <div className="bg-slate-50 text-slate-700 p-4 rounded-lg border border-slate-200">
                                                                        <p className="text-sm">Pedido cancelado pelo solicitante. Entidade restaurada ao estado anterior.</p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
