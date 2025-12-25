"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AlertCircle } from "lucide-react"

interface ObservationModalProps {
    open: boolean
    onClose: () => void
    onConfirm: (observation: string) => void
    title?: string
    description?: string
    minLength?: number
}

export function ObservationModal({
    open,
    onClose,
    onConfirm,
    title = "Justificativa Obrigatória",
    description = "Esta ação requer uma justificativa. Por favor, descreva o motivo desta alteração.",
    minLength = 10
}: ObservationModalProps) {
    const [observation, setObservation] = useState("")
    const [error, setError] = useState("")

    const handleConfirm = () => {
        if (!observation || observation.trim().length < minLength) {
            setError(`A justificativa deve ter pelo menos ${minLength} caracteres.`)
            return
        }
        onConfirm(observation.trim())
        setObservation("")
        setError("")
    }

    const handleClose = () => {
        setObservation("")
        setError("")
        onClose()
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-amber-500" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        {description}
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="observation">Observação / Justificativa *</Label>
                        <Textarea
                            id="observation"
                            value={observation}
                            onChange={(e) => {
                                setObservation(e.target.value)
                                if (error) setError("")
                            }}
                            placeholder="Descreva o motivo desta ação..."
                            className="min-h-[100px]"
                        />
                        {error && (
                            <p className="text-sm text-red-500">{error}</p>
                        )}
                        <p className="text-xs text-slate-500">
                            Mínimo {minLength} caracteres. {observation.length}/{minLength}
                        </p>
                    </div>
                </div>
                <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleClose}>
                        Cancelar
                    </Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Confirmar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
