"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { StatsCard } from "@/components/features/StatsCard"
import { Banknote, Receipt, Users, Wifi, ShoppingBag, Download, Calendar } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from "recharts"
import Link from "next/link"

export default function ReportsPage() {
    const [stats, setStats] = useState<any>(null)
    const [chartData, setChartData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [statsRes, chartRes] = await Promise.all([
                api.get("/reports/dashboard"),
                api.get("/reports/chart/revenue?days=30")
            ])
            setStats(statsRes.data)
            setChartData(chartRes.data)
        } catch (error) {
            console.error("Error fetching report data:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) return <div className="p-8 flex justify-center text-emerald-500">Carregando relatórios...</div>

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Header title="Relatórios" subtitle="Visão Geral do Sistema" />
                <Button variant="outline" onClick={() => window.print()} className="print:hidden">
                    <Download className="mr-2 h-4 w-4" /> Exportar Relatório PDF
                </Button>
            </div>

            {/* KPI CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatsCard
                    title="Receita Hoje"
                    value={stats?.revenue_today ? `${stats.revenue_today.toLocaleString()} MZN` : "0 MZN"}
                    icon={Banknote}
                    color="success"
                />
                <StatsCard
                    title="Transações Hoje"
                    value={stats?.tx_count_today || 0}
                    icon={Receipt}
                    color="info"
                />
                <StatsCard
                    title="Agentes Ativos"
                    value={stats?.active_agents || 0}
                    icon={Users}
                    color="warning"
                />
                <StatsCard
                    title="Comerciantes Ativos"
                    value={stats?.active_merchants || 0}
                    icon={ShoppingBag}
                    color="default"
                />
            </div>

            {/* CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Evolução da Receita (30 dias)</CardTitle>
                        <CardDescription>Fluxo diário de entradas financeiras</CardDescription>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                <XAxis
                                    dataKey="date"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => new Date(value).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit' })}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value / 1000}k`}
                                />
                                <Tooltip
                                    contentStyle={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    formatter={(value: number) => [`${value.toLocaleString()} MZN`, "Receita"]}
                                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="revenue"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={false}
                                    activeDot={{ r: 4, strokeWidth: 0 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Links Rápidos</CardTitle>
                        <CardDescription>Acesse relatórios detalhados por setor</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Link href="/reports/markets" className="flex items-center w-full justify-start h-12 border rounded-md px-4 hover:bg-slate-100 transition-colors">
                            <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                                <Banknote className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-sm">Mercados</div>
                                <div className="text-xs text-muted-foreground">Receita e performance por local</div>
                            </div>
                        </Link>
                        <Link href="/reports/agents" className="flex items-center w-full justify-start h-12 border rounded-md px-4 hover:bg-slate-100 transition-colors">
                            <div className="bg-amber-100 p-2 rounded-full mr-3 text-amber-600">
                                <Users className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-sm">Agentes</div>
                                <div className="text-xs text-muted-foreground">Produtividade e KPIs individuais</div>
                            </div>
                        </Link>
                        <Link href="/reports/pos" className="flex items-center w-full justify-start h-12 border rounded-md px-4 hover:bg-slate-100 transition-colors">
                            <div className="bg-purple-100 p-2 rounded-full mr-3 text-purple-600">
                                <Wifi className="h-4 w-4" />
                            </div>
                            <div className="text-left">
                                <div className="font-semibold text-sm">Dispositivos POS</div>
                                <div className="text-xs text-muted-foreground">Uso, falhas e conectividade</div>
                            </div>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
