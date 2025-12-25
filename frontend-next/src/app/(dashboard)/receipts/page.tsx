"use client"

import { useState } from "react"
import api from "@/lib/api"
import Header from "@/components/layout/Header"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Search, Loader2, Printer, AlertTriangle } from "lucide-react"

export default function ReceiptsPage() {
    interface Receipt {
        id: number;
        receipt_code: string;
        transaction_uuid: string;
        amount: number;
        created_at: string;
        merchant_name?: string;
        merchant?: { full_name: string };
    }
    const [receipts, setReceipts] = useState<Receipt[]>([])
    const [loading, setLoading] = useState(false)
    const [searchCode, setSearchCode] = useState("")
    const [searched, setSearched] = useState(false)

    const fetchReceipts = async (code = "") => {
        setLoading(true)
        setSearched(true)
        try {
            const query = code ? `?code=${code}` : ""
            // Assuming the backend has this endpoint logic implemented
            const res = await api.get(`/receipts/${query}`)
            setReceipts(Array.isArray(res.data) ? res.data : [res.data]) // Handle list or single obj
        } catch (error) {
            console.error("Error fetching receipts:", error)
            setReceipts([])
        } finally {
            setLoading(false)
        }
    }

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        if (!searchCode) return
        fetchReceipts(searchCode)
    }

    return (
        <div className="space-y-6">
            <Header title="Recibos" subtitle="Consulta e auditoria de comprovantes fiscais" />

            <Card>
                <CardContent className="p-6">
                    <form onSubmit={handleSearch} className="flex gap-4 mb-6">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Digite o Código do Recibo (ex: REC-2025-001)"
                                className="pl-8"
                                value={searchCode}
                                onChange={(e) => setSearchCode(e.target.value)}
                            />
                        </div>
                        <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Consultar"}
                        </Button>
                    </form>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Código</TableHead>
                                    <TableHead>Transação</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead>Comerciante</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {receipts.length > 0 ? (
                                    receipts.map((r) => (
                                        <TableRow key={r.id || r.receipt_code}>
                                            <TableCell className="font-mono font-bold">{r.receipt_code}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{r.transaction_uuid}</TableCell>
                                            <TableCell>{r.created_at}</TableCell>
                                            <TableCell>{r.merchant_name || r.merchant?.full_name || "N/A"}</TableCell>
                                            <TableCell className="font-bold text-emerald-600">{r.amount} MZN</TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="outline" size="sm" onClick={() => window.print()}>
                                                    <Printer className="h-4 w-4 mr-2" /> Imprimir
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                                            {searched ? (
                                                <div className="flex flex-col items-center gap-2">
                                                    <AlertTriangle className="h-8 w-8 text-yellow-500 opacity-50" />
                                                    <span>Nenhum recibo encontrado com este código.</span>
                                                </div>
                                            ) : (
                                                "Utilize a busca acima para localizar um recibo."
                                            )}
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
