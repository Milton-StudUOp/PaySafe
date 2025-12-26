"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { RefreshCw, AlertTriangle } from "lucide-react"
import Link from "next/link"

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function AuthError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Auth Error:", error)
    }, [error])

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-red-900 p-6">
            <div className="max-w-md w-full text-center">
                {/* Error Icon */}
                <div className="mx-auto w-24 h-24 rounded-2xl bg-red-500/20 flex items-center justify-center mb-8">
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <AlertTriangle className="h-8 w-8 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-3xl font-bold text-white mb-3">
                    Erro de Autenticação
                </h2>

                {/* Description */}
                <p className="text-slate-400 mb-8">
                    Ocorreu um problema durante o processo de autenticação. Por favor tente novamente.
                </p>

                {/* Error Details (Development) */}
                {process.env.NODE_ENV === "development" && error.message && (
                    <div className="mb-8 p-4 bg-red-950/50 border border-red-800 rounded-lg text-left">
                        <p className="text-xs font-mono text-red-400 break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    <Button
                        onClick={reset}
                        size="lg"
                        className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    >
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Tentar Novamente
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        asChild
                        className="w-full border-white/20 text-white hover:bg-white/10"
                    >
                        <Link href="/login">
                            Voltar ao Login
                        </Link>
                    </Button>
                </div>

                {/* Footer */}
                <p className="mt-8 text-sm text-slate-500">
                    PaySafe System
                </p>
            </div>
        </div>
    )
}
