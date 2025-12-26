"use client"

import { Button } from "@/components/ui/button"
import { RefreshCw, AlertOctagon, WifiOff } from "lucide-react"

interface GlobalErrorProps {
    error: Error & { digest?: string }
    reset: () => void
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
    return (
        <html lang="pt">
            <body>
                <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-950 to-slate-900">
                    {/* Background Effects */}
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent opacity-50" />
                    </div>

                    <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
                        {/* Critical Error Icon */}
                        <div className="relative mb-8">
                            <div className="w-36 h-36 rounded-full bg-red-500/20 flex items-center justify-center animate-pulse">
                                <div className="w-28 h-28 rounded-full bg-red-500/30 flex items-center justify-center">
                                    <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center shadow-2xl shadow-red-500/50">
                                        <AlertOctagon className="h-10 w-10 text-white" />
                                    </div>
                                </div>
                            </div>
                            {/* Connection indicator */}
                            <div className="absolute -right-1 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-800 border-2 border-red-500">
                                <WifiOff className="h-4 w-4 text-red-400" />
                            </div>
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
                            Erro Crítico
                        </h1>

                        {/* Description */}
                        <p className="text-slate-400 text-lg mb-6 max-w-md">
                            A aplicação encontrou um erro fatal e não consegue continuar. Por favor tente recarregar a página.
                        </p>

                        {/* Error Digest */}
                        {error.digest && (
                            <div className="w-full mb-6 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
                                <span className="text-xs font-mono text-slate-500">
                                    Código de erro: {error.digest}
                                </span>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                            <Button
                                onClick={reset}
                                size="lg"
                                className="bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 transition-all duration-300"
                            >
                                <RefreshCw className="mr-2 h-5 w-5" />
                                Recarregar Aplicação
                            </Button>
                        </div>

                        {/* Footer */}
                        <div className="mt-10 pt-6 border-t border-slate-800 w-full">
                            <p className="text-xs text-slate-600">
                                PaySafe System • Se o problema persistir, contacte o administrador
                            </p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    )
}
