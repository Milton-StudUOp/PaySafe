"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Loader2 } from "lucide-react"

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
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import api from "@/lib/api"
import { TaxConfiguration } from "@/types/tax"

const formSchema = z.object({
    tax_code: z.string().min(1, "Selecione o tipo de taxa/imposto."),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
        message: "O valor deve ser maior que 0.",
    }),
    payment_method: z.enum(["MPESA", "EMOLA", "MKESH"], {
        message: "Selecione o método de pagamento.",
    }),
    phone_number: z.string().min(9, "Número inválido").optional(),
})

interface PayTaxDialogProps {
    merchantId: number
    onSuccess?: () => void
    children?: React.ReactNode
}

export function PayTaxDialog({ merchantId, onSuccess, children }: PayTaxDialogProps) {
    const [open, setOpen] = useState(false)
    const [taxes, setTaxes] = useState<TaxConfiguration[]>([])
    const [loadingTaxes, setLoadingTaxes] = useState(false)
    const [processing, setProcessing] = useState(false)
    const [selectedTax, setSelectedTax] = useState<TaxConfiguration | null>(null)
    const { toast } = useToast()
    const router = useRouter()

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            payment_method: "MPESA",
            amount: "",
            phone_number: "",
        },
    })

    useEffect(() => {
        if (open) {
            fetchTaxes()
        }
    }, [open])

    const fetchTaxes = async () => {
        try {
            setLoadingTaxes(true)
            const res = await api.get("/taxes/") // Active only by default
            setTaxes(res.data)
        } catch (error) {
            console.error(error)
            toast({
                title: "Erro",
                description: "Não foi possível carregar a lista de taxas.",
                variant: "destructive",
            })
        } finally {
            setLoadingTaxes(false)
        }
    }

    const onTaxSelect = (code: string) => {
        const tax = taxes.find(t => t.code === code)
        setSelectedTax(tax || null)

        if (tax?.is_fixed_amount && tax.default_amount) {
            // Set fixed amount and trigger validation
            form.setValue("amount", tax.default_amount.toString())
        } else {
            form.setValue("amount", "")
        }
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        try {
            setProcessing(true)

            // Real Payment Flow using /payments/ endpoint
            const res = await api.post("/payments/", {
                merchant_id: merchantId,
                amount: Number(values.amount),
                payment_method: values.payment_method,
                tax_code: values.tax_code,
                mpesa_number: values.phone_number,
                phone_number: values.phone_number,
                observation: `Pagamento via Portal: ${values.tax_code || 'Geral'}`,
                // Add nfc_uid if needed, or other fields
            })

            const transaction = res.data

            if (transaction.status === "SUCESSO") {
                toast({
                    title: "Pagamento Realizado!",
                    description: `Transação ${transaction.payment_reference || ""} concluída.`,
                    variant: "default" // success variant if available
                })
                setOpen(false)
                form.reset()
                setSelectedTax(null)
                if (onSuccess) onSuccess()

                // Redirect to Receipt
                router.push(`/merchant/receipts/${transaction.transaction_uuid}`)
            } else {
                const errorMsg = transaction.response_payload?.error || "Pagamento recusado ou pendente."
                toast({
                    title: "Pagamento não concluído",
                    description: errorMsg,
                    variant: "destructive",
                })
            }

        } catch (error) {
            console.error(error)
            toast({
                title: "Erro no Pagamento",
                description: "Não foi possível processar o pagamento.",
                variant: "destructive",
            })
        } finally {
            setProcessing(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || <Button>Pagar Taxa/Imposto</Button>}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Pagamento de Taxa Municipal</DialogTitle>
                    <DialogDescription>
                        Selecione o tipo de taxa e realize o pagamento.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <FormField
                            control={form.control}
                            name="tax_code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Tipo de Receita</FormLabel>
                                    <Select
                                        onValueChange={(val) => {
                                            field.onChange(val)
                                            onTaxSelect(val)
                                        }}
                                        defaultValue={field.value}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={loadingTaxes ? "Carregando..." : "Selecione..."} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {taxes.map((tax) => (
                                                <SelectItem key={tax.code} value={tax.code}>
                                                    {tax.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Valor (MT)</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder="0.00"
                                            {...field}
                                            disabled={selectedTax?.is_fixed_amount}
                                            className={selectedTax?.is_fixed_amount ? "bg-slate-100" : ""}
                                        />
                                    </FormControl>
                                    {selectedTax?.is_fixed_amount && (
                                        <p className="text-xs text-muted-foreground">Valor fixo definido pelo município.</p>
                                    )}
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="payment_method"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Método de Pagamento</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="MPESA">M-Pesa</SelectItem>
                                            <SelectItem value="EMOLA">e-Mola</SelectItem>
                                            <SelectItem value="MKESH">mKesh</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="phone_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Número de Celular</FormLabel>
                                    <FormControl>
                                        <Input placeholder="84/85 xxx xxxx" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button type="submit" disabled={processing} className="w-full bg-emerald-600 hover:bg-emerald-700">
                                {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Efetuar Pagamento
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
