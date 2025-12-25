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
import { Agent, POSDevice } from "@/types"
import { useLocations } from "@/hooks/useLocations"

interface CreatePosDialogProps {
    children?: React.ReactNode
    onSuccess?: () => void
}

export function CreatePosDialog({ children, onSuccess }: CreatePosDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [serialNumber, setSerialNumber] = useState("")
    const [model, setModel] = useState("")
    const [apiKey, setApiKey] = useState("")
    const [selectedProvinceId, setSelectedProvinceId] = useState("")
    const [municipality, setMunicipality] = useState("")
    const [selectedAgentId, setSelectedAgentId] = useState<string>("")
    const [agents, setAgents] = useState<Agent[]>([])
    const [requesterNotes, setRequesterNotes] = useState<string>("")

    // Use the locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    // Reset municipality and agent when province changes
    useEffect(() => {
        setMunicipality("")
        setSelectedAgentId("")
    }, [selectedProvinceId])

    // Fetch agents filtered by municipality when municipality changes (VLOOKUP style)
    useEffect(() => {
        if (municipality) {
            fetchAgentsByMunicipality(municipality)
        } else {
            setAgents([]) // Clear agents if no municipality selected
        }
    }, [municipality])

    const fetchAgentsByMunicipality = async (municipalityName: string) => {
        try {
            // Filter agents by municipality - same municipality only
            const res = await api.get(`/agents/?district=${encodeURIComponent(municipalityName)}`)
            setAgents(res.data)
        } catch (error) {
            console.error("Error fetching agents:", error)
            setAgents([])
        }
    }

    const resetForm = () => {
        setSerialNumber("")
        setModel("")
        setApiKey("")
        setSelectedProvinceId("")
        setMunicipality("")
        setSelectedAgentId("")
        setRequesterNotes("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        // Validate mandatory fields
        if (!model || model.trim().length === 0) {
            toast({
                title: "Erro",
                description: "Por favor, preencha o modelo do dispositivo.",
                variant: "destructive"
            })
            return
        }

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

        const provinceName = getProvinceNameById(selectedProvinceId)

        const data = {
            serial_number: serialNumber,
            model,
            api_key: apiKey,
            province: provinceName,
            district: municipality,
            assigned_agent_id: selectedAgentId && selectedAgentId !== "__none__" ? parseInt(selectedAgentId) : null,
            status: "ATIVO",
            requester_notes: requesterNotes || undefined
        }

        setLoading(true)

        try {
            const res = await api.post("/pos-devices/", data)

            if ((res.data as POSDevice).approval_status === "PENDENTE") {
                toast({
                    title: "Solicitação Enviada",
                    description: "Criação de dispositivo fora da sua jurisdição. Enviado ao administrador.",
                    variant: "default",
                    className: "bg-amber-50 border-amber-200 text-amber-800"
                })
            } else {
                toast({
                    title: "Sucesso",
                    description: "Dispositivo POS criado com sucesso.",
                    variant: "success",
                })
            }

            setOpen(false)
            resetForm()
            if (onSuccess) onSuccess()
        } catch (error: unknown) {
            console.error("Error creating POS device:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            const errorMessage = axiosError.response?.data?.detail || "Erro ao criar dispositivo POS."
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
                        <Plus className="mr-2 h-4 w-4" /> Novo POS
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Novo Dispositivo POS</DialogTitle>
                    <DialogDescription>
                        Registrar um novo terminal de pagamento.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="serial" className="text-right">UUID *</Label>
                            <Input
                                id="serial"
                                value={serialNumber}
                                onChange={(e) => setSerialNumber(e.target.value)}
                                className="col-span-3"
                                required
                                placeholder="Código de Identificação Única"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="model" className="text-right">Serial *</Label>
                            <Input
                                id="model"
                                value={model}
                                onChange={(e) => setModel(e.target.value)}
                                className="col-span-3"
                                required
                                placeholder="Número de série"
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

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="agent" className="text-right">Agente</Label>
                            <Select value={selectedAgentId} onValueChange={setSelectedAgentId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecionar agente (opcional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="__none__">Nenhum</SelectItem>
                                    {agents.map(a => (
                                        <SelectItem key={a.id} value={a.id.toString()}>
                                            {a.full_name} ({a.agent_code})
                                        </SelectItem>
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
