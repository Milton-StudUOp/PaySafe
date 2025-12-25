"use client"

import { Wallet } from "lucide-react"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-900 dark:to-slate-800 relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[100px]" />
                <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[100px]" />
                <div className="absolute -bottom-[10%] left-[20%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px]" />
            </div>



            <div className="z-10 w-full max-w-md px-4">
                <div className="p-8 rounded-2xl border border-border shadow-2xl backdrop-blur-xl bg-card/80">
                    <div className="flex flex-col items-center mb-8">
                        <div className="bg-gradient-to-tr from-emerald-500 to-blue-500 p-3 rounded-xl mb-4 shadow-lg shadow-emerald-500/20">
                            <Wallet className="w-8 h-8 text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">PaySafe Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-300 text-sm mt-1">Entre para gerenciar o sistema</p>
                    </div>

                    {children}
                </div>

                <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-8">
                    &copy; 2024 PaySafe Systems. Secured by SSL.
                </p>
            </div>
        </div>
    )
}
