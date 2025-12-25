"use client"

import { useState, useEffect, FormEvent } from "react"
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
import { Loader2, Plus } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { useLocations } from "@/hooks/useLocations"

interface CreateMarketDialogProps {
    children?: React.ReactNode
    onSuccess?: () => void
}

export function CreateMarketDialog({ children, onSuccess }: CreateMarketDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [name, setName] = useState("")
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>("")
    const [municipality, setMunicipality] = useState("")
    const [requesterNotes, setRequesterNotes] = useState<string>("")

    // Use the locations hook with selected province
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    const resetForm = () => {
        setName("")
        setSelectedProvinceId("")
        setMunicipality("")
        setRequesterNotes("")
    }

    // Reset municipality when province changes
    useEffect(() => {
        setMunicipality("")
    }, [selectedProvinceId])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!selectedProvinceId) {
            toast({
                title: "Erro",
                description: "Por favor, selecione uma província.",
                variant: "destructive"
            })
            return
        }

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

            const res = await api.post("/markets/", {
                name,
                province: provinceName,
                district: municipality,
                status: "ATIVO",
                requester_notes: requesterNotes || undefined
            })

            if ((res.data as { approval_status?: string }).approval_status === "PENDENTE") {
                toast({
                    title: "Solicitação Enviada",
                    description: "Criação de mercado fora da jurisdição requer aprovação. Enviado ao administrador.",
                    variant: "default",
                    className: "bg-amber-50 border-amber-200 text-amber-800"
                })
            } else {
                toast({
                    title: "Sucesso",
                    description: "Mercado criado com sucesso.",
                    variant: "success",
                })
            }

            setOpen(false)
            resetForm()
            if (onSuccess) onSuccess()
        } catch (error: unknown) {
            console.error("Error creating market:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            const errorMessage = axiosError.response?.data?.detail || "Erro ao criar mercado."
            toast({
                title: "Erro",
                description: errorMessage,
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
                    <Button className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="mr-2 h-4 w-4" /> Novo Mercado
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Novo Mercado</DialogTitle>
                    <DialogDescription>
                        Registrar um novo mercado no sistema.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nome *</Label>
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="col-span-3"
                                required
                                placeholder="Nome do mercado"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="province" className="text-right">Província *</Label>
                            <Select value={selectedProvinceId} onValueChange={setSelectedProvinceId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={loadingProvinces ? "Carregando..." : "Selecionar província"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {provinces.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="municipality" className="text-right">Município *</Label>
                            <Select
                                value={municipality}
                                onValueChange={setMunicipality}
                                disabled={!selectedProvinceId || loadingMunicipalities}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={
                                        !selectedProvinceId
                                            ? "Selecione a província primeiro"
                                            : loadingMunicipalities
                                                ? "Carregando..."
                                                : "Selecionar município"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {municipalities.map(m => (
                                        <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Observation field - REQUIRED */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <Label htmlFor="notes" className="text-right mt-2">Observação *</Label>
                            <Textarea
                                id="notes"
                                value={requesterNotes}
                                onChange={(e) => setRequesterNotes(e.target.value)}
                                className="col-span-3"
                                placeholder="Justifique a criação (campo obrigatório)..."
                                rows={3}
                                required
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
