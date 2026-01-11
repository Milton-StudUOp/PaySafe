"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { StatsCard } from "@/components/features/StatsCard"
import { Users, Tablet, Banknote, Wallet, Receipt, Loader2, AlertTriangle, TrendingUp, Clock, CreditCard } from "lucide-react"
import { DashboardStats, Transaction, ChartData, DashboardAlert } from "@/types"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from "recharts"
import { useDocumentTitle } from "@/hooks/useDocumentTitle"
import { PayTaxDialog } from "@/components/forms/PayTaxDialog"

export default function DashboardPage() {
    useDocumentTitle("dashboard")

    const { user } = useAuth()
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [revenueChart, setRevenueChart] = useState<ChartData[]>([])
    const [hourlyChart, setHourlyChart] = useState<ChartData[]>([])
    const [methodsChart, setMethodsChart] = useState<ChartData[]>([])
    const [alerts, setAlerts] = useState<DashboardAlert[]>([])
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)

    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const [statsRes, revenueRes, hourlyRes, methodsRes, alertsRes, txRes] = await Promise.all([
                    api.get("/reports/dashboard"),
                    api.get("/reports/chart/revenue?days=30"),
                    api.get("/reports/chart/hourly"),
                    api.get("/reports/chart/methods"),
                    api.get("/reports/alerts"),
                    api.get("/transactions/?limit=5")
                ])

                setStats(statsRes.data)
                setRevenueChart(revenueRes.data)
                setHourlyChart(hourlyRes.data)
                setMethodsChart(methodsRes.data)
                setAlerts(alertsRes.data)
                setRecentTransactions(txRes.data)

            } catch (error) {
                console.error("Failed to fetch dashboard data", error)
            } finally {
                setLoading(false)
            }
        }

        if (user) {
            fetchDashboardData()
        }
    }, [user])

    if (!user) return null

    // Role-based views logic
    const isAdmin = ["ADMIN", "SUPERVISOR", "FUNCIONARIO"].includes(user.role)
    const isMerchant = user.role === "COMERCIANTE"

    return (
        <div className="space-y-6">
            <Header
                title={`Painel Principal`}
                subtitle={isMerchant ? "Resumo financeiro do seu negócio" : "Centro de Controle das Operações"}
            />

            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-10 w-10 animate-spin text-emerald-500" />
                </div>
            ) : (
                <>
                    {/* --- ADMIN / OPERATIONAL VIEW --- */}
                    {isAdmin && stats && (
                        <>
                            {/* KPI GRID */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatsCard
                                    title="Receita Hoje"
                                    value={`${stats.revenue_today?.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`}
                                    icon={Banknote}
                                    color="success"
                                />
                                <StatsCard
                                    title="Transações Hoje"
                                    value={`${stats.tx_count_today}`}
                                    icon={Receipt}
                                    color="info"
                                />
                                <StatsCard
                                    title="Ticket Médio"
                                    value={`${stats.avg_ticket?.toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN`}
                                    icon={TrendingUp}
                                    color="default"
                                />
                                <StatsCard
                                    title="Lojas Pagantes"
                                    value={stats.paying_merchants_today.toString()}
                                    icon={Wallet}
                                    color="warning"
                                />

                                <StatsCard
                                    title="Agentes Ativos"
                                    value={stats.active_agents.toString()}
                                    icon={Users}
                                    color="default"
                                    className="md:hidden lg:flex opacity-75"
                                />
                                <StatsCard
                                    title="POS Ativos"
                                    value={stats.active_pos.toString()}
                                    icon={Tablet}
                                    color="default"
                                    className="md:hidden lg:flex opacity-75"
                                />
                                <StatsCard
                                    title="Comerciantes Total"
                                    value={stats.active_merchants.toString()}
                                    icon={Users}
                                    color="default"
                                    className="md:hidden lg:flex opacity-75"
                                />
                            </div>

                            {/* CHARTS ROW */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                {/* MAIN LINE CHART */}
                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Receita Mensal</CardTitle>
                                        <CardDescription>Evolução financeira dos últimos 30 dias</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[300px]">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <LineChart data={revenueChart}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                                <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })} />
                                                <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                                                <Tooltip />
                                                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} dot={false} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                {/* SIDE CHARTS COLUMN */}
                                <div className="space-y-6">
                                    {/* ALERTS
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                                Alertas & Atenção
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            {alerts.length > 0 ? alerts.map((alert, i) => (
                                                <div key={i} className="flex items-start gap-3 p-3 bg-amber-50 dark:bg-amber-900/10 rounded-lg text-sm">
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                                                    <div>
                                                        <span className="font-semibold block text-amber-900 dark:text-amber-500">{alert.entity}</span>
                                                        <span className="text-amber-700 dark:text-amber-400">{alert.message}</span>
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-sm text-muted-foreground text-center py-4">Sem alertas críticos hoje.</div>
                                            )}
                                        </CardContent>
                                    </Card> */}

                                    {/* PAYMENT METHODS */}
                                    <Card>
                                        <CardHeader className="pb-2">
                                            <CardTitle className="text-sm font-medium">Métodos de Pagamento</CardTitle>
                                        </CardHeader>
                                        <CardContent className="h-[350px]">
                                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                                <PieChart>
                                                    <Pie
                                                        data={methodsChart}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={60}
                                                        outerRadius={80}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                    >
                                                        {methodsChart.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            <div className="flex justify-center gap-4 text-xs mt-2">
                                                {methodsChart.map((entry, index) => (
                                                    <div key={index} className="flex items-center gap-1">
                                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                                                        {entry.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>
                            </div>

                            {/* HOURLY & TABLES ROW */}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                                <Card className="lg:col-span-1">
                                    <CardHeader>
                                        <CardTitle>Fluxo por Hora</CardTitle>
                                        <CardDescription>Picos de transações hoje</CardDescription>
                                    </CardHeader>
                                    <CardContent className="h-[250px]">
                                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                            <BarChart data={hourlyChart}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                                <XAxis dataKey="hour" fontSize={10} />
                                                <Tooltip cursor={{ fill: 'transparent' }} />
                                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </CardContent>
                                </Card>

                                <Card className="lg:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Últimas Movimentações</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Comerciante</TableHead>
                                                    <TableHead>Valor</TableHead>
                                                    <TableHead>Pagamento</TableHead>
                                                    <TableHead>Hora</TableHead>
                                                    <TableHead>Status</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {recentTransactions.map((t) => (
                                                    <TableRow key={t.id}>
                                                        <TableCell className="font-medium">{t.merchant?.full_name || "N/A"}</TableCell>
                                                        <TableCell className="font-bold">
                                                            {Number(t.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                                                        </TableCell>
                                                        <TableCell>{t.payment_method}</TableCell>
                                                        <TableCell className="text-xs text-muted-foreground">
                                                            {new Date(t.created_at).toLocaleTimeString()}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant={t.status === "SUCESSO" ? "success" : "destructive"}>
                                                                {t.status}
                                                            </Badge>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </CardContent>
                                </Card>
                            </div>
                        </>
                    )}

                    {/* --- MERCHANT VIEW (KEEP SIMPLE) --- */}
                    {isMerchant && (
                        <div className="space-y-6">
                            <div className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-2xl p-8 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-emerald-100 font-medium mb-1">Saldo Arrecadado (Hoje)</p>
                                    <h2 className="text-4xl font-bold mb-4">{Number(stats?.revenue_today || 0).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN</h2>
                                    <div className="flex gap-3 items-center">
                                        <div className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-lg text-sm font-medium">
                                            {user?.status || "ATIVO"}
                                        </div>
                                    </div>
                                </div>

                                <div className="absolute right-8 top-1/2 -translate-y-1/2 z-20 hidden md:block">
                                    <PayTaxDialog merchantId={user.id!}>
                                        <Button variant="secondary" size="lg" className="shadow-lg font-bold bg-white text-emerald-700 hover:bg-emerald-50 border-0">
                                            <Banknote className="mr-2 h-5 w-5" />
                                            Pagar Taxa Municipal
                                        </Button>
                                    </PayTaxDialog>
                                </div>

                                {/* Mobile Button below */}
                                <div className="md:hidden mt-6 relative z-20">
                                    <PayTaxDialog merchantId={user.id!}>
                                        <Button variant="secondary" className="w-full shadow-lg font-bold bg-white text-emerald-700 hover:bg-emerald-50 border-0">
                                            <Banknote className="mr-2 h-5 w-5" />
                                            Pagar Taxa
                                        </Button>
                                    </PayTaxDialog>
                                </div>

                                <Wallet className="absolute right-[-20px] bottom-[-20px] w-64 h-64 text-white/10 rotate-12" />
                            </div>

                            {/* Show recent transactions for merchant too */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Histórico Recente</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Data</TableHead>
                                                <TableHead>Tipo</TableHead>
                                                <TableHead>Valor</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {recentTransactions.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {new Date(t.created_at).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell>{t.tax_code ? <Badge variant="outline">{t.tax_code}</Badge> : "Venda"}</TableCell>
                                                    <TableCell className="font-bold">
                                                        {Number(t.amount).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={t.status === "SUCESSO" ? "success" : (t.status === "PENDENTE" ? "warning" : "destructive")}>
                                                            {t.status}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </>
            )}
        </div>
    )
} 
