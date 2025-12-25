"use client"

import { useState, useEffect, FormEvent, useRef } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Loader2, Edit, AlertCircle } from "lucide-react"
import api from "@/lib/api"
import { Market } from "@/types"
import { useToast } from "@/components/ui/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLocations } from "@/hooks/useLocations"

interface EditMarketDialogProps {
    market: Market
    children?: React.ReactNode
    onSuccess?: () => void
}

export function EditMarketDialog({ market, children, onSuccess }: EditMarketDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [name, setName] = useState(market.name)
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>("")
    const [municipality, setMunicipality] = useState("")
    const [status, setStatus] = useState<"ATIVO" | "INATIVO">(market.status)
    const [requesterNotes, setRequesterNotes] = useState<string>("")

    // Track initial load to avoid resetting data
    const isInitialLoadDone = useRef(false)
    const pendingMunicipality = useRef<string>("")

    // Use the locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    const isPending = market.approval_status === "PENDENTE"

    // On dialog open, reset and load data
    useEffect(() => {
        if (open) {
            isInitialLoadDone.current = false
            setName(market.name)
            setStatus(market.status)
            pendingMunicipality.current = market.district || ""
            setRequesterNotes("")
        }
    }, [open, market])

    // Set initial province when provinces load
    useEffect(() => {
        if (open && provinces.length > 0 && market.province && !isInitialLoadDone.current) {
            const matchingProvince = provinces.find(p => p.name === market.province)
            if (matchingProvince) {
                setSelectedProvinceId(matchingProvince.id.toString())
            }
        }
    }, [open, provinces, market.province])

    // When municipalities load, set pending municipality
    useEffect(() => {
        if (municipalities.length > 0 && pendingMunicipality.current && !isInitialLoadDone.current) {
            setMunicipality(pendingMunicipality.current)
            isInitialLoadDone.current = true
        }
    }, [municipalities])

    // Handler for province change - resets municipality after initial load
    const handleProvinceChange = (newProvinceId: string) => {
        if (isInitialLoadDone.current) {
            setMunicipality("")
        }
        setSelectedProvinceId(newProvinceId)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!municipality) {
            toast({
                title: "Erro",
                description: "Por favor, selecione um município.",
                variant: "destructive"
            })
            return
        }

        if (!requesterNotes || requesterNotes.trim().length === 0) {
            toast({
                title: "Erro",
                description: "Por favor, preencha a observação/justificativa.",
                variant: "destructive"
            })
            return
        }

        setLoading(true)

        try {
            const provinceName = getProvinceNameById(selectedProvinceId)

            const res = await api.put(`/markets/${market.id}`, {
                name,
                province: provinceName,
                district: municipality,
                status,
                requester_notes: requesterNotes || undefined
            })

            if ((res.data as { approval_status?: string }).approval_status === "PENDENTE") {
                toast({
                    title: "Solicitação Enviada",
                    description: "Alteração de jurisdição fora do seu escopo requer aprovação.",
                    variant: "default",
                    className: "bg-amber-50 border-amber-200 text-amber-800"
                })
            } else {
                toast({
                    title: "Sucesso",
                    description: "Mercado atualizado com sucesso.",
                    variant: "success",
                })
            }

            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error) {
            console.error("Error updating market:", error)
            toast({
                title: "Erro",
                description: "Erro ao atualizar mercado.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm">
                        <Edit className="mr-2 h-4 w-4" /> Editar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Mercado</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do mercado.
                    </DialogDescription>
                </DialogHeader>

                {isPending && (
                    <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                        <AlertTitle className="text-amber-800">Solicitação Pendente</AlertTitle>
                        <AlertDescription className="text-amber-700">
                            Este registro possui uma solicitação pendente de aprovação.
                        </AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Nome do Mercado</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Mercado Central"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="province">Província</Label>
                                <Select value={selectedProvinceId} onValueChange={handleProvinceChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingProvinces ? "Carregando..." : "Selecione"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {provinces.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="municipality">Município *</Label>
                                <Select
                                    value={municipality}
                                    onValueChange={setMunicipality}
                                    disabled={!selectedProvinceId || loadingMunicipalities}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !selectedProvinceId
                                                ? "Selec. província"
                                                : loadingMunicipalities
                                                    ? "Carregando..."
                                                    : "Selecione"
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {municipalities.map(m => (
                                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="status">Status Operacional</Label>
                            <Select value={status} onValueChange={(v: "ATIVO" | "INATIVO") => setStatus(v)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ATIVO">Ativo</SelectItem>
                                    <SelectItem value="INATIVO">Inativo</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Observation field - REQUIRED */}
                        <div className="grid gap-2">
                            <Label htmlFor="notes">Observação *</Label>
                            <Textarea
                                id="notes"
                                value={requesterNotes}
                                onChange={(e) => setRequesterNotes(e.target.value)}
                                placeholder="Justifique a alteração (campo obrigatório)..."
                                rows={3}
                                disabled={isPending}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading || isPending} className="bg-emerald-600 hover:bg-emerald-700">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                "Salvar Alterações"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
