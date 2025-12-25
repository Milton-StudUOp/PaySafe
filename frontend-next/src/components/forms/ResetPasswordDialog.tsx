"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, AlertTriangle, Key } from "lucide-react"
import api from "@/lib/api"
import { useToast } from "@/components/ui/use-toast"

interface ResetPasswordDialogProps {
    userId: number;
    userName: string;
    children?: React.ReactNode;
    onSuccess?: () => void;
}

export function ResetPasswordDialog({ userId, userName, children, onSuccess }: ResetPasswordDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [tempPassword, setTempPassword] = useState<string | null>(null)
    const { toast } = useToast()

    const handleReset = async () => {
        setLoading(true)
        try {
            const res = await api.post(`/users/${userId}/reset-password`)
            setTempPassword(res.data.temp_password)

            toast({
                title: "Sucesso",
                description: "Senha resetada com sucesso.",
                variant: "success",
            })

            if (onSuccess) onSuccess()
        } catch (error: any) {
            console.error("Error resetting password:", error)
            toast({
                title: "Erro",
                description: error.response?.data?.detail || "Falha ao resetar senha.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    const copyToClipboard = () => {
        if (tempPassword) {
            navigator.clipboard.writeText(tempPassword)
            toast({
                title: "Copiado",
                description: "Senha copiada para área de transferência.",
            })
        }
    }

    const handleClose = () => {
        setOpen(false)
        setTempPassword(null) // Clear on close
    }

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) handleClose()
            setOpen(val)
        }}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                {!tempPassword ? (
                    <>
                        <DialogHeader>
                            <DialogTitle>Resetar Senha</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja resetar a senha de <strong>{userName}</strong>?
                                <br />
                                Uma senha temporária será gerada e mostrada apenas uma vez.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="flex items-center gap-4 bg-orange-50 p-4 rounded-md border border-orange-100 text-orange-800 text-sm">
                            <AlertTriangle className="h-5 w-5 shrink-0" />
                            <p>O usuário perderá acesso imediato até fazer login com a nova senha.</p>
                        </div>

                        <DialogFooter className="mt-4">
                            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
                            <Button onClick={handleReset} disabled={loading} variant="destructive">
                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmar Reset
                            </Button>
                        </DialogFooter>
                    </>
                ) : (
                    <>
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2 text-emerald-600">
                                <Key className="h-5 w-5" /> Senha Gerada
                            </DialogTitle>
                            <DialogDescription>
                                Copie a senha abaixo e envie para o usuário. Ela não será mostrada novamente.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="flex items-center gap-2">
                                <code className="flex-1 bg-slate-100 p-3 rounded border font-mono text-lg text-center tracking-wider select-all">
                                    {tempPassword}
                                </code>
                                <Button size="icon" variant="outline" onClick={copyToClipboard}>
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button onClick={handleClose} className="w-full">Concluir</Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
