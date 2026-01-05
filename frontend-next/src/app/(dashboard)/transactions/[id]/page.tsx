"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import api from "@/lib/api"
import { Transaction } from "@/types"
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
    ArrowLeft,
    Printer,
    Download,
    Store,
    User,
    MonitorSmartphone,
    CreditCard,
    CheckCircle,
    XCircle,
    Copy,
    Calendar,
    MapPin,
    Smartphone,
    History,
    QrCode
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/components/ui/use-toast"
import { QRCodeSVG } from "qrcode.react"

export default function TransactionDetailPage() {
    const { id } = useParams() // UUID
    const router = useRouter()
    const { toast } = useToast()
    const [transaction, setTransaction] = useState<Transaction | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchTransaction()
        }
    }, [id])

    const fetchTransaction = async () => {
        setLoading(true)
        try {
            const res = await api.get(`/transactions/uuid/${id}`)
            setTransaction(res.data)
        } catch (error) {
            console.error("Error fetching transaction:", error)
        } finally {
            setLoading(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text)
        toast({ title: "Copiado!", description: "Texto copiado para área de transferência." })
    }

    if (loading) {
        return (
            <div className="h-[60vh] flex flex-col items-center justify-center text-slate-400">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-12 w-12 bg-slate-200 rounded-full mb-4"></div>
                    <div className="h-4 w-48 bg-slate-200 rounded mb-2"></div>
                </div>
            </div>
        )
    }

    if (!transaction) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
                <div className="h-16 w-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
                    <XCircle className="h-8 w-8" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">Transação não encontrada</h2>
                <Button onClick={() => router.back()}>Voltar</Button>
            </div>
        )
    }

    const isSuccess = transaction.status === 'SUCESSO'
    const statusColor = isSuccess ? 'text-emerald-600' : 'text-red-600'
    const statusBg = isSuccess ? 'bg-emerald-50' : 'bg-red-50'
    const statusBorder = isSuccess ? 'border-emerald-100' : 'border-red-100'

    // Smart Resolvers
    const responsibleName = transaction.agent?.full_name || transaction.funcionario?.full_name || "Desconhecido"
    const responsibleRole = transaction.agent ? "Agente Oficial" : "Funcionário (Backoffice)"
    const responsibleId = transaction.agent?.agent_code || `Func ID: ${transaction.funcionario?.id}`

    const formatCurrency = (val: number) => new Intl.NumberFormat('pt-MZ', { style: 'currency', currency: 'MZN' }).format(val)
    const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    })

    return (
        <div className="space-y-6 pb-20 fade-in px-2 md:px-0">
            {/* PRINT STYLES - Override global print styles for receipt */}
            <style type="text/css" media="print">
                {`
                    @page { 
                        size: 80mm auto; 
                        margin: 5mm; 
                    }
                    
                    /* Hide everything first */
                    body * {
                        visibility: hidden !important;
                    }
                    
                    /* Hide sidebar, navigation, buttons explicitly */
                    aside, nav, header, footer, 
                    .no-print, .print\\:hidden,
                    button, .btn,
                    [class*="no-print"] {
                        display: none !important;
                    }
                    
                    /* Show the printable receipt and all its children */
                    #printable-receipt,
                    #printable-receipt * {
                        visibility: visible !important;
                        display: block !important;
                    }
                    
                    /* Exception: flex elements inside receipt */
                    #printable-receipt .flex,
                    #printable-receipt [class*="flex"] {
                        display: flex !important;
                    }
                    
                    #printable-receipt .inline-flex,
                    #printable-receipt [class*="inline-flex"] {
                        display: inline-flex !important;
                    }
                    
                    #printable-receipt .grid,
                    #printable-receipt [class*="grid"] {
                        display: grid !important;
                    }
                    
                    /* Position receipt for print */
                    #printable-receipt {
                        position: fixed !important;
                        left: 0 !important;
                        top: 0 !important;
                        transform: none !important;
                        width: 100% !important;
                        max-width: 80mm !important;
                        margin: 0 auto !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                    
                    /* Reset body/html for print */
                    html, body {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        background: white !important;
                    }
                    
                    /* Hide main layout margin */
                    main, .ml-64 {
                        margin: 0 !important;
                        margin-left: 0 !important;
                        padding: 0 !important;
                    }
                `}
            </style>

            {/* HEADER NAV */}
            <div className="flex items-center justify-between no-print print:hidden">
                <Button variant="ghost" size="sm" onClick={() => router.back()} className="text-slate-500 hover:text-slate-900">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint}>
                        <Printer className="mr-2 h-4 w-4" /> Imprimir
                    </Button>
                </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-8 items-start max-w-5xl mx-auto print:block print:w-full">

                {/* LEFT COLUMN: VISUAL RECEIPT */}
                <div className="flex justify-center lg:justify-end print:justify-center">
                    <div id="printable-receipt" className={cn(
                        "relative w-full max-w-[380px] bg-white shadow-2xl overflow-hidden print:shadow-none print:max-w-none print:w-full",
                        "text-slate-900 font-mono text-sm leading-relaxed"
                    )}>
                        {/* Thermal Paper Top Decoration */}
                        <div className="h-2 bg-slate-100 border-b border-dashed border-slate-300"></div>

                        <div className="p-8 pb-12 relative">
                            {/* Watermark / Background Pattern */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
                                <div className="transform -rotate-45 text-9xl font-black text-slate-900 whitespace-nowrap select-none">
                                    PAYSAFE
                                </div>
                            </div>

                            {/* LOGO AREA */}
                            <div className="text-center mb-6 space-y-1 relative z-10">
                                <div className="inline-flex items-center justify-center h-12 w-12 bg-slate-900 text-white rounded-lg mb-2">
                                    <CreditCard className="h-6 w-6" />
                                </div>
                                <h1 className="text-xl font-black tracking-widest uppercase">Paysafe Systems</h1>
                                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Digital Payment Gateway</p>
                                <p className="text-xs text-slate-500">
                                    {transaction.district && transaction.province
                                        ? `${transaction.district}, ${transaction.province}`
                                        : "Moçambique"
                                    }
                                </p>
                            </div>

                            <Separator className="my-6 border-slate-200" />

                            {/* TRANSACTION AMOUNT */}
                            <div className="text-center my-8 relative z-10">
                                <p className="text-xs uppercase text-slate-500 tracking-wider mb-1">Valor Total</p>
                                <div className={cn("text-4xl font-black tracking-tight", statusColor)}>
                                    {formatCurrency(transaction.amount)}
                                </div>
                                <div className={cn(
                                    "inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide mt-3 border",
                                    statusBg, statusColor, statusBorder
                                )}>
                                    {isSuccess ? <CheckCircle className="w-3 h-3 mr-1.5" /> : <XCircle className="w-3 h-3 mr-1.5" />}
                                    {transaction.status}
                                </div>
                            </div>

                            {/* INFO GRID */}
                            <div className="space-y-4 relative z-10 my-6">
                                {/* Merchant Info */}
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Comerciante</p>
                                    <div className="flex justify-between items-baseline border-b border-dashed border-slate-200 pb-1">
                                        <span className="font-bold">{transaction.merchant?.full_name}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Local:</span>
                                        <span>{transaction.merchant?.market_name || "---"}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>NFC ID:</span>
                                        <span className="font-mono">{transaction.merchant?.nfc_uid || "---"}</span>
                                    </div>
                                </div>

                                {/* Transaction Details */}
                                <div className="space-y-1 pt-2">
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Detalhes</p>
                                    <div className="flex justify-between py-1">
                                        <span>Data:</span>
                                        <span className="font-bold">{formatDate(transaction.created_at)}</span>
                                    </div>
                                    <div className="flex justify-between py-1 bg-slate-50/50">
                                        <span>Método:</span>
                                        <span className="font-bold uppercase">{transaction.payment_method}</span>
                                    </div>
                                    <div className="flex justify-between py-1">
                                        <span>Ref. Interna:</span>
                                        <span className="font-mono">{transaction.payment_reference}</span>
                                    </div>
                                    {/* Only show M-Pesa/mobile reference for non-cash payments */}
                                    {transaction.mpesa_reference && transaction.payment_method !== 'Numerario' && (
                                        <div className="flex justify-between py-1 bg-orange-50/50 text-orange-900">
                                            <span>{transaction.payment_method === 'M-Pesa' ? 'M-Pesa Ref:' :
                                                transaction.payment_method === 'e-Mola' ? 'E-Mola Ref:' :
                                                    transaction.payment_method === 'mKesh' ? 'M-Kesh Ref:' : 'Ref. Móvel:'}</span>
                                            <span className="font-bold font-mono">{transaction.mpesa_reference}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Operator Info */}
                                <div className="space-y-1 pt-2">
                                    <p className="text-[10px] uppercase text-slate-400 font-bold">Operador</p>
                                    <div className="flex justify-between text-xs text-slate-600">
                                        <span>Responsável:</span>
                                        <span className="font-medium text-right">{responsibleName}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-slate-500">
                                        <span>Cargo:</span>
                                        <span>{responsibleRole}</span>
                                    </div>
                                    {transaction.pos_device && (
                                        <div className="flex justify-between text-xs text-slate-500">
                                            <span>Terminal POS:</span>
                                            <span>{transaction.pos_device.serial_number}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <Separator className="my-6 border-slate-800" />

                            {/* FOOTER UUID */}
                            <div className="text-center space-y-2 relative z-10">
                                <p className="text-[10px] font-mono text-slate-400 break-all cursor-pointer hover:text-slate-600 transition-colors"
                                    onClick={() => copyToClipboard(transaction.transaction_uuid)}
                                    title="Clique para copiar UUID"
                                >
                                    UUID: {transaction.transaction_uuid}
                                </p>
                                <div className="flex justify-center">
                                    {/* QR Code for Verification */}
                                    <ReceiptQRCode uuid={transaction.transaction_uuid} />
                                </div>
                                <p className="text-[9px] text-slate-400 pt-1">Digitalize para verificar autenticidade</p>
                                <p className="text-[10px] text-slate-400 pt-2">Obrigado pela preferência.</p>
                            </div>
                        </div>

                        {/* ZigZag Bottom Edge */}
                        <div className="absolute bottom-0 left-0 right-0 h-4 bg-white" style={{
                            maskImage: 'linear-gradient(45deg, transparent 50%, black 50%), linear-gradient(-45deg, transparent 50%, black 50%)',
                            maskSize: '20px 20px',
                            maskRepeat: 'repeat-x',
                            maskPosition: '0 100%'
                        }}>
                            {/* Styling trick: This div effectively cuts the receipt if background was different, 
                                 but here we want the SHAPE. 
                                 Better approach for white receipt on gray background:
                              */}
                        </div>
                        {/* SVG Solution for clean zigzag */}
                        <div className="absolute -bottom-3 left-0 w-full h-3 overflow-hidden">
                            <svg viewBox="0 0 1200 12" preserveAspectRatio="none" className="w-full h-full fill-white drop-shadow-sm" style={{ filter: 'drop-shadow(0 4px 3px rgb(0 0 0 / 0.07))' }}>
                                <path d="M0,0 L0,12 L15,0 L30,12 L45,0 L60,12 L75,0 L90,12 L105,0 L120,12 L135,0 L150,12 L165,0 L180,12 L195,0 L210,12 L225,0 L240,12 L255,0 L270,12 L285,0 L300,12 L315,0 L330,12 L345,0 L360,12 L375,0 L390,12 L405,0 L420,12 L435,0 L450,12 L465,0 L480,12 L495,0 L510,12 L525,0 L540,12 L555,0 L570,12 L585,0 L600,12 L615,0 L630,12 L645,0 L660,12 L675,0 L690,12 L705,0 L720,12 L735,0 L750,12 L765,0 L780,12 L795,0 L810,12 L825,0 L840,12 L855,0 L870,12 L885,0 L900,12 L915,0 L930,12 L945,0 L960,12 L975,0 L990,12 L1005,0 L1020,12 L1035,0 L1050,12 L1065,0 L1080,12 L1095,0 L1110,12 L1125,0 L1140,12 L1155,0 L1170,12 L1185,0 L1200,12V0z" fill="white" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: TECHNICAL & ACTIONS */}
                <div className="space-y-6 no-print">

                    {/* Status Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-sm font-medium text-slate-500">Estado da Transação</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center gap-4">
                                <div className={cn("p-3 rounded-full", isSuccess ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600")}>
                                    {isSuccess ? <CheckCircle className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{transaction.status}</h3>
                                    <p className="text-sm text-slate-500">{
                                        isSuccess
                                            ? "O pagamento foi processado e confirmado."
                                            : "O pagamento falhou ou foi rejeitado pela rede."
                                    }</p>
                                </div>
                            </div>
                            {!isSuccess && transaction.response_payload?.error && (
                                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800 font-mono">
                                    ERROR: {transaction.response_payload.error}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Entities Links */}
                    <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => router.push(`/merchants/${transaction.merchant_id}`)}>
                            <Store className="h-5 w-5 text-slate-500" />
                            <span className="text-xs">Ver Comerciante</span>
                        </Button>
                        <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1">
                            <History className="h-5 w-5 text-slate-500" />
                            <span className="text-xs">Histórico</span>
                        </Button>
                    </div>

                    {/* Technical Data Accordion */}
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger className="text-sm text-slate-500">Dados Técnicos / Payload</AccordionTrigger>
                            <AccordionContent>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div className="p-2 bg-slate-50 rounded">
                                            <span className="block text-slate-400 font-bold mb-1">UUID</span>
                                            <span className="font-mono break-all">{transaction.transaction_uuid}</span>
                                            <Button variant="ghost" size="icon" className="h-4 w-4 ml-1" onClick={() => copyToClipboard(transaction.transaction_uuid)}>
                                                <Copy className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded">
                                            <span className="block text-slate-400 font-bold mb-1">POS ID</span>
                                            <span className="font-mono">{transaction.pos_id || "N/A"}</span>
                                        </div>
                                    </div>

                                    <div className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto">
                                        <p className="text-xs text-slate-400 mb-2 font-bold uppercase">Response Payload</p>
                                        <pre className="text-[10px] font-mono leading-relaxed">
                                            {JSON.stringify(transaction.response_payload || {}, null, 2)}
                                        </pre>
                                    </div>

                                    {transaction.request_payload && (
                                        <div className="bg-slate-100 text-slate-700 p-4 rounded-md overflow-x-auto">
                                            <p className="text-xs text-slate-400 mb-2 font-bold uppercase">Request Payload</p>
                                            <pre className="text-[10px] font-mono leading-relaxed">
                                                {JSON.stringify(transaction.request_payload || {}, null, 2)}
                                            </pre>
                                        </div>
                                    )}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                </div>
            </div>
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
                // Call backend to get properly signed QR token
                const res = await api.get(`/receipts/qr-token-by-uuid/${uuid}`)
                setQrData(res.data.qr_token)
                setLoading(false)
            } catch (err) {
                console.error('Failed to fetch QR token:', err)
                setError('Erro ao gerar QR')
                setLoading(false)
            }
        }
        fetchQrToken()
    }, [uuid])

    if (loading) {
        return (
            <div className="p-2 bg-white border border-slate-200 rounded-lg inline-block w-[100px] h-[100px] flex items-center justify-center">
                <div className="animate-spin h-6 w-6 border-2 border-slate-300 border-t-slate-600 rounded-full"></div>
            </div>
        )
    }

    if (error || !qrData) {
        return (
            <div className="p-2 bg-red-50 border border-red-200 rounded-lg inline-block text-red-500 text-xs">
                {error || 'QR indisponível'}
            </div>
        )
    }

    return (
        <div className="p-2 bg-white border border-slate-200 rounded-lg inline-block">
            <QRCodeSVG
                value={qrData}
                size={100}
                level="M"
                bgColor="#ffffff"
                fgColor="#0f172a"
            />
        </div>
    )
}
