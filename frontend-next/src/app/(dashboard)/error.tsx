"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw, AlertTriangle, ArrowLeft } from "lucide-react"
import Link from "next/link"

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function DashboardError({ error, reset }: ErrorProps) {
    useEffect(() => {
        console.error("Dashboard Error:", error)
    }, [error])

    return (
        <div className="flex-1 flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                {/* Error Icon */}
                <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-orange-100 flex items-center justify-center mb-6">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                        <AlertTriangle className="h-7 w-7 text-white" />
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-2xl font-bold text-slate-800 mb-2">
                    Ocorreu um Erro
                </h2>

                {/* Description */}
                <p className="text-slate-600 mb-6">
                    Não foi possível carregar esta página. Por favor tente novamente ou volte ao dashboard.
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
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button
                        onClick={reset}
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Tentar Novamente
                    </Button>

                    <Button variant="outline" asChild>
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Dashboard
                        </Link>
                    </Button>

                    <Button variant="ghost" onClick={() => window.history.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Voltar
                    </Button>
                </div>
            </div>
        </div>
    )
}
