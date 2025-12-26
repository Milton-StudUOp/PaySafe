"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle, Home, LogOut } from "lucide-react"
import Link from "next/link"

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function MerchantError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Merchant Error:", error)
    }, [error])

    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* Error Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center mb-6 shadow-lg">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <AlertTriangle className="h-7 w-7 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    Erro no Portal
                </h2>

                {/* Description */}
                <p className="text-slate-600 mb-6">
                    Ocorreu um problema ao carregar esta página. Por favor tente novamente.
                </p>

                {/* Error Details (Development) */}
                {process.env.NODE_ENV === "development" && error.message && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-left">
                        <p className="text-xs font-mono text-red-600 break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={reset}
                        size="lg"
                        className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700"
                    >
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Tentar Novamente
                    </Button>

                    <Button variant="outline" size="lg" asChild className="w-full">
                        <Link href="/merchant/dashboard">
                            <Home className="mr-2 h-5 w-5" />
                            Voltar ao Início
                        </Link>
                    </Button>

                    <Button variant="ghost" size="lg" asChild className="w-full text-slate-500">
                        <Link href="/login">
                            <LogOut className="mr-2 h-5 w-5" />
                            Sair
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    )
}
