import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950">
            <div className="flex flex-col items-center gap-4">
                {/* Animated Logo/Loader */}
                <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <span className="text-2xl font-black text-white">PS</span>
                    </div>
                    {/* Spinning ring */}
                    <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-emerald-400 rounded-full animate-spin" />
                </div>

                {/* Loading text */}
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm font-medium">A carregar...</span>
                </div>
            </div>
        </div>
    )
}
