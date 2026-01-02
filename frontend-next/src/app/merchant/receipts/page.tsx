"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Loader2, Printer, CreditCard, CheckCircle, XCircle, X } from "lucide-react"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"
import { QRCodeSVG } from "qrcode.react"

interface Transaction {
    id: number
    transaction_uuid: string
    amount: number
    currency: string
    status: string
    created_at: string
    payment_method: string
    payment_reference?: string
    mpesa_reference?: string
    province?: string  // Transaction location snapshot
    district?: string  // Transaction location snapshot
    merchant?: {
        full_name: string
        market_name?: string
        nfc_uid?: string
        district?: string
        province?: string
    }
    agent?: {
        full_name: string
        agent_code: string
    }
    funcionario?: {
        id: number
        full_name: string
    }
    pos_device?: {
        serial_number: string
    }
}

// Reusable Receipt Component matching authentic design
const ReceiptTemplate = ({ tx, isPrintCopy = false }: { tx: Transaction, isPrintCopy?: boolean }) => {
    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val)

    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    const getResponsibleName = (t: Transaction) => t.agent?.full_name || t.funcionario?.full_name || "Desconhecido"
    const getResponsibleRole = (t: Transaction) => t.agent ? "Agente Oficial" : "Funcionário (Backoffice)"

    return (
        <div className={cn(
            "w-full max-w-[380px] bg-white shadow-2xl overflow-hidden relative text-slate-900 font-mono text-sm leading-relaxed rounded-sm",
            isPrintCopy && "shadow-none border border-slate-400 max-w-none w-[80mm]"
        )}>

            {/* Thermal Paper Top Decoration */}
            <div className="h-2 bg-slate-100 border-b border-dashed border-slate-300"></div>

            <div className="p-8 pb-12 relative bg-white">
                {/* Watermark */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
                    <div className="transform -rotate-45 text-9xl font-black text-slate-900 whitespace-nowrap select-none">
                        PAYSAFE
                    </div>
                </div>

                {/* HEADER */}
                <div className="text-center mb-6 space-y-1 relative z-10">
                    <div className="inline-flex items-center justify-center h-12 w-12 bg-slate-900 text-white rounded-lg mb-2">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <h1 className="text-xl font-black tracking-widest uppercase">Paysafe Systems</h1>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Digital Payment Gateway</p>
                    <p className="text-xs text-slate-500">
                        {tx.district && tx.province
                            ? `${tx.district}, ${tx.province}`
                            : tx.merchant?.district && tx.merchant?.province
                                ? `${tx.merchant.district}, ${tx.merchant.province}`
                                : "Moçambique"
                        }
                    </p>
                </div>

                <Separator className="my-6 border-slate-200" />

                {/* TRANSACTION AMOUNT */}
                <div className="text-center my-8 relative z-10">
                    <p className="text-xs uppercase text-slate-500 tracking-wider mb-1">Valor Total</p>
                    <div className="text-4xl font-black tracking-tight text-emerald-600">
                        {formatCurrency(Number(tx.amount))}
                    </div>
                    <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mt-3 border border-emerald-100 bg-emerald-50 text-emerald-600">
                        <CheckCircle className="w-3 h-3 mr-1.5" />
                        {tx.status}
                    </div>
                </div>

                {/* INFO GRID */}
                <div className="space-y-4 relative z-10 my-6">
                    {/* Merchant Info */}
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Comerciante</p>
                        <div className="flex justify-between items-baseline border-b border-dashed border-slate-200 pb-1">
                            <span className="font-bold">{tx.merchant?.full_name}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Local:</span>
                            <span>{tx.merchant?.market_name || "---"}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>NFC ID:</span>
                            <span className="font-mono">{tx.merchant?.nfc_uid || "---"}</span>
                        </div>
                    </div>

                    {/* Transaction Details */}
                    <div className="space-y-1 pt-2">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Detalhes</p>
                        <div className="flex justify-between py-1">
                            <span>Data:</span>
                            <span className="font-bold">{formatDate(tx.created_at)}</span>
                        </div>
                        <div className="flex justify-between py-1 bg-slate-50/50">
                            <span>Método:</span>
                            <span className="font-bold uppercase">{tx.payment_method}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span>Ref. Interna:</span>
                            <span className="font-mono">{tx.payment_reference}</span>
                        </div>
                        {/* Only show M-Pesa/mobile reference for non-cash payments */}
                        {tx.mpesa_reference && tx.payment_method !== 'DINHEIRO' && (
                            <div className="flex justify-between py-1 bg-orange-50/50 text-orange-900">
                                <span>{tx.payment_method === 'MPESA' ? 'M-Pesa Ref:' :
                                    tx.payment_method === 'EMOLA' ? 'E-Mola Ref:' :
                                        tx.payment_method === 'MKESH' ? 'M-Kesh Ref:' : 'Ref. Móvel:'}</span>
                                <span className="font-bold font-mono">{tx.mpesa_reference}</span>
                            </div>
                        )}
                    </div>

                    {/* Operator Info */}
                    <div className="space-y-1 pt-2">
                        <p className="text-[10px] uppercase text-slate-400 font-bold">Operador</p>
                        <div className="flex justify-between text-xs text-slate-600">
                            <span>Responsável:</span>
                            <span className="font-medium text-right">{getResponsibleName(tx)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-500">
                            <span>Cargo:</span>
                            <span>{getResponsibleRole(tx)}</span>
                        </div>
                        {tx.pos_device && (
                            <div className="flex justify-between text-xs text-slate-500">
                                <span>Terminal POS:</span>
                                <span>{tx.pos_device.serial_number}</span>
                            </div>
                        )}
                    </div>
                </div>

                <Separator className="my-6 border-slate-800" />

                {/* FOOTER UUID */}
                <div className="text-center space-y-2 relative z-10">
                    <p className="text-[10px] font-mono text-slate-400 break-all">
                        UUID: {tx.transaction_uuid}
                    </p>
                    <div className="flex justify-center pt-2">
                        {/* QR Code for Receipt Verification */}
                        <ReceiptQRCode uuid={tx.transaction_uuid} />
                    </div>
                    <p className="text-[10px] text-slate-400 pt-2">Escaneie para verificar autenticidade.</p>
                </div>
            </div>

            {/* ZigZag Bottom */}
            <div className="absolute -bottom-2 left-0 w-full h-3 overflow-hidden">
                <svg viewBox="0 0 1200 12" preserveAspectRatio="none" className="w-full h-full fill-white drop-shadow-sm" style={{ filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))' }}>
                    <path d="M0,0 L0,12 L15,0 L30,12 L45,0 L60,12 L75,0 L90,12 L105,0 L120,12 L135,0 L150,12 L165,0 L180,12 L195,0 L210,12 L225,0 L240,12 L255,0 L270,12 L285,0 L300,12 L315,0 L330,12 L345,0 L360,12 L375,0 L390,12 L405,0 L420,12 L435,0 L450,12 L465,0 L480,12 L495,0 L510,12 L525,0 L540,12 L555,0 L570,12 L585,0 L600,12 L615,0 L630,12 L645,0 L660,12 L675,0 L690,12 L705,0 L720,12 L735,0 L750,12 L765,0 L780,12 L795,0 L810,12 L825,0 L840,12 L855,0 L870,12 L885,0 L900,12 L915,0 L930,12 L945,0 L960,12 L975,0 L990,12 L1005,0 L1020,12 L1035,0 L1050,12 L1065,0 L1080,12 L1095,0 L1110,12 L1125,0 L1140,12 L1155,0 L1170,12 L1185,0 L1200,12V0z" fill="white" />
                </svg>
            </div>
        </div>
    )
}

export default function MerchantReceiptsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)

    useEffect(() => {
        const fetchReceipts = async () => {
            try {
                const res = await api.get("/transactions/", {
                    params: {
                        status: 'SUCESSO',
                        limit: 100
                    }
                })
                setTransactions(res.data)
            } catch (error) {
                console.error("Error fetching receipts", error)
            } finally {
                setLoading(false)
            }
        }
        fetchReceipts()
    }, [])

    const handleOpenReceipt = (tx: Transaction) => {
        setSelectedTx(tx)
        setIsDialogOpen(true)
    }

    const formatCurrency = (val: number) =>
        new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val)

    return (
        <div className="space-y-6">
            <style type="text/css" media="print">
                {`
                    @page { size: auto; margin: 0; }
                    body { visibility: hidden; }
                    
                    /* HIDE THE DIALOG ITSELF */
                    div[role="dialog"] { display: none !important; }
                    
                    /* SHOW THE DEDICATED PRINT ID */
                    #printable-receipt-root {
                        visibility: visible !important;
                        position: fixed !important;
                        inset: 0 !important;
                        z-index: 99999 !important;
                        background: white !important;
                        display: flex !important;
                        justify-content: center !important;
                        align-items: flex-start !important;
                        padding-top: 20px !important;
                    }
                    
                    #printable-receipt-root * { 
                        visibility: visible !important; 
                    }
                `}
            </style>

            <div className="flex justify-between items-center no-print">
                <h1 className="text-2xl font-bold">Meus Recibos</h1>
            </div>

            <Card className="no-print">
                <CardContent className="p-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Ref. Pagamento</TableHead>
                                    <TableHead>UUID</TableHead>
                                    <TableHead>Valor</TableHead>
                                    <TableHead>Data</TableHead>
                                    <TableHead className="text-right">Ação</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {transactions.map(tx => (
                                    <TableRow key={tx.id}>
                                        <TableCell className="font-mono font-medium">
                                            {tx.payment_reference || "—"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-xs font-mono">
                                            {tx.transaction_uuid.substring(0, 8)}...
                                        </TableCell>
                                        <TableCell className="font-bold text-emerald-600">
                                            {formatCurrency(Number(tx.amount))}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {new Date(tx.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => handleOpenReceipt(tx)}
                                            >
                                                <Printer className="w-3 h-3" />
                                                Visualizar
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                                {transactions.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                            Você ainda não possui transações aprovadas.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* VIEW DIALOG */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-[420px] p-0 overflow-hidden bg-transparent border-none shadow-none flex justify-center outline-none no-print">
                    {selectedTx && (
                        <div className="relative">
                            <ReceiptTemplate tx={selectedTx} />

                            {/* Actions */}
                            <div className="absolute top-4 right-4 flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 text-slate-500"
                                    onClick={() => window.print()}
                                >
                                    <Printer className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-700 text-slate-500"
                                    onClick={() => setIsDialogOpen(false)}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* PRINT-ONLY ELEMENT (Outside Dialog, mimic transaction page) */}
            {selectedTx && (
                <div id="printable-receipt-root" className="hidden">
                    <ReceiptTemplate tx={selectedTx} isPrintCopy={true} />
                </div>
            )}
        </div>
    )
}

// QR Code component that fetches signed token from backend API
function ReceiptQRCode({ uuid }: { uuid: string }) {
    const [qrData, setQrData] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchQrToken = async () => {
            try {
                const res = await api.get(`/receipts/qr-token-by-uuid/${uuid}`)
                setQrData(res.data.qr_token)
                setLoading(false)
            } catch (err) {
                console.error('Failed to fetch QR token:', err)
                setError('Erro')
                setLoading(false)
            }
        }
        fetchQrToken()
    }, [uuid])

    if (loading) {
        return (
            <div className="w-[80px] h-[80px] flex items-center justify-center bg-slate-100 rounded">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
        )
    }

    if (error || !qrData) {
        return (
            <div className="w-[80px] h-[80px] flex items-center justify-center bg-red-50 text-red-400 text-[8px] rounded">
                QR Error
            </div>
        )
    }

    return (
        <div className="p-1 bg-white border border-slate-200 rounded inline-block">
            <QRCodeSVG
                value={qrData}
                size={80}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
            />
        </div>
    )
}
