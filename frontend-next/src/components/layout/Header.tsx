"use client"

import { ReactNode } from "react"

interface HeaderProps {
    title: string
    subtitle?: string
    actions?: ReactNode
}

export default function Header({ title, subtitle, actions }: HeaderProps) {
    return (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800/50">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {title}
                </h1>
                {subtitle && (
                    <p className="text-muted-foreground mt-1">
                        {subtitle}
                    </p>
                )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
                {actions}
            </div>
        </div>
    )
}
