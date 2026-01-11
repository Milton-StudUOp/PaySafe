"use client"

import { useState } from "react"
import { useAuth } from "@/lib/auth"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertCircle, Loader2, ArrowRight, CheckCircle2 } from "lucide-react"

export default function LoginPage() {
    const [loginType, setLoginType] = useState<'employee' | 'merchant'>('merchant')
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [success, setSuccess] = useState(false)

    const { login } = useAuth()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setIsLoading(true)

        try {
            // Use URLSearchParams for OAuth2 PasswordRequestForm compatibility
            const formData = new URLSearchParams()
            formData.append('username', email) // FastAPI OAuth2 expects 'username'
            formData.append('password', password)

            // Direct axios call to avoid circular dependency or use the one from library if adapted
            // Using fetch here for simplicity or adapt api.ts to not require auth for login
            const apiUrl = process.env.NEXT_PUBLIC_API_URL ||
                (typeof window !== 'undefined'
                    ? `${window.location.protocol}//${window.location.hostname}:8000/api/v1`
                    : 'http://localhost:8000/api/v1');
            const res = await fetch(`${apiUrl}/auth/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData,
                credentials: 'include', // Required for cross-origin credential requests
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.detail || "Falha ao entrar no sistema")
            }

            // STRICT ROLE CHECK BASED ON UI SELECTION
            const role = data.user.role;
            const isMerchantRole = role === 'COMERCIANTE' || role === 'MERCHANT';

            if (loginType === 'employee') {
                if (isMerchantRole) {
                    throw new Error("Credenciais inválidas.");
                }
            }

            if (loginType === 'merchant') {
                if (!isMerchantRole) {
                    throw new Error("Credenciais inválidas.");
                }
            }

            setSuccess(true)

            login(data.access_token, data.user)

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Credenciais inválidas. Tente novamente."
            setError(message)
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <button
                    type="button"
                    onClick={() => setLoginType('merchant')}
                    className={`text-sm font-medium py-2 rounded-md transition-all ${loginType === 'merchant'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    Usuário
                </button>
                <button
                    type="button"
                    onClick={() => setLoginType('employee')}
                    className={`text-sm font-medium py-2 rounded-md transition-all ${loginType === 'employee'
                        ? 'bg-white dark:bg-slate-700 text-emerald-600 shadow-sm'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                        }`}
                >
                    Funcionário
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-center gap-3 text-red-400 text-sm animate-in fade-in slide-in-from-top-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-slate-900 dark:text-white">
                            {loginType === 'employee' ? 'Usuário' : 'UID (Cartão)'}
                        </Label>
                        <Input
                            id="username"
                            type="text"
                            placeholder={loginType === 'employee' ? 'username' : 'C01234567'}
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading || success}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-slate-900 dark:text-white">Senha</Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            className="bg-white/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:border-emerald-500/50 focus:ring-emerald-500/20"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading || success}
                        />
                    </div>
                </div>

                <Button
                    type="submit"
                    className={`w-full h-11 transition-all duration-300 font-medium ${success
                        ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20'
                        }`}
                    disabled={isLoading || success}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : success ? (
                        <CheckCircle2 className="w-5 h-5 mr-2 animate-bounce" />
                    ) : (
                        <span className="flex items-center">
                            Entrar
                            <ArrowRight className="w-4 h-4 ml-2 opacity-70" />
                        </span>
                    )}
                    {success ? "Login realizado!" : "Acessar Painel"}
                </Button>
            </form>
        </div>
    )
}
