"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, DollarSign, Check, ChevronsUpDown, Smartphone, ScanLine, Tag, AlertCircle } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"
import { Merchant } from "@/types"
import { TaxConfiguration } from "@/types/tax"
import { cn } from "@/lib/utils"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Schema
const baseSchema = z.object({
    merchant_id: z.string().min(1, "Selecione um comerciante"),
    pos_id: z.string().optional(),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "Valor deve ser maior que 0",
    }),
    observation: z.string().min(3, "Observação obrigatória"),
    payment_method: z.enum(["MPESA", "EMOLA", "MKESH", "DINHEIRO"]),
    nfc_uid: z.string().optional(),
    mpesa_number: z.string().optional(), // Must be in base schema to be passed to superRefine
    tax_code: z.string().min(1, "Selecione o tipo de receita/taxa")
})

// Refine schema based on method requirements
const paymentSchema = baseSchema.superRefine((data, ctx) => {
    // Validation Logic
    const validateNumber = (prefixRegex: RegExp, errorMsg: string) => {
        if (!data.mpesa_number || !prefixRegex.test(data.mpesa_number)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: errorMsg,
                path: ["mpesa_number"]
            })
        }
    }

    if (data.payment_method === "MPESA") {
        validateNumber(/^8[45][0-9]{7}$/, "M-Pesa deve iniciar com 84 ou 85")
    } else if (data.payment_method === "EMOLA") {
        validateNumber(/^8[67][0-9]{7}$/, "e-Mola deve iniciar com 86 ou 87")
    } else if (data.payment_method === "MKESH") {
        validateNumber(/^8[23][0-9]{7}$/, "mKesh deve iniciar com 82 ou 83")
    }
})

interface NewPaymentDialogProps {
    onSuccess?: () => void
}

