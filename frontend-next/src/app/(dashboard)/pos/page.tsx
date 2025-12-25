"use client"

import React, { useEffect, useState } from "react"
import api from "@/lib/api"
import { POSDevice } from "@/types"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, Plus, Search, Laptop, MonitorSmartphone } from "lucide-react"
import { CreatePosDialog } from "@/components/forms/CreatePosDialog"
import { StatusBadge } from "@/components/StatusBadge"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useRouter } from "next/navigation"

export default function POSPage() {
    const router = useRouter()
    const [devices, setDevices] = useState<POSDevice[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState("")
    const [statusFilter, setStatusFilter] = useState("ALL")
    const [provinceFilter, setProvinceFilter] = useState("ALL")
    const [districtFilter, setDistrictFilter] = useState("")

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDevices()
        }, 500)
        return () => clearTimeout(timer)
    }, [provinceFilter, districtFilter])

    const fetchDevices = async () => {
        setLoading(true)
        try {
            const params: any = {}
            if (provinceFilter !== "ALL") params.province = provinceFilter
            if (districtFilter) params.district = districtFilter

            const res = await api.get("/pos-devices/", { params })
            setDevices(res.data)
        } catch (error) {
            console.error("Error fetching POS devices:", error)
            setDevices([])
        } finally {
            setLoading(false)
        }
    }

    const filteredDevices = devices.filter(d => {
        const matchesSearch =
            d.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            d.model?.toLowerCase().includes(searchTerm.toLowerCase())

        const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter

        return matchesSearch && matchesStatus
    })

    return (
        <div className="space-y-6">
            <Header title="Dispositivos POS" subtitle="Terminais de cobrança ativos" />

            <Card>
                <CardContent className="p-6">
                    {/* TOOLBAR */}
                    <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-end">
                        <div className="flex flex-col md:flex-row gap-2 w-full flex-wrap">
                            <div className="relative w-full md:w-64">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="Buscar Serial ou Modelo..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            {/* PROVINCE FILTER */}
                            <select
                                className="flex h-10 w-full md:w-[180px] rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                value={provinceFilter}
                                onChange={(e) => setProvinceFilter(e.target.value)}
                            >
                                <option value="ALL">Todas Províncias</option>
                                <option value="Maputo">Maputo</option>
                                <option value="Matola">Matola</option>
                                <option value="Gaza">Gaza</option>
                                <option value="Inhambane">Inhambane</option>
                                <option value="Sofala">Sofala</option>
                                <option value="Manica">Manica</option>
                                <option value="Tete">Tete</option>
                                <option value="Zambézia">Zambézia</option>
                                <option value="Nampula">Nampula</option>
                                <option value="Niassa">Niassa</option>
                                <option value="Cabo Delgado">Cabo Delgado</option>
                            </select>

                            {/* DISTRICT FILTER */}
                            <Input
                                placeholder="Município..."
                                className="w-full md:w-[150px] bg-white border-slate-200 focus:bg-white transition-colors"
                                value={districtFilter}
                                onChange={(e) => setDistrictFilter(e.target.value)}
                            />

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full md:w-[150px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">Todos os Status</SelectItem>
                                    <SelectItem value="ATIVO">Ativos</SelectItem>
                                    <SelectItem value="INATIVO">Inativos</SelectItem>
                                    <SelectItem value="BLOQUEADO">Bloqueados</SelectItem>
                                </SelectContent>
                            </Select>

                            <Button variant="ghost" className="text-slate-500" onClick={() => {
                                setSearchTerm("")
                                setProvinceFilter("ALL")
                                setDistrictFilter("")
                                setStatusFilter("ALL")
                            }}>
                                Limpar
                            </Button>
                        </div>

                        <CreatePosDialog onSuccess={fetchDevices}>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20">
                                <Plus className="mr-2 h-4 w-4" /> Registrar POS
                            </Button>
                        </CreatePosDialog>
                    </div>

                    {loading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead>Serial Number</TableHead>
                                        <TableHead>Modelo</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Província</TableHead>
                                        <TableHead>Município</TableHead>
                                        <TableHead>Agente Atribuído</TableHead>
                                        <TableHead>Última Conexão</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredDevices.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                                                Nenhum dispositivo encontrado.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredDevices.map((device: POSDevice) => (
                                            <TableRow key={device.id} className="group cursor-pointer hover:bg-slate-50" onClick={() => router.push(`/pos/${device.id}`)}>
                                                <TableCell className="font-mono font-medium flex items-center gap-2">
                                                    <MonitorSmartphone className="h-4 w-4 text-slate-400" />
                                                    {device.serial_number}
                                                </TableCell>
                                                <TableCell>{device.model || "N/A"}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 items-start">
                                                        <Badge variant={
                                                            device.status === "ATIVO" ? "success" :
                                                                device.status === "BLOQUEADO" ? "destructive" : "secondary"
                                                        }>
                                                            {device.status}
                                                        </Badge>
                                                        {(device as any).approval_status && (device as any).approval_status !== "APROVADO" && (
                                                            <StatusBadge status={(device as any).approval_status} showIcon={true} className="text-[10px] h-5" />
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{device.province || "-"}</TableCell>
                                                <TableCell className="text-sm">{device.district || "-"}</TableCell>
                                                <TableCell className="text-sm">
                                                    {device.assigned_agent_id ? (
                                                        <span className="text-blue-600 font-medium">ID #{device.assigned_agent_id}</span>
                                                    ) : (
                                                        <span className="text-slate-400 italic">Não atribuído</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-xs">
                                                    {device.last_seen ? new Date(device.last_seen).toLocaleString() : "Nunca"}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
