import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
    return (
        <div className="flex-1 p-6 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-32" />
            </div>

            {/* Stats Cards Skeleton */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="p-6 rounded-xl border bg-white shadow-sm">
                        <div className="flex items-center justify-between mb-4">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                        <Skeleton className="h-8 w-32 mb-2" />
                        <Skeleton className="h-3 w-20" />
                    </div>
                ))}
            </div>

            {/* Table Skeleton */}
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                {/* Table Header */}
                <div className="p-4 border-b bg-slate-50">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-10 flex-1 max-w-sm" />
                        <Skeleton className="h-10 w-32" />
                        <Skeleton className="h-10 w-32" />
                    </div>
                </div>

                {/* Table Rows */}
                <div className="divide-y">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="p-4 flex items-center gap-4">
                            <Skeleton className="h-4 w-4" />
                            <Skeleton className="h-4 flex-1" style={{ maxWidth: `${60 + (i % 3) * 20}%` }} />
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-6 w-20 rounded-full" />
                            <Skeleton className="h-8 w-8" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Loading Indicator */}
            <div className="fixed bottom-6 right-6 flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-full shadow-lg">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">A carregar...</span>
            </div>
        </div>
    )
}
