"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { Province, Municipality } from "@/types"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Plus,
    Loader2,
    MapPin,
    ChevronDown,
    ChevronRight,
    Trash2,
    Edit,
    Building
} from "lucide-react"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function LocationsPage() {
    const [provinces, setProvinces] = useState<Province[]>([])
    const [municipalities, setMunicipalities] = useState<Municipality[]>([])
    const [loading, setLoading] = useState(true)
    const [expandedProvinces, setExpandedProvinces] = useState<Set<number>>(new Set())
    const { toast } = useToast()

    // Dialog states
    const [showProvinceDialog, setShowProvinceDialog] = useState(false)
    const [showMunicipalityDialog, setShowMunicipalityDialog] = useState(false)
    const [editingProvince, setEditingProvince] = useState<Province | null>(null)
    const [editingMunicipality, setEditingMunicipality] = useState<Municipality | null>(null)
    const [selectedProvinceForMuni, setSelectedProvinceForMuni] = useState<number | null>(null)

    // Form states
    const [provinceName, setProvinceName] = useState("")
    const [provinceCode, setProvinceCode] = useState("")
    const [municipalityName, setMunicipalityName] = useState("")
    const [municipalityProvinceId, setMunicipalityProvinceId] = useState<string>("")
    const [formLoading, setFormLoading] = useState(false)

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const [provRes, muniRes] = await Promise.all([
                api.get("/locations/provinces"),
                api.get("/locations/municipalities")
            ])
            setProvinces(provRes.data)
            setMunicipalities(muniRes.data)
        } catch (error) {
            console.error("Error fetching locations:", error)
            toast({
                title: "Erro",
                description: "Erro ao carregar locais.",
                variant: "destructive"
            })
        } finally {
            setLoading(false)
        }
    }

    const toggleProvince = (id: number) => {
        const newExpanded = new Set(expandedProvinces)
        if (newExpanded.has(id)) {
            newExpanded.delete(id)
        } else {
            newExpanded.add(id)
        }
        setExpandedProvinces(newExpanded)
    }

    const getMunicipalitiesForProvince = (provinceId: number) => {
        return municipalities.filter(m => m.province_id === provinceId)
    }

    // Province CRUD
    const openProvinceDialog = (province?: Province) => {
        if (province) {
            setEditingProvince(province)
            setProvinceName(province.name)
            setProvinceCode(province.code)
        } else {
            setEditingProvince(null)
            setProvinceName("")
            setProvinceCode("")
        }
        setShowProvinceDialog(true)
    }

    const handleSaveProvince = async () => {
        if (!provinceName || !provinceCode) {
            toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" })
            return
        }
        setFormLoading(true)
        try {
            if (editingProvince) {
                await api.put(`/locations/provinces/${editingProvince.id}`, {
                    name: provinceName,
                    code: provinceCode.toUpperCase()
                })
                toast({ title: "Sucesso", description: "Província atualizada." })
            } else {
                await api.post("/locations/provinces", {
                    name: provinceName,
                    code: provinceCode.toUpperCase()
                })
                toast({ title: "Sucesso", description: "Província criada." })
            }
            setShowProvinceDialog(false)
            fetchData()
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Erro ao salvar província.",
                variant: "destructive"
            })
        } finally {
            setFormLoading(false)
        }
    }

    const handleDeleteProvince = async (id: number) => {
        try {
            await api.delete(`/locations/provinces/${id}`)
            toast({ title: "Sucesso", description: "Província removida." })
            fetchData()
        } catch (error) {
            toast({ title: "Erro", description: "Erro ao remover província.", variant: "destructive" })
        }
    }

    // Municipality CRUD
    const openMunicipalityDialog = (provinceId?: number, municipality?: Municipality) => {
        if (municipality) {
            setEditingMunicipality(municipality)
            setMunicipalityName(municipality.name)
            setMunicipalityProvinceId(municipality.province_id.toString())
        } else {
            setEditingMunicipality(null)
            setMunicipalityName("")
            setMunicipalityProvinceId(provinceId?.toString() || "")
        }
        setSelectedProvinceForMuni(provinceId || null)
        setShowMunicipalityDialog(true)
    }

    const handleSaveMunicipality = async () => {
        if (!municipalityName || !municipalityProvinceId) {
            toast({ title: "Erro", description: "Preencha todos os campos.", variant: "destructive" })
            return
        }
        setFormLoading(true)
        try {
            if (editingMunicipality) {
                await api.put(`/locations/municipalities/${editingMunicipality.id}`, {
                    name: municipalityName,
                    province_id: parseInt(municipalityProvinceId)
                })
                toast({ title: "Sucesso", description: "Município atualizado." })
            } else {
                await api.post("/locations/municipalities", {
                    name: municipalityName,
                    province_id: parseInt(municipalityProvinceId)
                })
                toast({ title: "Sucesso", description: "Município criado." })
            }
            setShowMunicipalityDialog(false)
            fetchData()
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Erro ao salvar município.",
                variant: "destructive"
            })
        } finally {
            setFormLoading(false)
        }
    }

    const handleDeleteMunicipality = async (id: number) => {
        try {
            await api.delete(`/locations/municipalities/${id}`)
            toast({ title: "Sucesso", description: "Município removido." })
            fetchData()
        } catch (error) {
            toast({ title: "Erro", description: "Erro ao remover município.", variant: "destructive" })
        }
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Gestão de Locais</h1>
                    <p className="text-slate-500">Gerir províncias e municípios</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openMunicipalityDialog()}>
                        <Building className="mr-2 h-4 w-4" />
                        Novo Município
                    </Button>
                    <Button onClick={() => openProvinceDialog()} className="bg-emerald-600 hover:bg-emerald-700">
                        <Plus className="mr-2 h-4 w-4" />
                        Nova Província
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Províncias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{provinces.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Municípios</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{municipalities.length}</div>
                    </CardContent>
                </Card>
            </div>

            {/* Content */}
            <Card>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
                        </div>
                    ) : (
                        <div className="rounded-md border border-slate-200 overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>Província</TableHead>
                                        <TableHead>Código</TableHead>
                                        <TableHead>Municípios</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {provinces.map((province) => {
                                        const munis = getMunicipalitiesForProvince(province.id)
                                        const isExpanded = expandedProvinces.has(province.id)

                                        return (
                                            <>
                                                <TableRow key={province.id} className="hover:bg-slate-50/50">
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-8 w-8 p-0"
                                                            onClick={() => toggleProvince(province.id)}
                                                        >
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin className="h-4 w-4 text-emerald-500" />
                                                            <span className="font-medium">{province.name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="font-mono">
                                                            {province.code}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">{munis.length}</Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openMunicipalityDialog(province.id)}
                                                            >
                                                                <Plus className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => openProvinceDialog(province)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <AlertDialog>
                                                                <AlertDialogTrigger asChild>
                                                                    <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </Button>
                                                                </AlertDialogTrigger>
                                                                <AlertDialogContent>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                                        <AlertDialogDescription>
                                                                            Tem certeza que deseja excluir a província {province.name}?
                                                                            Isto também removerá todos os municípios associados.
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter>
                                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                        <AlertDialogAction
                                                                            className="bg-red-600 hover:bg-red-700"
                                                                            onClick={() => handleDeleteProvince(province.id)}
                                                                        >
                                                                            Excluir
                                                                        </AlertDialogAction>
                                                                    </AlertDialogFooter>
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                                {isExpanded && munis.map((muni) => (
                                                    <TableRow key={`muni-${muni.id}`} className="bg-slate-50/50">
                                                        <TableCell></TableCell>
                                                        <TableCell colSpan={2}>
                                                            <div className="flex items-center gap-2 pl-6">
                                                                <Building className="h-3 w-3 text-slate-400" />
                                                                <span className="text-sm text-slate-600">{muni.name}</span>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell></TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    onClick={() => openMunicipalityDialog(province.id, muni)}
                                                                >
                                                                    <Edit className="h-3 w-3" />
                                                                </Button>
                                                                <AlertDialog>
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                                                                            <Trash2 className="h-3 w-3" />
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        <AlertDialogHeader>
                                                                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                                                            <AlertDialogDescription>
                                                                                Tem certeza que deseja excluir o município {muni.name}?
                                                                            </AlertDialogDescription>
                                                                        </AlertDialogHeader>
                                                                        <AlertDialogFooter>
                                                                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                            <AlertDialogAction
                                                                                className="bg-red-600 hover:bg-red-700"
                                                                                onClick={() => handleDeleteMunicipality(muni.id)}
                                                                            >
                                                                                Excluir
                                                                            </AlertDialogAction>
                                                                        </AlertDialogFooter>
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </>
                                        )
                                    })}
                                </TableBody>
                            </Table>

                            {provinces.length === 0 && (
                                <div className="text-center py-12 text-slate-500">
                                    Nenhuma província cadastrada. Clique em "Nova Província" para começar.
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Province Dialog */}
            <Dialog open={showProvinceDialog} onOpenChange={setShowProvinceDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingProvince ? "Editar Província" : "Nova Província"}</DialogTitle>
                        <DialogDescription>
                            {editingProvince ? "Atualize os dados da província." : "Adicione uma nova província."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="provinceName" className="text-right">Nome *</Label>
                            <Input
                                id="provinceName"
                                value={provinceName}
                                onChange={(e) => setProvinceName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: Maputo Cidade"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="provinceCode" className="text-right">Código *</Label>
                            <Input
                                id="provinceCode"
                                value={provinceCode}
                                onChange={(e) => setProvinceCode(e.target.value.toUpperCase())}
                                className="col-span-3 font-mono"
                                placeholder="Ex: MPC"
                                maxLength={5}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowProvinceDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSaveProvince} disabled={formLoading} className="bg-emerald-600 hover:bg-emerald-700">
                            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingProvince ? "Salvar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Municipality Dialog */}
            <Dialog open={showMunicipalityDialog} onOpenChange={setShowMunicipalityDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingMunicipality ? "Editar Município" : "Novo Município"}</DialogTitle>
                        <DialogDescription>
                            {editingMunicipality ? "Atualize os dados do município." : "Adicione um novo município."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="muniProvince" className="text-right">Província *</Label>
                            <Select value={municipalityProvinceId} onValueChange={setMunicipalityProvinceId}>
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione a província" />
                                </SelectTrigger>
                                <SelectContent>
                                    {provinces.map(p => (
                                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="muniName" className="text-right">Nome *</Label>
                            <Input
                                id="muniName"
                                value={municipalityName}
                                onChange={(e) => setMunicipalityName(e.target.value)}
                                className="col-span-3"
                                placeholder="Ex: KaMpfumo"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowMunicipalityDialog(false)}>Cancelar</Button>
                        <Button onClick={handleSaveMunicipality} disabled={formLoading} className="bg-emerald-600 hover:bg-emerald-700">
                            {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {editingMunicipality ? "Salvar" : "Criar"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
