import { Loader2 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

export default function MerchantLoading() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white p-6">
            <div className="max-w-4xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-32" />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="p-6 rounded-xl bg-white border shadow-sm">
                            <Skeleton className="h-4 w-24 mb-3" />
                            <Skeleton className="h-8 w-32" />
                        </div>
                    ))}
                </div>

                {/* Content Card */}
                <div className="rounded-xl bg-white border shadow-sm p-6 space-y-4">
                    <Skeleton className="h-6 w-40" />
                    <div className="space-y-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                            <div key={i} className="flex items-center gap-3 py-3 border-b">
                                <Skeleton className="h-10 w-10 rounded-lg" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-4 w-48" />
                                    <Skeleton className="h-3 w-24" />
                                </div>
                                <Skeleton className="h-6 w-20 rounded-full" />
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
        </div>
    )
}
