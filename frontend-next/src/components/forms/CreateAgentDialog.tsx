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
import { Loader2, Plus, CheckCircle, Copy } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Market } from "@/types"
import { useLocations } from "@/hooks/useLocations"

interface CreateAgentDialogProps {
    children?: React.ReactNode
    onSuccess?: () => void
}

export function CreateAgentDialog({ children, onSuccess }: CreateAgentDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Success dialog state
    const [showSuccessDialog, setShowSuccessDialog] = useState(false)
    const [generatedCode, setGeneratedCode] = useState("")
    const [isPendingApproval, setIsPendingApproval] = useState(false)

    const [fullName, setFullName] = useState("")
    const [phoneNumber, setPhoneNumber] = useState("")
    const [pin, setPin] = useState("")
    const [selectedMarket, setSelectedMarket] = useState<string>("")
    const [markets, setMarkets] = useState<Market[]>([])
    const [requesterNotes, setRequesterNotes] = useState<string>("")

    // Province/Municipality selection for VLOOKUP-style filtering
    const [selectedProvinceId, setSelectedProvinceId] = useState("")
    const [municipality, setMunicipality] = useState("")

    // Use locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    // Reset municipality and market when province changes
    useEffect(() => {
        setMunicipality("")
        setSelectedMarket("")
        setMarkets([])
    }, [selectedProvinceId])

    // Fetch markets filtered by municipality when municipality changes (VLOOKUP style)
    useEffect(() => {
        if (municipality) {
            fetchMarketsByMunicipality(municipality)
        } else {
            setMarkets([])
            setSelectedMarket("")
        }
    }, [municipality])

    const fetchMarketsByMunicipality = async (municipalityName: string) => {
        try {
            // Fetch markets filtered by district (municipality)
            const res = await api.get(`/markets/approved-active/`)
            // Filter client-side by municipality
            const allMarkets = res.data as Market[]
            const filteredMarkets = allMarkets.filter(m => m.district === municipalityName)
            setMarkets(filteredMarkets)
        } catch (error) {
            console.error("Error fetching markets:", error)
            setMarkets([])
        }
    }

    const resetForm = () => {
        setFullName("")
        setPhoneNumber("")
        setPin("")
        setSelectedMarket("")
        setSelectedProvinceId("")
        setMunicipality("")
        setMarkets([])
        setRequesterNotes("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        // Validate mandatory market
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
            const data = {
                full_name: fullName,
                phone_number: phoneNumber,
                pin: pin,
                assigned_market_id: parseInt(selectedMarket),
                requester_notes: requesterNotes || undefined
            }

            const res = await api.post("/agents/", data)
            const createdAgent = res.data as { agent_code: string; approval_status?: string }

            // Store generated code and show success dialog
            setGeneratedCode(createdAgent.agent_code)
            setIsPendingApproval(createdAgent.approval_status === "PENDENTE")
            setOpen(false)
            resetForm()
            setShowSuccessDialog(true)

            if (onSuccess) onSuccess()
        } catch (error: unknown) {
            console.error("Error creating agent:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            const errorMessage = axiosError.response?.data?.detail || "Erro ao criar agente."
            toast({
                title: "Erro",
                description: errorMessage,
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedCode)
        toast({
            title: "Copiado!",
            description: "Código do agente copiado para área de transferência.",
            variant: "success"
        })
    }

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    {children || (
                        <Button className="bg-emerald-600 hover:bg-emerald-700">
                            <Plus className="mr-2 h-4 w-4" /> Novo Agente
                        </Button>
                    )}
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Novo Agente</DialogTitle>
                        <DialogDescription>
                            Registrar um novo agente cobrador.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit}>
                        <div className="grid gap-4 py-4">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="name" className="text-right">Nome *</Label>
                                <Input
                                    id="name"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    className="col-span-3"
                                    required
                                    placeholder="Nome completo do agente"
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
                                    placeholder="+258 84 XXX XXXX"
                                />
                            </div>

                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="pin" className="text-right">PIN *</Label>
                                <Input
                                    id="pin"
                                    type="password"
                                    value={pin}
                                    onChange={(e) => setPin(e.target.value)}
                                    className="col-span-3"
                                    required
                                    placeholder="PIN de 4-6 dígitos"
                                />
                            </div>

                            {/* Province Selection */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Província *</Label>
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

                            {/* Municipality Selection */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Município *</Label>
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

                            {/* Market Selection - filtered by municipality */}
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="market" className="text-right">Mercado *</Label>
                                <Select
                                    value={selectedMarket}
                                    onValueChange={setSelectedMarket}
                                    disabled={!municipality || markets.length === 0}
                                >
                                    <SelectTrigger className="col-span-3">
                                        <SelectValue placeholder={
                                            !municipality
                                                ? "Selecione o município primeiro"
                                                : markets.length === 0
                                                    ? "Nenhum mercado neste município"
                                                    : "Selecionar mercado"
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

            {/* Success Dialog with Generated Code */}
            <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CheckCircle className={`h-6 w-6 ${isPendingApproval ? 'text-amber-500' : 'text-emerald-500'}`} />
                            {isPendingApproval ? "Solicitação Enviada" : "Agente Criado!"}
                        </DialogTitle>
                        <DialogDescription>
                            {isPendingApproval
                                ? "Criação de agente fora da jurisdição. Aguardando aprovação do administrador."
                                : "O agente foi criado com sucesso."
                            }
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-muted-foreground mb-2">Código do Agente:</p>
                        <div className="flex items-center gap-2">
                            <div className="flex-1 px-4 py-3 bg-slate-100 rounded-md font-mono text-xl font-bold text-center">
                                {generatedCode}
                            </div>
                            <Button variant="outline" size="icon" onClick={copyToClipboard}>
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                            Guarde este código! O agente usará para login no POS.
                        </p>
                    </div>
                    <DialogFooter>
                        <Button onClick={() => setShowSuccessDialog(false)} className="w-full">
                            Entendi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
