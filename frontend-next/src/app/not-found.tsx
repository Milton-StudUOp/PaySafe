"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ShieldAlert, Home } from "lucide-react"

export default function NotFound() {
    return (
        <div className="flex h-screen w-full flex-col items-center justify-center bg-gray-50 text-gray-900">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-6 rounded-full bg-red-100 p-6 text-red-600">
                    <ShieldAlert className="h-12 w-12" />
                </div>
                <h1 className="mb-2 text-3xl font-bold tracking-tight">Acesso Indisponível</h1>
                <p className="mb-8 text-muted-foreground">
                    O recurso que você tentou acessar não foi encontrado ou você não tem permissão para visualizá-lo.
                </p>
                <div className="flex gap-4">
                    <Button asChild variant="default">
                        <Link href="/dashboard">
                            <Home className="mr-2 h-4 w-4" />
                            Voltar ao Início
                        </Link>
                    </Button>
                    <Button variant="outline" onClick={() => window.history.back()}>
                        Tentar Novamente
                    </Button>
                </div>
            </div>
        </div>
    )
}
