"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Home, ArrowLeft, AlertCircle } from "lucide-react"

export default function NotFound() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
                {/* 404 Large Text */}
                <div className="relative mb-6">
                    <span className="text-[150px] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-emerald-400 to-emerald-600 select-none">
                        404
                    </span>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="p-4 rounded-full bg-gradient-to-br from-orange-400 to-red-500 shadow-lg shadow-red-500/25 animate-bounce">
                            <AlertCircle className="h-8 w-8 text-white" />
                        </div>
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-white mb-3">
                    Página Não Encontrada
                </h1>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-8 max-w-md">
                    O recurso que procura não existe, foi movido ou você não tem permissão para aceder.
                </p>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                    <Button
                        asChild
                        size="lg"
                        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-lg shadow-emerald-500/25 transition-all duration-300"
                    >
                        <Link href="/dashboard">
                            <Home className="mr-2 h-5 w-5" />
                            Ir para Dashboard
                        </Link>
                    </Button>

                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() => window.history.back()}
                        className="border-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-300"
                    >
                        <ArrowLeft className="mr-2 h-5 w-5" />
                        Voltar
                    </Button>
                </div>

                {/* Help Link */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800 w-full">
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        Precisa de ajuda?{" "}
                        <Link href="/dashboard" className="text-emerald-600 hover:text-emerald-700 font-medium hover:underline">
                            Contacte o suporte
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    )
}
