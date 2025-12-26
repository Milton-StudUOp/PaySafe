"use client"

import { Button } from "@/components/ui/button"
import { Wrench, Clock, Bell, ArrowRight, Server, Settings } from "lucide-react"

export default function MaintenancePage() {
    // Estimated completion time (can be dynamic from env or API)
    const estimatedTime = "30 minutos"

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-amber-50 dark:from-slate-950 dark:via-slate-900 dark:to-amber-950 overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse delay-1000" />

                {/* Rotating gear pattern */}
                <div className="absolute top-20 right-20 opacity-10">
                    <Settings className="h-32 w-32 text-amber-600 animate-spin" style={{ animationDuration: '15s' }} />
                </div>
                <div className="absolute bottom-20 left-20 opacity-10">
                    <Settings className="h-24 w-24 text-orange-600 animate-spin" style={{ animationDuration: '20s', animationDirection: 'reverse' }} />
                </div>
            </div>

            <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-2xl">
                {/* Maintenance Icon */}
                <div className="relative mb-8">
                    <div className="w-36 h-36 rounded-full bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 flex items-center justify-center shadow-2xl">
                        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                            <Wrench className="h-14 w-14 text-white" />
                        </div>
                    </div>
                    {/* Server status badge */}
                    <div className="absolute -right-2 -bottom-2 p-3 rounded-full bg-white dark:bg-slate-800 shadow-lg border-2 border-amber-400">
                        <Server className="h-5 w-5 text-amber-500" />
                    </div>
                </div>

                {/* Title */}
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white mb-4">
                    Manutenção Programada
                </h1>

                {/* Description */}
                <p className="text-slate-600 dark:text-slate-400 text-lg mb-6 max-w-lg">
                    Estamos a realizar melhorias no sistema para oferecer uma experiência ainda melhor.
                    Pedimos desculpa pelo inconveniente.
                </p>

                {/* Time Estimate Card */}
                <div className="w-full max-w-md mb-8 p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/50 rounded-2xl border border-amber-200 dark:border-amber-800 shadow-lg">
                    <div className="flex items-center justify-center gap-4">
                        <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/50">
                            <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="text-left">
                            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Tempo estimado</p>
                            <p className="text-2xl font-bold text-slate-800 dark:text-white">{estimatedTime}</p>
                        </div>
                    </div>
                </div>

                {/* What we're doing */}
                <div className="w-full max-w-md mb-8 text-left">
                    <h3 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                        O que estamos a fazer:
                    </h3>
                    <ul className="space-y-2 text-slate-600 dark:text-slate-400">
                        <li className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-amber-500" />
                            Atualização de segurança
                        </li>
                        <li className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-amber-500" />
                            Otimização de performance
                        </li>
                        <li className="flex items-center gap-2">
                            <ArrowRight className="h-4 w-4 text-amber-500" />
                            Novas funcionalidades
                        </li>
                    </ul>
                </div>

                {/* Notify Me Button */}
                <Button
                    size="lg"
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 transition-all duration-300"
                    onClick={() => {
                        // Could integrate with notification system
                        alert("Será notificado quando o sistema estiver disponível!")
                    }}
                >
                    <Bell className="mr-2 h-5 w-5" />
                    Notificar-me quando estiver pronto
                </Button>

                {/* Footer */}
                <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 w-full">
                    <p className="text-sm text-slate-500 dark:text-slate-500">
                        PaySafe System •{" "}
                        <a
                            href="mailto:suporte@paysafe.co.mz"
                            className="text-amber-600 hover:text-amber-700 font-medium hover:underline"
                        >
                            suporte@paysafe.co.mz
                        </a>
                    </p>
                </div>
            </div>
        </div>
    )
}
