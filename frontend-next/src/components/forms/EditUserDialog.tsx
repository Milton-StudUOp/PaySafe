"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import api from "@/lib/api"
import { Loader2, Pencil } from "lucide-react"
import { User } from "@/types"
import { useToast } from "@/components/ui/use-toast"
import { useLocations } from "@/hooks/useLocations"

const formSchema = z.object({
    full_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    phone_number: z.string().optional(),
    role: z.enum(["ADMIN", "SUPERVISOR", "FUNCIONARIO", "AUDITOR"]),
    status: z.enum(["ATIVO", "SUSPENSO", "INATIVO"]),
    scope_province: z.string().optional(),
    scope_district: z.string().optional(),
})

interface EditUserDialogProps {
    user: User;
    onSuccess?: () => void;
    children?: React.ReactNode;
}

export function EditUserDialog({ user, onSuccess, children }: EditUserDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const { toast } = useToast()

    // Local state for province ID (for dropdown cascade)
    const [selectedProvinceId, setSelectedProvinceId] = useState<string>("")

    // Use the locations hook
    const { provinces, municipalities, loadingProvinces, loadingMunicipalities, getProvinceNameById } = useLocations(
        selectedProvinceId ? parseInt(selectedProvinceId) : undefined
    )

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            full_name: user.full_name,
            email: user.email,
            phone_number: user.phone_number || "",
            role: user.role as "ADMIN" | "SUPERVISOR" | "FUNCIONARIO" | "AUDITOR",
            status: user.status as "ATIVO" | "SUSPENSO" | "INATIVO",
            scope_province: user.scope_province || "",
            scope_district: user.scope_district || "",
        },
    })

    // Watch role to conditionally show fields
    const role = form.watch("role")
    const watchedProvinceName = form.watch("scope_province")

    // Set initial province ID when provinces load and user has a province
    useEffect(() => {
        if (provinces.length > 0 && user.scope_province) {
            const matchingProvince = provinces.find(p => p.name === user.scope_province)
            if (matchingProvince) {
                setSelectedProvinceId(matchingProvince.id.toString())
            }
        }
    }, [provinces, user.scope_province])

    // When province dropdown changes, update the form value and reset municipality
    const handleProvinceChange = (provinceId: string) => {
        setSelectedProvinceId(provinceId)
        const provinceName = getProvinceNameById(provinceId)
        form.setValue("scope_province", provinceName || "")
        form.setValue("scope_district", "") // Reset municipality when province changes
    }

    // Handle municipality change
    const handleMunicipalityChange = (municipalityName: string) => {
        form.setValue("scope_district", municipalityName)
    }

    const onSubmit = async (values: z.infer<typeof formSchema>) => {
        setLoading(true)
        try {
            await api.put(`/users/${user.id}`, values)

            toast({
                title: "Sucesso",
                description: "Usuário atualizado com sucesso.",
                variant: "success",
            })

            if (onSuccess) onSuccess()
        } catch (error: unknown) {
            console.error("Error updating user:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Erro ao atualizar usuário.",
                variant: "destructive",
            })
        } finally {
            setLoading(false)
            setOpen(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button variant="outline" size="sm">
                        <Pencil className="mr-2 h-4 w-4" /> Editar
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="full_name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nome Completo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nome do usuário" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="email@exemplo.com" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="phone_number"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Telefone (Opcional)</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+258..." {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="role"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Função</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ADMIN">Admin</SelectItem>
                                                <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                                                <SelectItem value="FUNCIONARIO">Funcionário</SelectItem>
                                                <SelectItem value="AUDITOR">Auditor</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="status"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Status</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="ATIVO">Ativo</SelectItem>
                                                <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                                                <SelectItem value="INATIVO">Inativo</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* JURISDICTION FIELDS */}
                        {(role === 'FUNCIONARIO' || role === 'SUPERVISOR') && (
                            <FormItem>
                                <FormLabel>Província (Jurisdição)</FormLabel>
                                <Select value={selectedProvinceId} onValueChange={handleProvinceChange}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={loadingProvinces ? "Carregando..." : "Selecione..."} />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {provinces.map(p => (
                                            <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}

                        {role === 'SUPERVISOR' && (
                            <FormItem>
                                <FormLabel>Município (Jurisdição)</FormLabel>
                                <Select
                                    value={form.watch("scope_district") || ""}
                                    onValueChange={handleMunicipalityChange}
                                    disabled={!selectedProvinceId || loadingMunicipalities}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder={
                                                !selectedProvinceId
                                                    ? "Selecione a província primeiro"
                                                    : loadingMunicipalities
                                                        ? "Carregando..."
                                                        : "Selecione..."
                                            } />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {municipalities.map(m => (
                                            <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </FormItem>
                        )}

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                            Salvar Alterações
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
