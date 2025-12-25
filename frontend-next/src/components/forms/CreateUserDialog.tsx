"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { Loader2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { useLocations } from "@/hooks/useLocations"

interface CreateUserDialogProps {
    children: React.ReactNode
    onSuccess: () => void
}

export function CreateUserDialog({ children, onSuccess }: CreateUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Form State
    const [fullName, setFullName] = useState("")
    const [email, setEmail] = useState("")
    const [username, setUsername] = useState("")
    const [password, setPassword] = useState("")
    const [role, setRole] = useState("FUNCIONARIO")
    const [selectedProvinceId, setSelectedProvinceId] = useState("")
    const [scopeMunicipality, setScopeMunicipality] = useState("")

    // Use the locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    // Reset municipality when province changes
    useEffect(() => {
        setScopeMunicipality("")
    }, [selectedProvinceId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            const provinceName = getProvinceNameById(selectedProvinceId)

            await api.post("/users/", {
                full_name: fullName,
                email: email,
                username: username || email.split('@')[0],
                password: password,
                role: role,
                scope_province: (role === 'FUNCIONARIO' || role === 'SUPERVISOR') ? provinceName : null,
                scope_district: (role === 'SUPERVISOR') ? scopeMunicipality : null, // Backend still uses scope_district
                status: "ATIVO"
            })

            toast({
                title: "Sucesso",
                description: "Usuário criado com sucesso.",
                variant: "success",
            })

            resetForm()
            onSuccess()
        } catch (error: unknown) {
            console.error("Error creating user:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Erro ao criar usuário.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    const resetForm = () => {
        setFullName("")
        setEmail("")
        setUsername("")
        setPassword("")
        setRole("FUNCIONARIO")
        setSelectedProvinceId("")
        setScopeMunicipality("")
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Novo Usuário</DialogTitle>
                        <DialogDescription>
                            Crie um novo usuário para acesso ao painel administrativo.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="user-name">Nome Completo</Label>
                            <Input id="user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-email">Email</Label>
                            <Input id="user-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-username">Usuário (Login)</Label>
                            <Input id="user-username" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="ex: joao.silva" required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-password">Senha</Label>
                            <Input id="user-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="user-role">Função</Label>
                            <select
                                id="user-role"
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-900 ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <option value="FUNCIONARIO">Funcionário</option>
                                <option value="SUPERVISOR">Supervisor</option>
                                <option value="ADMIN">Administrador</option>
                                <option value="AUDITOR">Auditor</option>
                            </select>
                        </div>

                        {/* JURISDICTION FIELDS */}
                        {(role === 'FUNCIONARIO' || role === 'SUPERVISOR') && (
                            <div className="grid gap-2">
                                <Label htmlFor="scope-province">Província (Jurisdição)</Label>
                                <Select value={selectedProvinceId} onValueChange={setSelectedProvinceId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingProvinces ? "Carregando..." : "Selecione..."} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {provinces.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {role === 'SUPERVISOR' && (
                            <div className="grid gap-2">
                                <Label htmlFor="scope-municipality">Município (Jurisdição)</Label>
                                <Select
                                    value={scopeMunicipality}
                                    onValueChange={setScopeMunicipality}
                                    disabled={!selectedProvinceId || loadingMunicipalities}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={
                                            !selectedProvinceId
                                                ? "Selecione a província primeiro"
                                                : loadingMunicipalities
                                                    ? "Carregando..."
                                                    : "Selecione..."
                                        } />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {municipalities.map(m => (
                                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Criar Usuário
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
