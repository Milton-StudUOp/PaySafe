"use client"

import React, { useEffect, useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow
} from "@/components/ui/table"
import { TableSkeleton } from "@/components/ui/table-skeleton"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Loader2, Check, X, MapPin, ArrowRight, Clock, Eye } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface JurisdictionRequest {
    id: number
    entity_type: "MARKET" | "MERCHANT" | "AGENT" | "POS"
    entity_id: number
    entity_name?: string
    current_province?: string
    current_district?: string
    requested_province: string
    requested_district?: string
    requested_by_user_id: number
    requested_by_name?: string
    requested_at: string
    status: "PENDENTE" | "APROVADO" | "REJEITADO" | "CANCELADO"
    requester_notes?: string  // Observation from the requester
    request_type?: "CREATE" | "UPDATE"
}

export default function ApprovalsPage() {
    const [requests, setRequests] = useState<JurisdictionRequest[]>([])
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState<number | null>(null)
    const [showDialog, setShowDialog] = useState(false)
    const [selectedRequest, setSelectedRequest] = useState<JurisdictionRequest | null>(null)
    const [actionType, setActionType] = useState<"approve" | "reject">("approve")
    const [notes, setNotes] = useState("")
    const [showViewDialog, setShowViewDialog] = useState(false)
    const [viewRequest, setViewRequest] = useState<JurisdictionRequest | null>(null)
    const { toast } = useToast()

    useEffect(() => {
        fetchRequests()
    }, [])

    const fetchRequests = async () => {
        setLoading(true)
        try {
            const res = await api.get("/approvals/pending")
            setRequests(res.data)
        } catch (error) {
            console.error("Error fetching approvals:", error)
            toast({
                title: "Erro",
                description: "Não foi possível carregar as aprovações pendentes.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const handleAction = async () => {
        if (!selectedRequest) return
        setActionLoading(selectedRequest.id)

        if (actionType === "reject" && !notes.trim()) {
            toast({
                title: "Atenção",
                description: "É obrigatório informar o motivo da rejeição.",
                variant: "destructive"
            })
            return
        }

        try {
            await api.post(`/approvals/${selectedRequest.id}/${actionType}`, { notes })
            toast({
                title: actionType === "approve" ? "Aprovado" : "Rejeitado",
                description: actionType === "approve"
                    ? "Alteração de jurisdição aprovada com sucesso."
                    : "Alteração de jurisdição rejeitada.",
                variant: actionType === "approve" ? "success" : "default"
            })
            setShowDialog(false)
            setNotes("")
            fetchRequests()
        } catch (error) {
            console.error("Error processing action:", error)
            toast({
                title: "Erro",
                description: "Não foi possível processar a ação.",
                variant: "destructive"
            })
        } finally {
            setActionLoading(null)
        }
    }

    const openActionDialog = (request: JurisdictionRequest, type: "approve" | "reject") => {
        setSelectedRequest(request)
        setActionType(type)
        setNotes("")
        setShowDialog(true)
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
                title="Aprovações Pendentes"
                subtitle="Solicitações de alteração de jurisdição aguardando revisão"
            />

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-amber-500" />
                        Pendentes de Aprovação
                        {requests.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                                {requests.length}
                            </Badge>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <TableSkeleton columnCount={8} rowCount={5} />
                    ) : requests.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Check className="h-12 w-12 mx-auto mb-4 text-emerald-500 opacity-50" />
                            <p>Nenhuma aprovação pendente.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Tipo</TableHead>
                                        <TableHead>Entidade</TableHead>
                                        <TableHead>Jurisdição Atual</TableHead>
                                        <TableHead></TableHead>
                                        <TableHead>Jurisdição Solicitada</TableHead>
                                        <TableHead>Solicitante</TableHead>
                                        <TableHead>Data</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {requests.map((req) => (
                                        <TableRow key={req.id}>
                                            <TableCell>
                                                {getEntityTypeBadge(req.entity_type)}
                                            </TableCell>
                                            <TableCell className="font-medium">
                                                {req.entity_name || `ID #${req.entity_id}`}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-slate-600">
                                                    <MapPin className="h-3 w-3" />
                                                    {req.current_province || "N/A"}
                                                    {req.current_district && ` / ${req.current_district}`}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <ArrowRight className="h-4 w-4 text-slate-400" />
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                                    <MapPin className="h-3 w-3" />
                                                    {req.requested_province}
                                                    {req.requested_district && ` / ${req.requested_district}`}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">
                                                {req.requested_by_name || "Desconhecido"}
                                            </TableCell>
                                            <TableCell className="text-sm text-slate-500">
                                                {new Date(req.requested_at).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex gap-2 justify-end">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setViewRequest(req)
                                                            setShowViewDialog(true)
                                                        }}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        className="bg-emerald-600 hover:bg-emerald-700"
                                                        onClick={() => openActionDialog(req, "approve")}
                                                        disabled={actionLoading === req.id}
                                                    >
                                                        {actionLoading === req.id ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <>
                                                                <Check className="h-4 w-4 mr-1" />
                                                                Aprovar
                                                            </>
                                                        )}
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => openActionDialog(req, "reject")}
                                                        disabled={actionLoading === req.id}
                                                    >
                                                        <X className="h-4 w-4 mr-1" />
                                                        Rejeitar
                                                    </Button>
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

            {/* Confirmation Dialog */}
            <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {actionType === "approve" ? "Aprovar Alteração" : "Rejeitar Alteração"}
                        </DialogTitle>
                        <DialogDescription>
                            {actionType === "approve"
                                ? "A jurisdição será atualizada para os novos valores."
                                : "A alteração será descartada e a jurisdição original mantida."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    {selectedRequest && (
                        <div className="py-4">
                            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Entidade:</span>
                                    <span className="font-medium">{selectedRequest.entity_name || `#${selectedRequest.entity_id}`}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">De:</span>
                                    <span>{selectedRequest.current_province || "N/A"}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Para:</span>
                                    <span className="font-medium text-emerald-600">{selectedRequest.requested_province}</span>
                                </div>
                                {selectedRequest.request_type && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-500">Tipo:</span>
                                        <span>{selectedRequest.request_type === "CREATE" ? "Criação" : "Atualização"}</span>
                                    </div>
                                )}
                            </div>

                            {/* Requester Observation */}
                            {selectedRequest.requester_notes && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mt-4">
                                    <Label className="text-blue-700 font-medium text-sm">Observação do Solicitante:</Label>
                                    <p className="text-blue-800 text-sm mt-1">{selectedRequest.requester_notes}</p>
                                </div>
                            )}

                            <div className="mt-4 space-y-2">
                                <Label htmlFor="notes">Notas {actionType === "reject" ? "(obrigatório)" : "(opcional)"}</Label>
                                <Textarea
                                    id="notes"
                                    placeholder={actionType === "reject" ? "Informe o motivo da rejeição..." : "Adicione um comentário..."}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowDialog(false)}>
                            Cancelar
                        </Button>
                        <Button
                            onClick={handleAction}
                            className={actionType === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : ""}
                            variant={actionType === "reject" ? "destructive" : "default"}
                            disabled={actionLoading !== null}
                        >
                            {actionLoading !== null && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {actionType === "approve" ? "Confirmar Aprovação" : "Confirmar Rejeição"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Details Dialog */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Detalhes da Solicitação #{viewRequest?.id}</DialogTitle>
                        <DialogDescription>
                            Informações completas do pedido de alteração de jurisdição.
                        </DialogDescription>
                    </DialogHeader>

                    {viewRequest && (
                        <div className="space-y-4 py-4">
                            {/* Entity Info */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Tipo</p>
                                    <p className="font-medium">{getEntityTypeBadge(viewRequest.entity_type)}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Entidade</p>
                                    <p className="font-medium">{viewRequest.entity_name || `#${viewRequest.entity_id}`}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Solicitante</p>
                                    <p className="font-medium">{viewRequest.requested_by_name || "Desconhecido"}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Data</p>
                                    <p className="font-medium">{new Date(viewRequest.requested_at).toLocaleString()}</p>
                                </div>
                                {viewRequest.request_type && (
                                    <div>
                                        <p className="text-muted-foreground">Tipo de Operação</p>
                                        <p className="font-medium">{viewRequest.request_type === "CREATE" ? "Criação" : "Atualização"}</p>
                                    </div>
                                )}
                            </div>

                            {/* Jurisdiction Change */}
                            <div className="bg-slate-50 rounded-lg p-4">
                                <h4 className="font-medium text-sm mb-3">Alteração de Jurisdição</h4>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-xs text-muted-foreground uppercase">De</p>
                                        <p className="font-medium">{viewRequest.current_province || "N/A"}</p>
                                        <p className="text-sm text-slate-600">{viewRequest.current_district || "-"}</p>
                                    </div>
                                    <ArrowRight className="h-5 w-5 text-slate-400" />
                                    <div className="text-right">
                                        <p className="text-xs text-muted-foreground uppercase">Para</p>
                                        <p className="font-medium text-emerald-600">{viewRequest.requested_province}</p>
                                        <p className="text-sm text-emerald-600">{viewRequest.requested_district || "-"}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Requester Notes */}
                            {viewRequest.requester_notes && (
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                                    <Label className="text-blue-700 font-medium text-sm">Observação do Solicitante:</Label>
                                    <p className="text-blue-800 text-sm mt-1">{viewRequest.requester_notes}</p>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                            Fechar
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                setShowViewDialog(false)
                                if (viewRequest) openActionDialog(viewRequest, "reject")
                            }}
                        >
                            <X className="h-4 w-4 mr-1" />
                            Rejeitar
                        </Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() => {
                                setShowViewDialog(false)
                                if (viewRequest) openActionDialog(viewRequest, "approve")
                            }}
                        >
                            <Check className="h-4 w-4 mr-1" />
                            Aprovar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