export function NewPaymentDialog({ onSuccess }: NewPaymentDialogProps) {
    const [open, setOpen] = useState(false)
    const { toast } = useToast()
    const router = useRouter()

    const [merchants, setMerchants] = useState<Merchant[]>([])
    const [loadingMerchants, setLoadingMerchants] = useState(false)
    const [merchantOpen, setMerchantOpen] = useState(false)
    const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null)

    // Taxes
    const [taxes, setTaxes] = useState<TaxConfiguration[]>([])
    const [selectedTax, setSelectedTax] = useState<TaxConfiguration | null>(null)

    const form = useForm<z.infer<typeof baseSchema> & { mpesa_number?: string }>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            merchant_id: "",
            pos_id: "",
            amount: "",
            mpesa_number: "",
            observation: "",
            payment_method: "MPESA",
            nfc_uid: "",
            tax_code: "" // Default empty (General Payment)
        }
    })

    const watchMethod = form.watch("payment_method")

    // Fetch Lists (Merchants & Taxes)
    useEffect(() => {
        if (open) {
            const fetchData = async () => {
                setLoadingMerchants(true)
                try {
                    const [merchantsRes, taxesRes] = await Promise.all([
                        api.get("/merchants/"),
                        api.get("/taxes/")
                    ])
                    setMerchants(merchantsRes.data)
                    setTaxes(taxesRes.data)
                } catch (error) {
                    console.error("Error fetching data", error)
                    toast({ title: "Erro", description: "Falha ao carregar dados iniciais", variant: "destructive" })
                } finally {
                    setLoadingMerchants(false)
                }
            }
            fetchData()
        }
    }, [open, toast])

    // Effect: Update phone number when method changes
    useEffect(() => {
        if (selectedMerchant) {
            const m = selectedMerchant as any
            if (watchMethod === "MPESA") form.setValue("mpesa_number", m.mpesa_number || "")
            else if (watchMethod === "EMOLA") form.setValue("mpesa_number", m.emola_number || "")
            else if (watchMethod === "MKESH") form.setValue("mpesa_number", m.mkesh_number || "")
            else if (watchMethod === "DINHEIRO") form.setValue("mpesa_number", "") // Clear for cash
        }
    }, [watchMethod, selectedMerchant, form])

    // Effect: Reverse Lookup NFC -> Merchant
    const watchNfc = form.watch("nfc_uid")
    useEffect(() => {
        if (!watchNfc || watchNfc.length < 3) return // Avoid too short triggers

        // Find merchant with this NFC
        const match = merchants.find((m: any) => m.nfc_uid === watchNfc)

        if (match && (!selectedMerchant || selectedMerchant.id !== match.id)) {
            handleSelectMerchant(match)
            toast({
                title: "Comerciante Encontrado",
                description: `NFC associado a ${match.full_name}`,
                variant: 'default',
            })
        }
    }, [watchNfc, merchants, selectedMerchant])

    // Handle Merchant Selection
    const handleSelectMerchant = (merchant: Merchant) => {
        setSelectedMerchant(merchant)
        form.setValue("merchant_id", merchant.id.toString())
        setMerchantOpen(false)

        const m = merchant as any
        // Auto-fill NFC
        form.setValue("nfc_uid", m.nfc_uid || "")

        // Check availability and default method
        const methods = []
        if (m.mpesa_number) methods.push("MPESA")
        if (m.emola_number) methods.push("EMOLA")
        if (m.mkesh_number) methods.push("MKESH")
        methods.push("DINHEIRO")

        // If current method is not available for this merchant (and not Cash), switch
        if (watchMethod !== "DINHEIRO" && !methods.includes(watchMethod)) {
            // Default to MPESA if available, else Cash
            if (methods.includes("MPESA")) form.setValue("payment_method", "MPESA")
            else form.setValue("payment_method", "DINHEIRO")
        }
    }

    // Handle Tax Selection
    const handleSelectTax = (code: string) => {
        if (!code || code === "GENERAL") {
            setSelectedTax(null)
            form.setValue("observation", "")
            return
        }

        const tax = taxes.find(t => t.code === code)
        setSelectedTax(tax || null)

        if (tax?.is_fixed_amount && tax.default_amount) {
            form.setValue("amount", tax.default_amount.toString())
            form.setValue("observation", `Pagamento de ${tax.name}`)
        } else {
            if (tax) form.setValue("observation", `Pagamento de ${tax.name}`)
        }
    }

    // Determine available methods for UI
    const getAvailableMethods = () => {
        // All methods always available - user can enter any number manually
        return ["DINHEIRO", "MPESA", "EMOLA", "MKESH"]
    }

    const availableMethods = getAvailableMethods()

    const onSubmit = async (values: any) => {
        try {
            // Basic Check before submit
            if ((values.payment_method === "EMOLA" || values.payment_method === "MKESH")) {
                toast({
                    title: "Em Breve",
                    description: `Integração com ${values.payment_method} indisponível no momento.`,
                    variant: "warning"
                })
                return
            }

            const res = await api.post("/payments/", {
                merchant_id: parseInt(values.merchant_id),
                pos_id: values.pos_id ? parseInt(values.pos_id) : null,
                amount: parseFloat(values.amount),
                mpesa_number: values.payment_method === "DINHEIRO" ? "820000000" : values.mpesa_number,
                observation: values.observation,
                payment_method: values.payment_method,
                nfc_uid: values.nfc_uid || null,
                tax_code: values.tax_code // Send tax_code from database
            })

            const transaction = res.data

            if (transaction.status === "SUCESSO") {
                toast({
                    title: "Pagamento Concluído",
                    description: `Transação ${transaction.payment_reference} realizada com sucesso!`,
                    variant: "success",
                })
                // Redirect to Receipt Page immediately
                router.push(`/transactions/${transaction.transaction_uuid}`)
            } else {
                const errorMsg = transaction.response_payload?.error || "Motivo desconhecido"
                toast({
                    title: "Falha no Pagamento",
                    description: `Ocorreu um erro: ${errorMsg}`,
                    variant: "destructive",
                })
            }
        } catch (error: any) {
            console.error(error)
            toast({
                title: "Erro no Pagamento",
                description: error.response?.data?.detail || "Falha ao processar pagamento ou Timeout.",
                variant: "destructive",
            })
        } finally {
            form.reset()
            setOpen(false)
            setSelectedMerchant(null)
            setSelectedTax(null)
            if (onSuccess) onSuccess()
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm font-semibold">
                    <Plus className="mr-2 h-4 w-4" /> Nova Cobrança
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] bg-white">
                <DialogHeader>
                    <DialogTitle>Nova Cobrança Web</DialogTitle>
                    <DialogDescription>
                        Envie uma solicitação de pagamento ou registre um pagamento em espécie.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* MERCHANT SEARCH */}
                        <FormField
                            control={form.control}
                            name="merchant_id"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Comerciante (Pesquisa Inteligente)</FormLabel>
                                    <Popover open={merchantOpen} onOpenChange={setMerchantOpen} modal={true}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    aria-expanded={merchantOpen}
                                                    className={cn(
                                                        "w-full justify-between",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value
                                                        ? merchants.find((m) => m.id.toString() === field.value)?.full_name
                                                        : "Buscar por nome ou negócio..."}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0 bg-white shadow-xl z-[9999]">
                                            <Command className="bg-white">
                                                <CommandInput placeholder="Digite nome ou empresa..." />
                                                <CommandList>
                                                    <CommandEmpty>Nenhum comerciante encontrado.</CommandEmpty>
                                                    <CommandGroup>
                                                        {merchants.map((merchant) => (
                                                            <CommandItem
                                                                value={`${merchant.full_name} ${merchant.business_name || ""}`}
                                                                key={merchant.id}
                                                                onSelect={() => handleSelectMerchant(merchant)}
                                                                className="cursor-pointer data-[disabled]:opacity-100 data-[disabled]:pointer-events-auto"
                                                            >
                                                                <Check
                                                                    className={cn(
                                                                        "mr-2 h-4 w-4",
                                                                        merchant.id.toString() === field.value
                                                                            ? "opacity-100"
                                                                            : "opacity-0"
                                                                    )}
                                                                />
                                                                <div className="flex flex-col">
                                                                    <span className="font-medium">{merchant.full_name}</span>
                                                                    <span className="text-xs text-muted-foreground">{merchant.business_name || "Sem nome comercial"}</span>
                                                                </div>
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* TAX TYPE */}
                        {selectedMerchant && (
                            <FormField
                                control={form.control}
                                name="tax_code"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tipo de Receita / Taxa *</FormLabel>
                                        <Select
                                            onValueChange={(val) => {
                                                field.onChange(val)
                                                handleSelectTax(val)
                                            }}
                                            defaultValue={field.value}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione o tipo..." />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {taxes.map((tax) => (
                                                    <SelectItem key={tax.code} value={tax.code}>
                                                        {tax.name} {tax.is_fixed_amount && `(${tax.default_amount} MT)`}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* NFC & AMOUNT ROW */}
                        <div className="grid grid-cols-2 gap-4">
                            {/* NFC (Optional) */}
                            <FormField
                                control={form.control}
                                name="nfc_uid"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>NFC (Opcional)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <ScanLine className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                <Input placeholder="UID..." {...field} className="pl-9" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* AMOUNT */}
                            <FormField
                                control={form.control}
                                name="amount"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Valor (MZN)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-emerald-600" />
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    {...field}
                                                    className={cn("pl-9 font-bold text-emerald-700", selectedTax?.is_fixed_amount && "bg-slate-100")}
                                                    placeholder="0.00"
                                                    disabled={selectedTax?.is_fixed_amount}
                                                />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* PAYMENT METHOD TABS */}
                        <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de Pagamento</FormLabel>
                                    <FormControl>
                                        <Tabs value={field.value} onValueChange={field.onChange} className="w-full">
                                            <TabsList className="grid w-full grid-cols-4">
                                                <TabsTrigger value="MPESA" disabled={!availableMethods.includes("MPESA")}>M-Pesa</TabsTrigger>
                                                <TabsTrigger value="EMOLA" disabled={!availableMethods.includes("EMOLA")}>e-Mola</TabsTrigger>
                                                <TabsTrigger value="MKESH" disabled={!availableMethods.includes("MKESH")}>mKesh</TabsTrigger>
                                                <TabsTrigger value="DINHEIRO" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-800">Dinheiro</TabsTrigger>
                                            </TabsList>
                                        </Tabs>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* CUSTOMER NUMBER (Hidden for DINHEIRO) */}
                        {watchMethod !== "DINHEIRO" && (
                            <FormField
                                control={form.control}
                                name="mpesa_number"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Número do Cliente (Pagador)</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <Smartphone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                                <Input placeholder="84/85xxxxxxx" {...field} maxLength={9} className="pl-9" />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* OBS */}
                        <FormField
                            control={form.control}
                            name="observation"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Observação</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                                            <Input placeholder="Referência ou detalhe..." {...field} className="pl-9" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />


                        {/* WARNING: SUSPENDED MERCHANT */}
                        {selectedMerchant && selectedMerchant.status !== "ATIVO" && (
                            <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-700 flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600" />
                                <span className="font-medium">
                                    Atenção: Este comerciante está {selectedMerchant.status}. Não é possível realizar pagamentos.
                                </span>
                            </div>
                        )}

                        <DialogFooter className="pt-4">
                            <Button
                                type="submit"
                                disabled={form.formState.isSubmitting || (selectedMerchant ? selectedMerchant.status !== "ATIVO" : false)}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {form.formState.isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                                    </>
                                ) : (
                                    "Solicitar Pagamento"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
