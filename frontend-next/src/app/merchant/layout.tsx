"use client"

import { Wallet, Receipt, User, LogOut } from "lucide-react"
import Link from "next/link"
import { useAuth } from "@/lib/auth"

export default function MerchantLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="min-h-screen bg-background flex flex-col">
            {/* Mobile/Simple Header for Merchants */}
            <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold">
                        P
                    </div>
                    <span className="font-bold text-lg text-foreground">PaySafe <span className="text-emerald-500 text-xs font-normal">MERCHANT</span></span>
                </div>

                <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
                    <Link href="/merchant/dashboard" className="hover:text-emerald-500 transition-colors flex items-center gap-2">
                        <Wallet className="w-4 h-4" /> Visão Geral
                    </Link>
                    <Link href="/merchant/receipts" className="hover:text-emerald-500 transition-colors flex items-center gap-2">
                        <Receipt className="w-4 h-4" /> Recibos
                    </Link>
                    <Link href="/merchant/profile" className="hover:text-emerald-500 transition-colors flex items-center gap-2">
                        <User className="w-4 h-4" /> Perfil
                    </Link>
                </nav>

                <MerchantUserMenu />
            </header>

            <main className="flex-1 container mx-auto p-4 md:p-8 max-w-5xl">
                {children}
            </main>
        </div>
    )
}

function MerchantUserMenu() {
    // Client component wrapper for auth actions
    const { logout, user } = useAuth()

    return (
        <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">
                {user?.full_name?.split(' ')[0]}
            </span>
            <button
                onClick={logout}
                className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground"
                title="Sair"
            >
                <LogOut className="w-5 h-5" />
            </button>
        </div>
    )
}
