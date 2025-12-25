import React from "react"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, Clock, XCircle } from "lucide-react"

export type ApprovalStatusType = "APROVADO" | "PENDENTE" | "REJEITADO"

interface StatusBadgeProps {
    status?: ApprovalStatusType | string
    className?: string
    showIcon?: boolean
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
    if (!status) return null

    // Normalize status (handle null/undefined/mixed case safely)
    const normalizedStatus = String(status).toUpperCase()

    switch (normalizedStatus) {
        case "PENDENTE":
            return (
                <Badge variant="outline" className={`bg-amber-50 text-amber-700 border-amber-200 gap-1 ${className}`}>
                    {showIcon && <Clock className="h-3 w-3" />}
                    Aguardando Aprovação
                </Badge>
            )
        case "REJEITADO":
            return (
                <Badge variant="destructive" className={`gap-1 ${className}`}>
                    {showIcon && <XCircle className="h-3 w-3" />}
                    Rejeitado
                </Badge>
            )
        case "APROVADO":
        case "ATIVO": // Fallback for entity status if mixed
            return (
                <Badge variant="outline" className={`bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 ${className}`}>
                    {showIcon && <CheckCircle2 className="h-3 w-3" />}
                    Aprovado
                </Badge>
            )
        case "CANCELADO":
            return (
                <Badge variant="outline" className={`bg-slate-100 text-slate-600 border-slate-200 gap-1 ${className}`}>
                    {showIcon && <XCircle className="h-3 w-3" />}
                    Cancelado
                </Badge>
            )
        default:
            return (
                <Badge variant="secondary" className={`gap-1 ${className}`}>
                    {status}
                </Badge>
            )
    }
}
