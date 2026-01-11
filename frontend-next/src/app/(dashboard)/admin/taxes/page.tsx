"use client"

import { useEffect, useState } from "react"
import api from "@/lib/api"
import { TaxConfiguration, TaxConfigurationUpdate } from "@/types/tax"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import Header from "@/components/layout/Header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Search, Loader2, Edit2, Check, X, Ban, Activity, Plus } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"

export default function TaxAdminPage() {
    const [taxes, setTaxes] = useState<TaxConfiguration[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("ALL")
    const { toast } = useToast()

    // Dialog State
    const [dialogOpen, setDialogOpen] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [currentId, setCurrentId] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)

    // Form State
    const [formData, setFormData] = useState({
        code: "",
        name: "",
        category: "TAXA",
        description: "",
        is_fixed_amount: false,
        default_amount: 0,
        is_active: true
    })

    const fetchTaxes = async () => {
        try {
            setLoading(true)
            const res = await api.get("/taxes/admin/all")
            setTaxes(res.data)
        } catch (error) {
            console.error("Failed to fetch taxes", error)
            toast({
                title: "Erro",
                description: "Falha ao carregar taxas.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTaxes()
    }, [])

    const handleCreateClick = () => {
        setIsEditing(false)
        setFormData({
            code: "",
            name: "",
            category: "TAXA",
            description: "",
            is_fixed_amount: false,
            default_amount: 0,
            is_active: true
        })
        setDialogOpen(true)
    }

    const handleEditClick = (tax: TaxConfiguration) => {
        setIsEditing(true)
        setCurrentId(tax.id)
        setFormData({
            code: tax.code,
            name: tax.name,
            category: tax.category,
            description: tax.description || "",
            is_fixed_amount: tax.is_fixed_amount,
            default_amount: tax.default_amount || 0,
            is_active: tax.is_active
        })
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formData.code || !formData.name) {
            toast({ title: "Erro", description: "Código e Nome são obrigatórios", variant: "destructive" })
            return
        }

        try {
            setSaving(true)

            if (isEditing && currentId) {
                // UPDATE
                await api.put(`/taxes/admin/${currentId}`, formData)
                toast({ title: "Sucesso", description: "Taxa atualizada." })
            } else {
                // CREATE
                await api.post("/taxes/admin", formData)
                toast({ title: "Sucesso", description: "Nova taxa criada." })
            }

            setDialogOpen(false)
            fetchTaxes()
        } catch (error: any) {
            console.error(error)
            toast({
                title: "Erro",
                description: error.response?.data?.detail || "Falha ao salvar.",
                variant: "destructive",
            })
        } finally {
            setSaving(false)
        }
    }

    const filteredTaxes = taxes.filter(tax => {
        const matchesSearch =
            tax.name.toLowerCase().includes(search.toLowerCase()) ||
            tax.code.toLowerCase().includes(search.toLowerCase())

        const matchesCategory = categoryFilter === "ALL" || tax.category === categoryFilter

        return matchesSearch && matchesCategory
    })

    return (
        <div className="flex flex-col gap-6">
            <div className="flex justify-between items-start">
                <Header
                    title="Configuração de Taxas e Impostos"
                />
                <Button onClick={handleCreateClick} className="bg-emerald-600 hover:bg-emerald-700">
                    <Plus className="mr-2 h-4 w-4" /> Nova Taxa
                </Button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome ou código..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ALL">Todas Categorias</SelectItem>
                        <SelectItem value="IMPOSTO">Imposto</SelectItem>
                        <SelectItem value="TAXA">Taxa</SelectItem>
                        <SelectItem value="MULTA">Multa</SelectItem>
                        <SelectItem value="OUTROS">Outros</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Status</TableHead>
                                <TableHead>Código</TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Categoria</TableHead>
                                <TableHead>Tipo de Valor</TableHead>
                                <TableHead className="text-right">Valor Padrão (MT)</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> Carregando...
                                    </TableCell>
                                </TableRow>
                            ) : filteredTaxes.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                        Nenhuma taxa encontrada.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredTaxes.map((tax) => (
                                    <TableRow key={tax.id}>
                                        <TableCell>
                                            {tax.is_active ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Ativo</Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Inativo</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">{tax.code}</TableCell>
                                        <TableCell className="font-medium">
                                            {tax.name}
                                            {tax.description && (
                                                <div className="text-xs text-muted-foreground truncate max-w-[200px]">{tax.description}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="secondary">{tax.category}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            {tax.is_fixed_amount ? (
                                                <span className="flex items-center text-xs text-blue-600 font-medium"><Check className="w-3 h-3 mr-1" /> Fixo</span>
                                            ) : (
                                                <span className="flex items-center text-xs text-orange-600 font-medium"><Edit2 className="w-3 h-3 mr-1" /> Variável</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">
                                            {tax.default_amount ? Number(tax.default_amount).toFixed(2) : "-"} MT
                                        </TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => handleEditClick(tax)}>
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? `Editar Taxa: ${formData.code}` : "Nova Taxa / Imposto"}</DialogTitle>
                        <DialogDescription>
                            Configure os detalhes do tributo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">

                        {/* CODE */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="code" className="text-right">Código</Label>
                            <Input
                                id="code"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                className="col-span-3 font-mono uppercase"
                                disabled={isEditing} // Cannot change code after creation
                                placeholder="EX: TAXA_MERCADO"
                            />
                        </div>

                        {/* NAME */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Nome</Label>
                            <Input
                                id="name"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="col-span-3"
                                placeholder="Ex: Taxa de Ocupação Diária"
                            />
                        </div>

                        {/* DESCRIPTION */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="desc" className="text-right">Descrição</Label>
                            <Input
                                id="desc"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="col-span-3"
                            />
                        </div>

                        {/* CATEGORY */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="category" className="text-right">Categoria</Label>
                            <Select
                                value={formData.category}
                                onValueChange={(val: any) => setFormData({ ...formData, category: val })}
                            >
                                <SelectTrigger className="col-span-3">
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="IMPOSTO">Imposto</SelectItem>
                                    <SelectItem value="TAXA">Taxa</SelectItem>
                                    <SelectItem value="MULTA">Multa</SelectItem>
                                    <SelectItem value="OUTROS">Outros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* FIXED */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Tipo</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch
                                    id="is_fixed"
                                    checked={formData.is_fixed_amount}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_fixed_amount: checked as boolean })}
                                />
                                <label
                                    htmlFor="is_fixed"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Valor Fixo (Pré-definido)
                                </label>
                            </div>
                        </div>

                        {/* AMOUNT */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="amount" className="text-right">Valor (MT)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                value={formData.default_amount}
                                onChange={(e) => setFormData({ ...formData, default_amount: parseFloat(e.target.value) })}
                                className="col-span-3"
                                placeholder="0.00"
                            />
                        </div>

                        {/* ACTIVE */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label className="text-right">Status</Label>
                            <div className="col-span-3 flex items-center space-x-2">
                                <Switch
                                    id="is_active"
                                    checked={formData.is_active}
                                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked as boolean })}
                                />
                                <label
                                    htmlFor="is_active"
                                    className="text-sm font-medium leading-none cursor-pointer"
                                >
                                    Ativo
                                </label>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleSave} disabled={saving} className="bg-emerald-600 hover:bg-emerald-700">
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
