"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import api from "@/lib/api"
import { Loader2 } from "lucide-react"
import { POSDevice, Agent, Market } from "@/types"
import { useToast } from "@/components/ui/use-toast"

interface AssignPosDialogProps {
    children: React.ReactNode
    agentId: number
    onSuccess: () => void
}

export function AssignPosDialog({ children, agentId, onSuccess }: AssignPosDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [availablePos, setAvailablePos] = useState<POSDevice[]>([])
    const [selectedPos, setSelectedPos] = useState<string>("")
    const [fetching, setFetching] = useState(false)
    const [agentMunicipality, setAgentMunicipality] = useState<string>("")
    const { toast } = useToast()

    useEffect(() => {
        if (open) {
            fetchAgentMunicipalityAndPos()
        }
    }, [open])

    const fetchAgentMunicipalityAndPos = async () => {
        setFetching(true)
        try {
            // First, fetch the agent to get their market
            const agentRes = await api.get(`/agents/${agentId}`)
            const agent: Agent = agentRes.data

            let municipality = ""

            // Get the market to find the municipality
            if (agent.assigned_market_id) {
                const marketRes = await api.get(`/markets/${agent.assigned_market_id}`)
                const market: Market = marketRes.data
                municipality = market.district || ""
                setAgentMunicipality(municipality)
            }

            // Fetch POS devices filtered by municipality
            let posDevices: POSDevice[] = []
            if (municipality) {
                // Filter by district (municipality)
                const res = await api.get(`/pos-devices/?district=${encodeURIComponent(municipality)}`)
                posDevices = res.data
            } else {
                // Fallback: if no municipality, fetch all (shouldn't happen normally)
                const res = await api.get("/pos-devices/")
                posDevices = res.data
            }

            // Filter only active and unassigned POS devices
            const available = posDevices.filter(d => d.status === 'ATIVO' && !d.assigned_agent_id)
            setAvailablePos(available)
        } catch (error) {
            console.error("Error fetching data:", error)
            toast({
                title: "Erro",
                description: "Falha ao buscar terminais POS.",
                variant: "destructive",
            })
        } finally {
            setFetching(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPos) return

        setLoading(true)
        try {
            await api.post(`/pos-devices/${selectedPos}/assign/${agentId}`)

            toast({
                title: "Sucesso",
                description: "POS atribuído com sucesso.",
                variant: "success",
            })

            onSuccess()
        } catch (error: unknown) {
            console.error("Error assigning POS:", error)
            const axiosError = error as { response?: { data?: { detail?: string } } }
            toast({
                title: "Erro",
                description: axiosError.response?.data?.detail || "Falha ao atribuir POS.",
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
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Atribuir POS</DialogTitle>
                        <DialogDescription>
                            {agentMunicipality
                                ? `Terminais disponíveis no município: ${agentMunicipality}`
                                : "Selecione um terminal POS disponível para vincular a este agente."
                            }
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-6">
                        {fetching ? (
                            <div className="flex justify-center text-emerald-500">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : availablePos.length === 0 ? (
                            <div className="text-center text-slate-500 text-sm">
                                {agentMunicipality
                                    ? `Não há terminais POS disponíveis no município ${agentMunicipality}.`
                                    : "Não há terminais POS disponíveis para atribuição."
                                }
                            </div>
                        ) : (
                            <div className="grid gap-2">
                                <Label htmlFor="pos-select">Terminal Disponível ({availablePos.length} no município)</Label>
                                <select
                                    id="pos-select"
                                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                    value={selectedPos}
                                    onChange={(e) => setSelectedPos(e.target.value)}
                                    required
                                >
                                    <option value="">Selecione um terminal...</option>
                                    {availablePos.map((pos) => (
                                        <option key={pos.id} value={pos.id}>
                                            {pos.serial_number} - {pos.model}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="submit" disabled={loading || !selectedPos} className="w-full sm:w-auto">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirmar Atribuição
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
