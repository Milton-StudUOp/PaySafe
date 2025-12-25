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
import { Agent, Market } from "@/types"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { useLocations } from "@/hooks/useLocations"

interface EditAgentDialogProps {
    agent: Agent
    children?: React.ReactNode
    onSuccess?: () => void
}

export function EditAgentDialog({ agent, children, onSuccess }: EditAgentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [agentCode, setAgentCode] = useState(agent.agent_code)
    const [fullName, setFullName] = useState(agent.full_name)
    const [phoneNumber, setPhoneNumber] = useState(agent.phone_number || "")
    const [status, setStatus] = useState<string>(agent.status)
    const [selectedMarket, setSelectedMarket] = useState<string>(agent.assigned_market_id?.toString() || "")
    const [markets, setMarkets] = useState<Market[]>([])
    const [allMarkets, setAllMarkets] = useState<Market[]>([])
    const [requesterNotes, setRequesterNotes] = useState<string>("")

    // Province/Municipality selection
    const [selectedProvinceId, setSelectedProvinceId] = useState("")
    const [municipality, setMunicipality] = useState("")

    // Track if we've done initial data load
    const isInitialLoadDone = useRef(false)
    const pendingMunicipality = useRef<string>("")
    const pendingMarketId = useRef<string>("")

    // Use locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    const isPending = agent.approval_status === "PENDENTE"

    // On dialog open, reset and fetch data
    useEffect(() => {
        if (open) {
            isInitialLoadDone.current = false
            setAgentCode(agent.agent_code)
            setFullName(agent.full_name)
            setPhoneNumber(agent.phone_number || "")
            setStatus(agent.status)
            pendingMarketId.current = agent.assigned_market_id?.toString() || ""
            setRequesterNotes("")
            fetchAllMarkets()
        }
    }, [open, agent])

    // After allMarkets load, find current market's province/municipality
    useEffect(() => {
        if (allMarkets.length > 0 && agent.assigned_market_id && !isInitialLoadDone.current) {
            const currentMarket = allMarkets.find(m => m.id === agent.assigned_market_id)
            if (currentMarket) {
                // Store pending values
                pendingMunicipality.current = currentMarket.district || ""
                pendingMarketId.current = agent.assigned_market_id.toString()

                // Find and set province (this will trigger municipality fetch via useLocations)
                if (provinces.length > 0) {
                    const matchingProvince = provinces.find(p => p.name === currentMarket.province)
                    if (matchingProvince) {
                        setSelectedProvinceId(matchingProvince.id.toString())
                    }
                }
            }
        }
    }, [allMarkets, agent.assigned_market_id, provinces])

    // When municipalities load (after province selection), set pending municipality
    useEffect(() => {
        if (municipalities.length > 0 && pendingMunicipality.current && !isInitialLoadDone.current) {
            setMunicipality(pendingMunicipality.current)
        }
    }, [municipalities])

    // When municipality is set, filter markets and set pending market
    useEffect(() => {
        if (municipality && allMarkets.length > 0) {
            const filteredMarkets = allMarkets.filter(m => m.district === municipality)
            setMarkets(filteredMarkets)

            // If this is initial load, set the pending market selection
            if (!isInitialLoadDone.current && pendingMarketId.current) {
                setSelectedMarket(pendingMarketId.current)
                isInitialLoadDone.current = true
            }
        } else if (!municipality) {
            setMarkets([])
        }
    }, [municipality, allMarkets])

    // When province changes AFTER initial load, reset municipality and market
    const handleProvinceChange = (newProvinceId: string) => {
        if (isInitialLoadDone.current) {
            setMunicipality("")
            setSelectedMarket("")
            setMarkets([])
        }
        setSelectedProvinceId(newProvinceId)
    }

    // When municipality changes AFTER initial load, reset market
    const handleMunicipalityChange = (newMunicipality: string) => {
        if (isInitialLoadDone.current) {
            setSelectedMarket("")
        }
        setMunicipality(newMunicipality)
    }

    const fetchAllMarkets = async () => {
        try {
            const res = await api.get("/markets/approved-active/")
            setAllMarkets(res.data)
        } catch (error) {
            console.error("Error fetching markets:", error)
        }
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!selectedMarket || selectedMarket === "__none__") {
            toast({
                title: "Erro",
                description: "Por favor, selecione um mercado.",
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
            const res = await api.put(`/agents/${agent.id}`, {
                full_name: fullName,
                phone_number: phoneNumber,
                status: status,
                assigned_market_id: parseInt(selectedMarket),
                requester_notes: requesterNotes || undefined
            })

            if ((res.data as Agent).approval_status === "PENDENTE") {
                toast({
                    title: "Solicitação Enviada",
                    description: "Alteração de mercado fora do seu escopo requer aprovação.",
                    variant: "default",
                    className: "bg-amber-50 border-amber-200 text-amber-800"
                })
            } else {
                toast({
                    title: "Sucesso",
                    description: "Agente atualizado com sucesso.",
                    variant: "success",
                })
            }

            setOpen(false)
            if (onSuccess) onSuccess()
        } catch (error: unknown) {
            console.error("Error updating agent:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Erro ao atualizar agente.",
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
                    <DialogTitle>Editar Agente</DialogTitle>
                    <DialogDescription>
                        Atualize as informações do agente de campo.
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
                            <Label htmlFor="agentCode" className="text-right">Código</Label>
                            <Input
                                id="agentCode"
                                value={agentCode}
                                className="col-span-3 bg-slate-100 font-mono"
                                disabled
                                readOnly
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fullName" className="text-right">Nome *</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="col-span-3"
                                required
                                disabled={isPending}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="phone" className="text-right">Telefone *</Label>
                            <Input
                                id="phone"
                                value={phoneNumber}
                                onChange={(e) => setPhoneNumber(e.target.value)}
                                className="col-span-3"
                                required
                                disabled={isPending}
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="status" className="text-right">Status *</Label>
                            <Select value={status} onValueChange={setStatus} disabled={isPending}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ATIVO">Ativo</SelectItem>
                                    <SelectItem value="INATIVO">Inativo</SelectItem>
                                    <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Província *</Label>
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
                            <Label className="text-right">Município *</Label>
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
                            <Label htmlFor="market" className="text-right">Mercado *</Label>
                            <Select
                                value={selectedMarket}
                                onValueChange={setSelectedMarket}
                                disabled={isPending || !municipality || markets.length === 0}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder={
                                        !municipality
                                            ? "Selecione o município"
                                            : markets.length === 0
                                                ? "Nenhum mercado"
                                                : "Selecionar"
                                    } />
                                </SelectTrigger>
                                <SelectContent>
                                    {markets.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name}
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
