"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Wallet, Receipt, User, Key, Calendar, Activity, FileText, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import api from "@/lib/api"

interface MerchantStats {
    current_balance: number
    total_this_month: number
    total_last_month: number
    last_transaction_amount: number
    last_transaction_date: string | null
    status: string
    payment_status: string // Added payment status
    days_overdue: number
}

export default function MerchantDashboard() {
    const { user } = useAuth()
    const [stats, setStats] = useState<MerchantStats | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchStats = async () => {
            if (!user?.id) return

            try {
                // Fetch merchant data which includes balance info
                const merchantRes = await api.get(`/merchants/${user.id}`)
                const merchant = merchantRes.data

                // Fetch recent transactions for this merchant
                let lastTxAmount = 0
                let lastTxDate = null
                let totalThisMonth = 0
                let totalLastMonth = 0

                try {
                    const txRes = await api.get(`/transactions/`, {
                        params: { merchant_id: user.id, limit: 100 }
                    })
                    const transactions = txRes.data || []

                    // Get current month and last month
                    const now = new Date()
                    const thisMonth = now.getMonth()
                    const thisYear = now.getFullYear()
                    const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1
                    const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear

                    transactions.forEach((tx: any) => {
                        const txDate = new Date(tx.created_at)
                        // Force conversion to number to prevent string concatenation
                        const amount = Number(tx.amount) || 0

                        // This month totals
                        if (txDate.getMonth() === thisMonth && txDate.getFullYear() === thisYear) {
                            if (tx.status === 'SUCESSO') {
                                totalThisMonth += amount
                            }
                        }

                        // Last month totals
                        if (txDate.getMonth() === lastMonth && txDate.getFullYear() === lastMonthYear) {
                            if (tx.status === 'SUCESSO') {
                                totalLastMonth += amount
                            }
                        }
                    })

                    // Get last successful transaction
                    const successTx = transactions.filter((tx: any) => tx.status === 'SUCESSO')
                    if (successTx.length > 0) {
                        lastTxAmount = Number(successTx[0].amount) || 0
                        lastTxDate = successTx[0].created_at
                    }
                } catch (txError) {
                    console.error("Erro ao buscar transações:", txError)
                }

                setStats({
                    current_balance: merchant.current_balance || 0,
                    total_this_month: totalThisMonth,
                    total_last_month: totalLastMonth,
                    last_transaction_amount: lastTxAmount,
                    last_transaction_date: lastTxDate,
                    status: merchant.status || 'ATIVO',
                    payment_status: merchant.payment_status || 'REGULAR', // Use backend status
                    days_overdue: merchant.days_overdue || 0,
                    overdue_balance: merchant.overdue_balance || 0,
                    credit_balance: merchant.credit_balance || 0
                })
            } catch (error) {
                console.error("Erro ao carregar dados:", error)
                // Fallback stats
                setStats({
                    current_balance: 0,
                    total_this_month: 0,
                    total_last_month: 0,
                    last_transaction_amount: 0,
                    last_transaction_date: null,
                    status: 'ATIVO',
                    payment_status: 'REGULAR',
                    days_overdue: 0
                })
            } finally {
                setLoading(false)
            }
        }

        fetchStats()
    }, [user])

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-MZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    const formatDate = (dateStr: string | null) => {
        if (!dateStr) return "—"
        const date = new Date(dateStr)
        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }) +
            ', ' + date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    }

    const calculateGrowth = () => {
        if (!stats || stats.total_last_month === 0) return 0
        return Math.round(((stats.total_this_month - stats.total_last_month) / stats.total_last_month) * 100)
    }

    const translatePaymentStatus = (status: string) => {
        const map: Record<string, string> = {
            'REGULAR': 'Regular',
            'IRREGULAR': 'Irregular'
        }
        return map[status] || status
    }

    const getPaymentStatusMessage = (status: string, overdueDays: number, overdueBalance: number, creditBalance: number = 0) => {
        if (status === 'REGULAR') {
            if (creditBalance > 0) {
                return `Crédito: +${formatCurrency(creditBalance)} MZN`
            }
            return 'Nenhuma pendência'
        }

        // Use balance if available, otherwise fallback to days * 10
        const debt = overdueBalance > 0 ? overdueBalance : overdueDays * 10

        return `Valor em atraso: ${formatCurrency(debt)} MZN`
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Painel do Comerciante</h1>
                    <p className="text-muted-foreground mt-1">Bem-vindo, {user?.full_name}</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="default" className="bg-emerald-600 hover:bg-emerald-700">
                        <Link href="/merchant/receipts">
                            <Receipt className="mr-2 h-4 w-4" /> Meus Recibos
                        </Link>
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                </div>
            ) : (
                <>
                    {/* Main Hero Card - Contributions */}
                    <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <p className="text-emerald-100 font-medium mb-1 flex items-center gap-2">
                                <Wallet className="w-4 h-4" /> Total Contribuído (Mês)
                            </p>
                            <h2 className="text-4xl md:text-5xl font-bold mb-6">
                                {formatCurrency(stats?.total_this_month || 0)} MZN
                            </h2>

                            <div className="flex gap-8">
                                <div>
                                    <p className="text-xs text-emerald-200 mb-1">Mês Anterior</p>
                                    <p className="text-lg font-semibold flex items-center gap-1">
                                        {formatCurrency(stats?.total_last_month || 0)} MZN
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs text-emerald-200 mb-1">Crescimento</p>
                                    <p className={`text-lg font-semibold flex items-center gap-1 ${calculateGrowth() >= 0 ? 'text-emerald-100' : 'text-red-200'}`}>
                                        {calculateGrowth() >= 0 ? '+' : ''}{calculateGrowth()}%
                                    </p>
                                </div>
                            </div>
                        </div>
                        {/* Decoration */}
                        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                            <Receipt className="w-64 h-64 -mb-12 -mr-12 rotate-12" />
                        </div>
                    </div>

                    {/* Secondary Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                        {/* Last Payment */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Último Pagamento</CardTitle>
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    {stats?.last_transaction_amount ? formatCurrency(stats.last_transaction_amount) + ' MZN' : '—'}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDate(stats?.last_transaction_date || null)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Status - Now showing PAYMENT STATUS */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Situação</CardTitle>
                                <Activity className={`h-4 w-4 ${stats?.payment_status === 'REGULAR' ? 'text-emerald-500' : 'text-red-500'}`} />
                            </CardHeader>
                            <CardContent>
                                <div className={`text-2xl font-bold ${stats?.payment_status === 'REGULAR' ? 'text-emerald-600' : 'text-red-600'}`}>
                                    {translatePaymentStatus(stats?.payment_status || 'REGULAR')}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {getPaymentStatusMessage(stats?.payment_status || 'REGULAR', stats?.days_overdue || 0, stats?.overdue_balance || 0, stats?.credit_balance || 0)}
                                </p>
                            </CardContent>
                        </Card>

                        {/* Saldo 
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Saldo Actual</CardTitle>
                                <Wallet className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-800">
                                    {formatCurrency(stats?.current_balance || 0)} MZN
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Disponível para saque
                                </p>
                            </CardContent>
                        </Card> */}
                    </div>
                </>
            )}

            {/* Quick Actions / Management Grid */}
            <h2 className="text-lg font-semibold text-foreground mt-4">Gestão da Conta</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* Profile Card */}
                <Link href="/merchant/profile" className="block group">
                    <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-emerald-500/50 cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-emerald-600">
                                <User className="h-5 w-5" />
                                Perfil Completo
                            </CardTitle>
                            <CardDescription>
                                Visualize seus dados cadastrais, documentos e contacto.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {/* Credentials Card */}
                <Link href="/merchant/profile" className="block group">
                    <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-emerald-500/50 cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-emerald-600">
                                <Key className="h-5 w-5" />
                                Atualizar Credenciais
                            </CardTitle>
                            <CardDescription>
                                Altere a sua palavra-passe de acesso.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

                {/* Receipts Card */}
                <Link href="/merchant/receipts" className="block group">
                    <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-emerald-500/50 cursor-pointer">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 group-hover:text-emerald-600">
                                <FileText className="h-5 w-5" />
                                Histórico de Recibos
                            </CardTitle>
                            <CardDescription>
                                Consulte e baixe todos os comprovantes de pagamento.
                            </CardDescription>
                        </CardHeader>
                    </Card>
                </Link>

            </div>
        </div>
    )
}
