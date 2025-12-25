import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { LucideIcon } from "lucide-react"

interface StatsCardProps {
    title: string
    value: string
    description?: string
    icon: LucideIcon
    trend?: string
    trendUp?: boolean
    color?: "default" | "success" | "warning" | "danger" | "info"
    className?: string
}

const colorMap = {
    default: "text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/50",
    success: "text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10",
    warning: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/10",
    danger: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-500/10",
    info: "text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/10",
}

export function StatsCard({ title, value, description, icon: Icon, trend, trendUp, color = "default", className }: StatsCardProps) {
    return (
        <Card className={cn("hover:shadow-md transition-shadow border-none shadow-sm/50", className)}>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-x-4">
                    <div className="flex flex-col space-y-1">
                        <span className="text-sm font-medium text-muted-foreground tracking-wide uppercase text-[10px]">
                            {title}
                        </span>
                        <span className="text-2xl font-bold tracking-tight">
                            {value}
                        </span>
                        {description && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {description}
                            </p>
                        )}
                    </div>
                    <div className={cn("p-3 rounded-xl", colorMap[color])}>
                        <Icon className="w-5 h-5" />
                    </div>
                </div>
                {trend && (
                    <div className="mt-4 flex items-center text-xs">
                        <span className={cn(
                            "font-medium px-1.5 py-0.5 rounded mr-2",
                            trendUp ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 dark:text-emerald-400" : "text-red-700 bg-red-50 dark:bg-red-500/10 dark:text-red-400"
                        )}>
                            {trend}
                        </span>
                        <span className="text-muted-foreground">vs mês passado</span>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
