"use client"

import { useEffect, useState } from "react"
import {
    Area,
    AreaChart,
    CartesianGrid,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis
} from "recharts"
import api from "@/lib/api"
import { Loader2 } from "lucide-react"

interface MarketRevenueChartProps {
    marketId: number
}

export function MarketRevenueChart({ marketId }: MarketRevenueChartProps) {
    const [data, setData] = useState<{ date: string; revenue: number }[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (marketId) {
            fetchChartData()
        }
    }, [marketId])

    const fetchChartData = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/markets/${marketId}/chart/revenue?days=7`)
            // Format dates for display
            const formattedData = res.data.map((item: any) => ({
                ...item,
                displayDate: new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
            }))
            setData(formattedData)
        } catch (error) {
            console.error("Error fetching chart data:", error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <div className="flex items-center justify-center h-full text-emerald-500"><Loader2 className="h-6 w-6 animate-spin" /></div>
    }

    if (data.length === 0) {
        return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Sem dados recentes</div>
    }

    return (
        <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis
                    dataKey="displayDate"
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#94a3b8"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value / 1000}k`}
                />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: number) => [new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(value), "Receita"]}
                />
                <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                />
            </AreaChart>
        </ResponsiveContainer>
    )
}
