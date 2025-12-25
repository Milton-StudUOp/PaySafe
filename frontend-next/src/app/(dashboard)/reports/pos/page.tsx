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
import { Badge } from "@/components/ui/badge"
import { Loader2, Download, ArrowUpDown, Signal, SignalLow, SignalZero } from "lucide-react"
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer
} from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { TableSkeleton, CardSkeleton } from "@/components/ui/table-skeleton"

export default function PosReportPage() {
    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [days, setDays] = useState("30")
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'last_seen', direction: 'desc' })

    useEffect(() => {
        fetchData()
    }, [days])

    const fetchData = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/reports/pos_devices?days=${days}`)
            setData(res.data)
        } catch (error) {
            console.error("Failed to fetch pos reports", error)
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

    // Helper for Signal Icon
    const getConnectivityIcon = (lastSeen: string | null) => {
        if (!lastSeen) return <SignalZero className="h-4 w-4 text-gray-400" />

        const diffHours = (new Date().getTime() - new Date(lastSeen).getTime()) / (1000 * 60 * 60)

        if (diffHours < 1) return <Signal className="h-4 w-4 text-emerald-500" />
        if (diffHours < 24) return <SignalLow className="h-4 w-4 text-amber-500" />
        return <SignalZero className="h-4 w-4 text-destructive" />
    }

    // Status Distribution for Pie Chart
    const statusData = [
        { name: 'Ativos', value: data.filter(d => d.status === 'ATIVO').length },
        { name: 'Inativos', value: data.filter(d => d.status === 'INATIVO').length },
        { name: 'Bloqueados', value: data.filter(d => d.status === 'BLOQUEADO').length },
    ].filter(d => d.value > 0)

    const COLORS = ['#10b981', '#6b7280', '#ef4444'];

    const handleExportCSV = () => {
        if (!data || data.length === 0) return;

        const headers = ["Serial", "Modelo", "Atribuído a", "Mercado", "Status", "Conectividade", "Uso (Tx)", "Falhas"];
        const csvContent = [
            headers.join(","),
            ...data.map(row => [
                `"${row.serial_number}"`,
                `"${row.model}"`,
                `"${row.assigned_agent || '-'}"`,
                `"${row.market_name || '-'}"`,
                `"${row.status}"`,
                `"${row.last_seen ? new Date(row.last_seen).toLocaleString() : 'Nunca visto'}"`,
                row.tx_count,
                row.error_count
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `relatorio_pos_${days}dias.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <Header title="Relatório de POS" subtitle="Conectividade, Falhas e Uso" />

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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <CardSkeleton className="h-[150px]" />
                        <CardSkeleton className="h-[150px]" />
                        <CardSkeleton className="h-[150px]" />
                    </div>
                    <TableSkeleton columnCount={6} rowCount={8} />
                </div>
            ) : (
                <>
                    {/* SUMMARY ROW */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Total de Terminais</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold">{data.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Transações com Falha</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-3xl font-bold text-red-600">
                                    {data.reduce((sum, d) => sum + d.error_count, 0)}
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground">Status da Frota</CardTitle>
                            </CardHeader>
                            <CardContent className="h-[120px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                                    <PieChart>
                                        <Pie
                                            data={statusData}
                                            innerRadius={30}
                                            outerRadius={50}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {statusData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip cursor={{ fill: 'transparent' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="ml-4 space-y-1 text-xs text-muted-foreground">
                                    {statusData.map((d, i) => (
                                        <div key={i} className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                                            {d.name}: {d.value}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* TABLE SECTION */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Detalhamento da Frota POS</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Serial / Modelo</TableHead>
                                        <TableHead>Atribuído a</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="cursor-pointer hover:text-emerald-600" onClick={() => handleSort('last_seen')}>
                                            Conectividade <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                        </TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-emerald-600" onClick={() => handleSort('tx_count')}>
                                            Uso (Tx) <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                        </TableHead>
                                        <TableHead className="text-right cursor-pointer hover:text-emerald-600" onClick={() => handleSort('error_count')}>
                                            Falhas <ArrowUpDown className="inline h-3 w-3 ml-1" />
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {sortedData.map((row, i) => (
                                        <TableRow key={i}>
                                            <TableCell>
                                                <div className="font-medium">{row.serial_number}</div>
                                                <div className="text-xs text-muted-foreground">{row.model}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{row.assigned_agent}</div>
                                                <div className="text-xs text-muted-foreground">{row.market_name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    row.status === 'ATIVO' ? 'success' :
                                                        row.status === 'BLOQUEADO' ? 'destructive' : 'secondary'
                                                }>
                                                    {row.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    {getConnectivityIcon(row.last_seen)}
                                                    <span className="text-sm">
                                                        {row.last_seen ? new Date(row.last_seen).toLocaleString() : 'Nunca visto'}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{row.tx_count}</TableCell>
                                            <TableCell className="text-right font-medium text-red-600">{row.error_count}</TableCell>
                                        </TableRow>
                                    ))}
                                    {sortedData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                Nenhum dado encontrado.
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
