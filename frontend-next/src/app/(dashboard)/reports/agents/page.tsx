"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Download, ArrowUpDown } from "lucide-react"
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton, ChartSkeleton } from "@/components/ui/table-skeleton"

export default function AgentsReportPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState("30")
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'total_revenue', direction: 'desc' })

    console.log("Rendering Agents Report Page")

    useEffect(() => {
        fetchData()
    }, [days])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/reports/agents?days=${days}`)
            setData(res.data)
        } catch (error) {
            console.error("Failed to fetch agent reports", error)
        } finally {
            setLoading(false)
        }
    }

    const sortedData = [...data].sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? -1 : 1
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
            return sortConfig.direction === 'asc' ? 1 : -1
        }
        return 0
    })

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'desc'
        if (sortConfig.key === key && sortConfig.direction === 'desc') {
            direction = 'asc'
        }
        setSortConfig({ key, direction })
    }

    const handleExportCSV = () => {
        if (!data || data.length === 0) return;

        const headers = ["Agente", "Mercado", "Região", "POS Ativos", "Transações", "Receita Gerada (MZN)"];
        const csvContent = [
            headers.join(","),
            ...data.map(row => [
                `"${row.agent_name}"`,
                `"${row.market_name}"`,
                `"${row.region || '-'}"`,
                row.pos_count,
                row.tx_count,
                row.total_revenue
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_agentes_${days}dias.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const COLORS = ['#8b5cf6', '#ec4899', '#6366f1', '#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Header title="Relatório de Agentes" subtitle="Produtividade e KPIs individuais" />

                <div className="flex gap-2">
                    <Select value={days} onValueChange={setDays}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Período" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="7">Últimos 7 dias</SelectItem>
                            <SelectItem value="30">Últimos 30 dias</SelectItem>
                            <SelectItem value="90">Últimos 3 meses</SelectItem>
                            <SelectItem value="365">Último ano</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={handleExportCSV}>
                        <Download className="mr-2 h-4 w-4" /> Exportar CSV
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="space-y-6">
                    <ChartSkeleton height={380} />
                    <TableSkeleton columnCount={6} rowCount={8} />
                </div>
            ) : (
                <>
                    {/* CHART SECTION */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Top Agentes por Arrecadação</CardTitle>
                            <CardDescription>Ranking de performance no período</CardDescription>
                        </CardHeader>
                        <CardContent className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                <BarChart data={sortedData.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                    <XAxis type="number" hide />
                                    <YAxis type="category" dataKey="agent_name" width={120} fontSize={12} tick={{ fill: '#6b7280' }} />
                                    <Tooltip
                                        cursor={{ fill: 'transparent' }}
                                        formatter={(value: number) => [`${value.toLocaleString()} MZN`, 'Receita']}
                                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    />
                                    <Bar dataKey="total_revenue" radius={[0, 4, 4, 0]} barSize={20}>
                                        {sortedData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>

                    {/* TABLE SECTION */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento por Agente</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[250px]">Agente</TableHead>
                                        <TableHead>Mercado</TableHead>
                                        <TableHead>Região</TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-emerald-600" onClick={() => handleSort('pos_count')}>
                                            POS Ativos <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                        </TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-emerald-600" onClick={() => handleSort('tx_count')}>
                                            Transações <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                        </TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-emerald-600" onClick={() => handleSort('total_revenue')}>
                                            Receita Gerada <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedData.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell className="font-medium">{row.agent_name}</TableCell>
                                            <TableCell>{row.market_name}</TableCell>
                                            <TableCell>{row.region || "-"}</TableCell>
                                            <TableCell className="text-right">{row.pos_count}</TableCell>
                                            <TableCell className="text-right">{row.tx_count}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">
                                                {Number(row.total_revenue).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })} MZN
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nenhum dado encontrado para este período.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </>
            )}
        </div>
    )
}
