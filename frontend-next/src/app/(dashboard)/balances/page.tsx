"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2, TrendingUp, DollarSign } from "lucide-react"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"

export default function BalancesPage() {
    interface Balance {
        id: number;
        merchant_id: number;
        merchant_name?: string;
        market_name?: string;
        current_balance: number;
        last_updated_at: string;
    }
    const [balances, setBalances] = useState<Balance[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchBalances = async () => {
            try {
                // webpage.md: GET /api/balances?market_id=&merchant_id=&page=&size=
                const res = await api.get("/balances/")
                setBalances(res.data)
            } catch (error) {
                console.error("Error fetching balances:", error)
            } finally {
                setLoading(false)
            }
        }
        fetchBalances()
    }, [])

    return (
        <div className="space-y-6">
            <Header title="Saldos" subtitle="Monitoramento financeiro dos comerciantes" />

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-full">
                            <TrendingUp className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Saldo Total</p>
                            <h3 className="text-2xl font-bold">1.2M MZN</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                            <DollarSign className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-muted-foreground">Depósitos Hoje</p>
                            <h3 className="text-2xl font-bold">45.000 MZN</h3>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Comerciante</TableHead>
                                    <TableHead>Mercado</TableHead>
                                    <TableHead>Última Atualização</TableHead>
                                    <TableHead className="text-right">Saldo Atual (MZN)</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {balances.map((b: Balance) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="font-medium">{b.merchant_name || `Merchant #${b.merchant_id}`}</TableCell>
                                        <TableCell>{b.market_name || "Central"}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">{b.last_updated_at}</TableCell>
                                        <TableCell className="text-right font-bold text-emerald-600">
                                            {Number(b.current_balance).toLocaleString('pt-MZ', { minimumFractionDigits: 2 })}
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {balances.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                                            Nenhum registro de saldo encontrado.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
