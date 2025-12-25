"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import {
    LayoutDashboard,
    Users,
    UserCheck,
    Tablet,
    Receipt,
    FileText,
    Shield,
    BarChart2,
    Settings,
    MapPin,
    Wallet,
    User,
    LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import api from "@/lib/api"
import { ChangeUserPasswordDialog } from "@/components/features/users/ChangeUserPasswordDialog"

export function Sidebar() {
    const pathname = usePathname()
    const { user, logout } = useAuth()
    const [pendingCount, setPendingCount] = useState(0)

    // Fetch pending count for admin
    useEffect(() => {
        const fetchCount = async () => {
            if (user?.role === "ADMIN") {
                try {
                    const res = await api.get("/approvals/count")
                    setPendingCount(res.data.pending_count)
                } catch (e) {
                    console.error("Failed to fetch pending approvals count")
                }
            }
        }

        if (user?.role === "ADMIN") {
            fetchCount()
            // Poll every 30 seconds
            const interval = setInterval(fetchCount, 30000)
            return () => clearInterval(interval)
        }
    }, [user?.role])

    if (!user) return null

    const role = user.role

    const links = [
        {
            label: "Dashboard",
            href: "/dashboard",
            icon: LayoutDashboard,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO", "AUDITOR", "COMERCIANTE"]
        },
        {
            label: "Gestão",
            header: true,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO"]
        },
        {
            label: "Comerciantes",
            href: "/merchants",
            icon: Users,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO"]
        },
        {
            label: "Agentes",
            href: "/agents",
            icon: UserCheck,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO"]
        },
        {
            label: "Mercados",
            href: "/markets",
            icon: MapPin,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO"]
        },
        {
            label: "Dispositivos POS",
            href: "/pos",
            icon: Tablet,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO"]
        },
        {
            label: "Operações",
            header: true,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO", "AUDITOR"]
        },
        {
            label: "Transações",
            href: "/transactions",
            icon: Receipt,
            roles: ["ADMIN", "SUPERVISOR", "FUNCIONARIO", "AUDITOR"]
        },
        {
            label: "Meus Pedidos",
            href: "/approvals/my-requests",
            icon: FileText,
            roles: ["SUPERVISOR", "FUNCIONARIO"]
        },
        {
            label: "Auditoria",
            header: true,
            roles: ["ADMIN", "AUDITOR"]
        },
        {
            label: "Logs de Auditoria",
            href: "/audit",
            icon: Shield,
            roles: ["ADMIN", "AUDITOR"]
        },
        {
            label: "Relatórios",
            href: "/reports",
            icon: BarChart2,
            roles: ["ADMIN", "AUDITOR"]
        },
        {
            label: "Minha Conta",
            header: true,
            roles: ["COMERCIANTE"]
        },
        {
            label: "Meu Estado",
            href: "/meu-estado",
            icon: User,
            roles: ["COMERCIANTE"]
        },
        {
            label: "Meus Recibos",
            href: "/meus-recibos",
            icon: FileText,
            roles: ["COMERCIANTE"]
        },
        {
            label: "Administração",
            header: true,
            roles: ["ADMIN"]
        },
        {
            label: "Usuários",
            href: "/users",
            icon: Settings,
            roles: ["ADMIN"]
        },
        {
            label: "Aprovações",
            href: "/approvals",
            icon: Shield,
            roles: ["ADMIN"]
        },
        {
            label: "Locais",
            href: "/locations",
            icon: MapPin,
            roles: ["ADMIN"]
        }
    ]

    return (
        <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white text-slate-900 flex flex-col shadow-xl shadow-slate-200/50 border-r border-slate-100">
            <div className="flex h-16 items-center px-6 border-b border-slate-100">
                <Wallet className="mr-2 h-6 w-6 text-emerald-500" />
                <span className="text-lg font-bold tracking-tight">PAYSAFE</span>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                {links.map((link, i) => {
                    if (!link.roles.includes(role)) return null

                    if (link.header) {
                        return (
                            <div key={i} className="px-3 py-2 mt-4 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                {link.label}
                            </div>
                        )
                    }

                    const Icon = link.icon!
                    const isActive = pathname === link.href
                    const isApprovals = link.href === "/approvals"

                    return (
                        <Link
                            key={i}
                            href={link.href!}
                            className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 relative",
                                isActive
                                    ? "bg-emerald-500/10 text-emerald-600 font-semibold shadow-sm"
                                    : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            )}
                        >
                            <Icon className={cn("h-4 w-4", isActive && "text-emerald-600 dark:text-emerald-400")} />
                            {link.label}

                            {isApprovals && pendingCount > 0 && (
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-amber-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center shadow-sm">
                                    {pendingCount}
                                </span>
                            )}
                        </Link>
                    )
                })}
            </div>

            <div className="border-t border-slate-100 p-4">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="h-8 w-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/30">
                        {user.full_name.charAt(0)}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{user.full_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.role}</p>
                    </div>
                </div>
                <ChangeUserPasswordDialog />
                <Button
                    variant="ghost"
                    className="w-full justify-start text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                    onClick={logout}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                </Button>
            </div>
        </aside>
    )
}
