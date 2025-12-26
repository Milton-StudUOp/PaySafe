import { Loader2 } from "lucide-react"

export default function AuthLoading() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900">
            <div className="flex flex-col items-center gap-6">
                {/* Logo */}
                <div className="relative">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/30">
                        <span className="text-4xl font-black text-white">PS</span>
                    </div>
                    {/* Spinning ring */}
                    <div className="absolute inset-0 w-24 h-24 border-4 border-transparent border-t-emerald-400/50 rounded-2xl animate-spin" style={{ animationDuration: '2s' }} />
                </div>

                {/* Loading text */}
                <div className="flex items-center gap-3 text-white/70">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-lg font-medium">A preparar login...</span>
                </div>

                {/* Brand */}
                <p className="text-sm text-white/40">PaySafe System</p>
            </div>
        </div>
    )
}
