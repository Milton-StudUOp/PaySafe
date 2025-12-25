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
import { Market } from "@/types"

interface CreateMerchantDialogProps {
    children?: React.ReactNode
    onSuccess?: () => void
}

export function CreateMerchantDialog({ children, onSuccess }: CreateMerchantDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    const [fullName, setFullName] = useState("")
    const [merchantType, setMerchantType] = useState<"FIXO" | "AMBULANTE">("FIXO")
    const [businessType, setBusinessType] = useState("")
    const [businessName, setBusinessName] = useState("")  // Nome Comercial
    const [phoneNumber, setPhoneNumber] = useState("")
    const [password, setPassword] = useState("")
    const [nfcUid, setNfcUid] = useState("")
    const [selectedMarket, setSelectedMarket] = useState<string>("")
    const [markets, setMarkets] = useState<Market[]>([])

    // Mobile Money
    const [mobileOperator, setMobileOperator] = useState("")
    const [mpesaNumber, setMpesaNumber] = useState("")
    const [emolaNumber, setEmolaNumber] = useState("")
    const [mkeshNumber, setMkeshNumber] = useState("")

    // KYC
    const [idDocType, setIdDocType] = useState("")
    const [idDocNumber, setIdDocNumber] = useState("")
    const [idDocExpiry, setIdDocExpiry] = useState("")

    // Observation (required)
    const [requesterNotes, setRequesterNotes] = useState("")

    useEffect(() => {
        if (open) {
            fetchMarkets()
        }
    }, [open])

    const fetchMarkets = async () => {
        try {
            // Only fetch approved and active markets
            const res = await api.get("/markets/approved-active/")
            setMarkets(res.data)
        } catch (error) {
            console.error("Error fetching markets:", error)
        }
    }

    const resetForm = () => {
        setFullName("")
        setMerchantType("FIXO")
        setBusinessType("")
        setBusinessName("")
        setPhoneNumber("")
        setPassword("")
        setNfcUid("")
        setSelectedMarket("")
        setMobileOperator("")
        setMpesaNumber("")
        setEmolaNumber("")
        setMkeshNumber("")
        setIdDocType("")
        setIdDocNumber("")
        setIdDocExpiry("")
        setRequesterNotes("")
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()

        if (!selectedMarket) {
            toast({
                title: "Erro",
                description: "Por favor, selecione um mercado.",
                variant: "destructive"
            })
            return
        }

        // KYC Validation for FIXO merchants
        if (merchantType === "FIXO") {
            const missingFields: string[] = []
            if (!nfcUid) missingFields.push("NFC UID")
            if (!phoneNumber) missingFields.push("Telefone")
            if (!password) missingFields.push("Senha")
            if (!idDocType) missingFields.push("Tipo de Documento")
            if (!idDocNumber) missingFields.push("Número do Documento")
            if (!idDocExpiry) missingFields.push("Validade do Documento")

            if (missingFields.length > 0) {
                toast({
                    title: "Campos Obrigatórios (Comerciante FIXO)",
                    description: `Preencha: ${missingFields.join(", ")}`,
                    variant: "destructive"
                })
                return
            }
        }

        setLoading(true)

        // Validate observation
        if (!requesterNotes || requesterNotes.trim().length === 0) {
            toast({
                title: "Erro",
                description: "Por favor, preencha a observação/justificativa.",
                variant: "destructive"
            })
            setLoading(false)
            return
        }

        try {
            const res = await api.post("/merchants/", {
                full_name: fullName,
                merchant_type: merchantType,
                business_type: businessType,
                business_name: businessName || null,
                market_id: parseInt(selectedMarket),
                status: "ATIVO",
                phone_number: phoneNumber || null,
                password: password || null,
                nfc_uid: nfcUid || null,
                id_document_type: idDocType || null,
                id_document_number: idDocNumber || null,
                id_document_expiry: idDocExpiry || null,
                mobile_operator: mobileOperator || null,
                mpesa_number: mpesaNumber || null,
                emola_number: emolaNumber || null,
                mkesh_number: mkeshNumber || null,
                requester_notes: requesterNotes
            })

            if ((res.data as any).approval_status === "PENDENTE") {
                toast({
                    title: "Solicitação Enviada",
                    description: "Criação fora da jurisdição requer aprovação. Enviado ao administrador.",
                    variant: "default",
                    className: "bg-amber-50 border-amber-200 text-amber-800"
                })
            } else {
                toast({
                    title: "Sucesso",
                    description: "Comerciante criado com sucesso.",
                    variant: "success",
                })
            }

            setOpen(false)
            resetForm()
            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error("Error creating merchant:", error)
            const errorMessage = error.response?.data?.detail || "Erro ao criar comerciante."
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
                        <Plus className="mr-2 h-4 w-4" /> Novo Comerciante
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Novo Comerciante</DialogTitle>
                    <DialogDescription>
                        Registrar um novo comerciante no sistema.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="grid gap-4 py-4">
                        {/* Basic Info */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="fullName" className="text-right">Nome *</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                className="col-span-3"
                                required
                                placeholder="Nome completo"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="merchantType" className="text-right">Tipo *</Label>
                            <Select value={merchantType} onValueChange={(v: "FIXO" | "AMBULANTE") => setMerchantType(v)}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FIXO">Fixo</SelectItem>
                                    <SelectItem value="AMBULANTE">Ambulante</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="businessType" className="text-right">Negócio *</Label>
                            <Input
                                id="businessType"
                                value={businessType}
                                onChange={(e) => setBusinessType(e.target.value)}
                                className="col-span-3"
                                required
                                placeholder="Ex: Restaurante, Loja de Roupa"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="businessName" className="text-right">Nome Comercial</Label>
                            <Input
                                id="businessName"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: Barraca do João"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="market" className="text-right">Mercado *</Label>
                            <Select value={selectedMarket} onValueChange={setSelectedMarket}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecionar mercado" />
                                </SelectTrigger>
                                <SelectContent>
                                    {markets.map(m => (
                                        <SelectItem key={m.id} value={m.id.toString()}>
                                            {m.name} ({m.province})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* KYC Fields - Only show for FIXO merchants */}
                        {merchantType === "FIXO" && (
                            <>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="phone" className="text-right">
                                        Telefone <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="phone"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="col-span-3"
                                        placeholder="+258 84 XXX XXXX"
                                    />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="password" className="text-right">
                                        Senha <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Senha de acesso"
                                    />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="nfcUid" className="text-right">
                                        NFC UID <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="nfcUid"
                                        value={nfcUid}
                                        onChange={(e) => setNfcUid(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Código NFC do cartão"
                                    />
                                </div>

                                {/* KYC Document Section */}
                                <div className="border-t pt-4 mt-2">
                                    <Label className="text-slate-500 text-sm">
                                        Documentação (KYC) <span className="text-red-500">- Obrigatório</span>
                                    </Label>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="idDocType" className="text-right">
                                        Tipo Doc <span className="text-red-500">*</span>
                                    </Label>
                                    <select
                                        id="idDocType"
                                        value={idDocType}
                                        onChange={(e) => setIdDocType(e.target.value)}
                                        className="col-span-3 flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                    >
                                        <option value="">Selecionar tipo</option>
                                        <option value="BI">BI</option>
                                        <option value="PASSAPORTE">Passaporte</option>
                                        <option value="DIRE">DIRE</option>
                                        <option value="OUTRO">Outro</option>
                                    </select>
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="idDocNumber" className="text-right">
                                        Nº Doc <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="idDocNumber"
                                        value={idDocNumber}
                                        onChange={(e) => setIdDocNumber(e.target.value)}
                                        className="col-span-3"
                                        placeholder="Número do documento"
                                    />
                                </div>

                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="idDocExpiry" className="text-right">
                                        Validade <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="idDocExpiry"
                                        type="date"
                                        value={idDocExpiry}
                                        onChange={(e) => setIdDocExpiry(e.target.value)}
                                        className="col-span-3"
                                    />
                                </div>
                            </>
                        )}

                        {/* Separator */}
                        <div className="border-t pt-4 mt-2">
                            <Label className="text-slate-500 text-sm">Pagamentos Móveis (Opcional)</Label>
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="mpesa" className="text-right">M-Pesa</Label>
                            <Input
                                id="mpesa"
                                value={mpesaNumber}
                                onChange={(e) => setMpesaNumber(e.target.value)}
                                className="col-span-3"
                                placeholder="Número M-Pesa"
                            />
                        </div>

                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="emola" className="text-right">e-Mola</Label>
                            <Input
                                id="emola"
                                value={emolaNumber}
                                onChange={(e) => setEmolaNumber(e.target.value)}
                                className="col-span-3"
                                placeholder="Número e-Mola"
                            />
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
        </Dialog >
    )
}
