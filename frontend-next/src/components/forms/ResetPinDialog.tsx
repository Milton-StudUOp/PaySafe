"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import api from "@/lib/api"
import { Loader2, KeyRound, Copy, Check } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface ResetPinDialogProps {
    children: React.ReactNode
    agentId: number
}

export function ResetPinDialog({ children, agentId }: ResetPinDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [newPin, setNewPin] = useState<string | null>(null)
    const [copied, setCopied] = useState(false)
    const { toast } = useToast()

    const handleReset = async () => {
        setLoading(true)
        try {
            const res = await api.post(`/agents/${agentId}/reset-pin`)
            setNewPin(res.data.new_pin)

            toast({
                title: "PIN Resetado",
                description: "Novo PIN gerado com sucesso.",
                variant: "success",
            })
        } catch (error: any) {
            console.error("Error resetting PIN:", error)
            toast({
                title: "Erro",
                description: error.response?.data?.detail || "Falha ao resetar PIN.",
                variant: "destructive",
            })
            setOpen(false) // Close on error
        } finally {
            setLoading(false)
        }
    }

    const handleCopy = () => {
        if (newPin) {
            navigator.clipboard.writeText(newPin)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    const handleClose = () => {
        setOpen(false)
        setNewPin(null) // Reset state when closing
        setCopied(false)
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && handleClose()}>
            <DialogTrigger asChild onClick={() => setOpen(true)}>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle>Resetar PIN de Acesso</DialogTitle>
                    <DialogDescription>
                        Esta ação irá gerar um novo PIN aleatório para o agente. O PIN anterior será invalidado.
                    </DialogDescription>
                </DialogHeader>

                {!newPin ? (
                    <div className="py-6 flex justify-center">
                        <div className="text-center space-y-4">
                            <KeyRound className="h-12 w-12 mx-auto text-slate-300" />
                            <p className="text-sm text-slate-600">Deseja confirmar a geração de um novo PIN?</p>
                        </div>
                    </div>
                ) : (
                    <div className="py-6 flex flex-col items-center space-y-4">
                        <div className="bg-slate-100 dark:bg-slate-800 p-6 rounded-lg w-full text-center border border-slate-200">
                            <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Novo PIN</p>
                            <p className="text-4xl font-mono font-bold tracking-widest text-slate-900">{newPin}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={handleCopy} className="text-slate-500">
                            {copied ? <Check className="mr-2 h-4 w-4 text-emerald-500" /> : <Copy className="mr-2 h-4 w-4" />}
                            {copied ? "Copiado!" : "Copiar PIN"}
                        </Button>
                        <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded w-full text-center">
                            Atenção: Este código será exibido apenas uma vez.
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {!newPin ? (
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">Cancelar</Button>
                            <Button variant="destructive" onClick={handleReset} disabled={loading} className="flex-1">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Reset
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={handleClose} className="w-full">Concluir</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
