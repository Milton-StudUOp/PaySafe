"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Home, RefreshCw, AlertTriangle, Bug } from "lucide-react"
import Link from "next/link"

interface ErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log error to console in development
        console.error("Application Error:", error)
    }, [error])

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-red-50 dark:from-slate-950 dark:via-slate-900 dark:to-red-950">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
                {/* Error Icon Animation */}
                <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-red-100 to-orange-100 dark:from-red-900/30 dark:to-orange-900/30 flex items-center justify-center shadow-xl shadow-red-500/10">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center animate-pulse">
                            <AlertTriangle className="h-12 w-12 text-white" />
                        </div>
                    </div>
                    {/* Floating bug icon */}
                    <div className="absolute -right-2 -bottom-2 p-2 rounded-full bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700">
                        <Bug className="h-5 w-5 text-red-500" />
                    </div>
                </div>

                {/* Error Code */}
                <span className="text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-500 mb-4">
                    500
                </span>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-3">
                    Erro Interno do Sistema
                </h1>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-4 max-w-md">
                    Ocorreu um erro inesperado. A nossa equipa foi notificada e está a trabalhar para resolver o problema.
                </p>

                {/* Error Details (Development) */}
                {process.env.NODE_ENV === "development" && error.message && (
                    <div className="w-full mb-6 p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg text-left">
                        <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                            {error.message}
                        </p>
                        {error.digest && (
                            <p className="text-xs font-mono text-red-400 dark:text-red-500 mt-1">
                                Digest: {error.digest}
                            </p>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button
                        onClick={reset}
                        size="lg"
                        className="bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 shadow-lg shadow-red-500/25 transition-all duration-300"
                    >
                        <RefreshCw className="mr-2 h-5 w-5" />
                        Tentar Novamente
                    </Button>

                    <Button
                        asChild
                        variant="outline"
                        size="lg"
                        className="border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                    >
                        <Link href="/dashboard">
                            <Home className="mr-2 h-5 w-5" />
                            Ir para Dashboard
                        </Link>
                    </Button>
                </div>

                {/* Support Info */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 w-full">
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Se o problema persistir, contacte o suporte técnico.
                    </p>
                </div>
            </div>
        </div>
    )
}
