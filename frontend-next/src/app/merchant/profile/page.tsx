"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { User, Phone, MapPin, CreditCard, Tag, Store, Building2 } from "lucide-react"
import api from "@/lib/api"
import { ChangeMyPasswordDialog } from "@/components/features/merchants/ChangeMyPasswordDialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

export default function MerchantProfilePage() {
    const { user } = useAuth()
    const [merchant, setMerchant] = useState<any>(null)
    const [market, setMarket] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return

            try {
                // Fetch fresh merchant data by ID
                const res = await api.get(`/merchants/${user.id}`)
                const merchantData = res.data
                setMerchant(merchantData)

                // If market_name is not set but market_id exists, fetch market separately
                if (merchantData.market_id && !merchantData.market_name) {
                    try {
                        const marketRes = await api.get(`/markets/${merchantData.market_id}`)
                        setMarket(marketRes.data)
                    } catch (marketError) {
                        console.error("Erro ao carregar mercado:", marketError)
                    }
                } else if (merchantData.market_name) {
                    // Market data is already in merchant response
                    setMarket({
                        name: merchantData.market_name,
                        province: merchantData.market_province,
                        district: merchantData.market_district
                    })
                }
            } catch (error) {
                console.error("Erro ao carregar perfil", error)
                // Fallback: use the user object directly (which is the merchant)
                setMerchant(user)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [user])

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl">
                <Skeleton className="h-12 w-48" />
                <Skeleton className="h-64 w-full" />
            </div>
        )
    }

    if (!merchant && !user) return null

    // Use merchant data if available, fallback to user
    const data = merchant || user

    const translateMerchantType = (type?: string) => {
        const map: Record<string, string> = {
            "FIXO": "Banca Fixa",
            "AMBULANTE": "Vendedor Ambulante",
        }
        return type ? (map[type] || type) : "—"
    }

    const translateStatus = (status?: string) => {
        const map: Record<string, string> = {
            "ATIVO": "Ativo",
            "INATIVO": "Inativo",
            "SUSPENSO": "Suspenso",
            "BLOQUEADO": "Bloqueado",
        }
        return status ? (map[status] || status) : "—"
    }

    // Get market info from either merchant response or separate market fetch
    const marketName = market?.name || data.market_name
    const marketProvince = market?.province || data.market_province
    const marketDistrict = market?.district || data.market_district

    return (
        <div className="space-y-6 max-w-4xl">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-900">Meu Perfil</h1>
                <Badge
                    variant={data.status === 'ATIVO' ? 'default' : 'destructive'}
                    className={data.status === 'ATIVO' ? 'bg-emerald-500 hover:bg-emerald-600' : ''}
                >
                    {translateStatus(data.status)}
                </Badge>
            </div>

            {/* MAIN INFO CARD */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Dados Cadastrais</CardTitle>
                    <CardDescription>Informações completas da sua conta.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* Identification */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Nome Completo</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <User className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-900">{data.full_name || "—"}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Nome Comercial</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <Building2 className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-900">{data.business_name || data.full_name || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Business Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Tipo de Vendedor</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <Store className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-900">{translateMerchantType(data.merchant_type)}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Ramo de Negócio</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <Store className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-900">{data.business_type || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Location & Contact */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">Mercado / Localização</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <MapPin className="h-5 w-5 text-slate-400" />
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-900">
                                        {marketName || (marketProvince ? `${marketDistrict || ''}, ${marketProvince}` : "Sem mercado atribuído")}
                                    </span>
                                    {marketName && (marketProvince || marketDistrict) && (
                                        <span className="text-xs text-slate-500">{marketDistrict}{marketDistrict && marketProvince ? ', ' : ''}{marketProvince}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Telefone / Celular</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <Phone className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-900">{data.phone_number || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Tech & IDs */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-slate-600">NFC UID (Cartão)</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <Tag className="h-5 w-5 text-slate-400" />
                                <span className="font-mono text-slate-900">{data.nfc_uid || "Não vinculado"}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-600">Documento ({data.id_document_type || "BI"})</Label>
                            <div className="flex items-center gap-3 p-3 border border-slate-200 rounded-md bg-slate-50">
                                <CreditCard className="h-5 w-5 text-slate-400" />
                                <span className="font-medium text-slate-900">{data.id_document_number || "—"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mobile Money */}
                    <div className="border-t border-slate-100 pt-4">
                        <h3 className="text-sm font-semibold text-slate-900 mb-3">Contas Cadastradas (Recebimentos)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-3 bg-red-50 border border-red-100 rounded-md">
                                <span className="text-xs text-red-600 font-bold block mb-1">M-Pesa</span>
                                <span className="text-sm font-medium text-slate-800">{data.mpesa_number || "Não cadastrado"}</span>
                            </div>
                            <div className="p-3 bg-orange-50 border border-orange-100 rounded-md">
                                <span className="text-xs text-orange-600 font-bold block mb-1">e-Mola</span>
                                <span className="text-sm font-medium text-slate-800">{data.emola_number || "Não cadastrado"}</span>
                            </div>
                            <div className="p-3 bg-blue-50 border border-blue-100 rounded-md">
                                <span className="text-xs text-blue-600 font-bold block mb-1">mKesh</span>
                                <span className="text-sm font-medium text-slate-800">{data.mkesh_number || "Não cadastrado"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground mt-4 pt-4 border-t border-slate-100">
                        Para alterar dados sensíveis como Nome, Mercado ou NFC, entre em contacto com o seu Supervisor.
                    </div>
                </CardContent>
            </Card>

            {/* SECURITY CARD */}
            <Card className="bg-white border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-slate-800">Segurança da Conta</CardTitle>
                    <CardDescription>Altere a sua palavra-passe de acesso.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ChangeMyPasswordDialog merchantId={data.id} />
                </CardContent>
            </Card>
        </div>
    )
}
