"use client"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Copy, CheckCircle } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface RotatedKeyDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    newKey: string
}

export function RotatedKeyDialog({ open, onOpenChange, newKey }: RotatedKeyDialogProps) {
    const [copied, setCopied] = useState(false)

    const copyToClipboard = () => {
        navigator.clipboard.writeText(newKey)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-emerald-600 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Chave Rotacionada com Sucesso
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                        Esta é a nova chave de API para o dispositivo. <br />
                        <span className="font-bold text-red-500">
                            ATENÇÃO: Ela só será exibida desta vez. Copie-a imediatamente.
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <div className="flex items-center space-x-2 my-4 p-4 bg-slate-100 rounded-md border text-center relative group">
                    <code className="flex-1 font-mono text-sm break-all text-slate-800 tracking-wide selection:bg-emerald-200">
                        {newKey}
                    </code>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white shadow-sm"
                        onClick={copyToClipboard}
                    >
                        {copied ? (
                            <CheckCircle className="h-4 w-4 text-emerald-500" />
                        ) : (
                            <Copy className="h-4 w-4 text-slate-500" />
                        )}
                    </Button>
                </div>

                <AlertDialogFooter>
                    <AlertDialogAction onClick={() => onOpenChange(false)}>
                        Entendido, fechar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
