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
import { useToast } from "@/components/ui/use-toast"
import { POSDevice, Agent } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLocations } from "@/hooks/useLocations"

interface EditPosDialogProps {
    pos: POSDevice
    children?: React.ReactNode
    onSuccess?: () => void
}

export function EditPosDialog({ pos, children, onSuccess }: EditPosDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [serialNumber, setSerialNumber] = useState(pos.serial_number)
    const [model, setModel] = useState(pos.model || "")
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>("")
    const [municipality, setMunicipality] = useState("")
    const [status, setStatus] = useState<string>(pos.status)
    const [selectedAgentId, setSelectedAgentId] = useState<string>(pos.assigned_agent_id?.toString() || "")
    const [agents, setAgents] = useState<Agent[]>([])
    const [requesterNotes, setRequesterNotes] = useState<string>("")

    // Track initial load to avoid resetting data
    const isInitialLoadDone = useRef(false)
    const pendingMunicipality = useRef<string>("")
    const pendingAgentId = useRef<string>("")

    // Use the locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    const isPending = pos.approval_status === "PENDENTE"

    // On dialog open, reset and load data
    useEffect(() => {
        if (open) {
            isInitialLoadDone.current = false
            setSerialNumber(pos.serial_number)
            setModel(pos.model || "")
            setStatus(pos.status)

            // Store pending values for later restoration
            pendingMunicipality.current = pos.district || ""
            pendingAgentId.current = pos.assigned_agent_id?.toString() || ""
            setRequesterNotes("")
        }
    }, [open, pos])

    // Set initial province when provinces load (after dialog opens)
    useEffect(() => {
        if (open && provinces.length > 0 && pos.province && !isInitialLoadDone.current) {
            const matchingProvince = provinces.find(p => p.name === pos.province)
            if (matchingProvince) {
                setSelectedProvinceId(matchingProvince.id.toString())
            }
        }
    }, [open, provinces, pos.province])

    // When municipalities load, set pending municipality
    useEffect(() => {
        if (municipalities.length > 0 && pendingMunicipality.current && !isInitialLoadDone.current) {
            setMunicipality(pendingMunicipality.current)
        }
    }, [municipalities])

    // Fetch agents when municipality is set and restore pending agent
    useEffect(() => {
        if (municipality) {
            fetchAgentsByMunicipality(municipality)
        } else {
            setAgents([])
        }
    }, [municipality])

    const fetchAgentsByMunicipality = async (municipalityName: string) => {
        try {
            const res = await api.get(`/agents/?district=${encodeURIComponent(municipalityName)}`)
            setAgents(res.data)

            // Restore pending agent after agents load (on initial load)
            if (!isInitialLoadDone.current && pendingAgentId.current) {
                setSelectedAgentId(pendingAgentId.current)
                isInitialLoadDone.current = true
            }
        } catch (error) {
            console.error("Error fetching agents:", error)
            setAgents([])
        }
    }

    // Handler for province change - resets cascading values after initial load
    const handleProvinceChange = (newProvinceId: string) => {
        if (isInitialLoadDone.current) {
            setMunicipality("")
            setSelectedAgentId("")
            setAgents([])
        }
        setSelectedProvinceId(newProvinceId)
    }

    // Handler for municipality change - resets agent after initial load
    const handleMunicipalityChange = (newMunicipality: string) => {
        if (isInitialLoadDone.current) {
            setSelectedAgentId("")
        }
        setMunicipality(newMunicipality)
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

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

        setLoading(true)

        try {
            const provinceName = getProvinceNameById(selectedProvinceId)

            const res = await api.put(`/pos-devices/${pos.id}`, {
                serial_number: serialNumber,
                model,
                province: provinceName,
                district: municipality,
                status: status,
                assigned_agent_id: selectedAgentId && selectedAgentId !== "__none__" ? parseInt(selectedAgentId) : null,
                requester_notes: requesterNotes || undefined
            })

            if ((res.data as POSDevice).approval_status === "PENDENTE") {
                toast({
                    title: "Solicitação Enviada",
                    description: "Alteração de jurisdição fora do seu escopo requer aprovação.",
                    variant: "default",
                    className: "bg-amber-50 border-amber-200 text-amber-800"
                })
            } else {
                toast({
                    title: "Sucesso",
                    description: "Dispositivo POS atualizado com sucesso.",
                    variant: "success",
                })
            }

            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error: unknown) {
            console.error("Error updating POS device:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Erro ao atualizar dispositivo POS.",
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
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Editar Dispositivo POS</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do terminal de pagamento.
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
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="serial" className="text-right">Serial *</Label>
                            <Input
                                id="serial"
                                value={serialNumber}
                                onChange={(e) => setSerialNumber(e.target.value)}
                                className="col-span-3"
                                required
                                disabled={isPending}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="serial" className="text-right">UUID *</Label>
                            <Input
                                id="serial"
                                value={serialNumber}
                                onChange={(e) => setSerialNumber(e.target.value)}
                                className="col-span-3"
                                required
                                disabled={isPending}
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
                                disabled={isPending}
                                placeholder="Número de série"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="province" className="text-right">Província *</Label>
                            <Select value={selectedProvinceId} onValueChange={handleProvinceChange} disabled={isPending}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={loadingProvinces ? "Carregando..." : "Selecionar"} />
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
                                onValueChange={handleMunicipalityChange}
                                disabled={!selectedProvinceId || loadingMunicipalities || isPending}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={
                                        !selectedProvinceId
                                            ? "Selecione a província"
                                            : loadingMunicipalities
                                                ? "Carregando..."
                                                : "Selecionar"
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
                            <Label htmlFor="status" className="text-right">Status</Label>
                            <Select value={status} onValueChange={setStatus} disabled={isPending}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ATIVO">Ativo</SelectItem>
                                    <SelectItem value="INATIVO">Inativo</SelectItem>
                                    <SelectItem value="MANUTENCAO">Manutenção</SelectItem>
                                    <SelectItem value="BLOQUEADO">Bloqueado</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="agent" className="text-right">Agente</Label>
                            <Select
                                value={selectedAgentId}
                                onValueChange={setSelectedAgentId}
                                disabled={isPending || !municipality}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={
                                        !municipality
                                            ? "Selecione o município"
                                            : agents.length === 0
                                                ? "Nenhum agente neste município"
                                                : "Selecionar"
                                    } />
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
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
