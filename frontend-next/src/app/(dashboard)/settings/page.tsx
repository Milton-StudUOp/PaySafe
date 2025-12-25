"use client"

import Header from "@/components/layout/Header"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function SettingsPage() {
    return (
        <div className="space-y-6">
            <Header title="Configurações" subtitle="Parâmetros globais do sistema" />

            <Tabs defaultValue="general" className="w-full">
                <TabsList>
                    <TabsTrigger value="general">Geral</TabsTrigger>
                    <TabsTrigger value="financial">Financeiro</TabsTrigger>
                    <TabsTrigger value="receipts">Recibos</TabsTrigger>
                    <TabsTrigger value="security">Segurança</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados da Instituição</CardTitle>
                            <CardDescription>Informações exibidas nos relatórios e cabeçalhos.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Nome da Instituição</Label>
                                <Input defaultValue="Município de Maputo" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Contato de Suporte</Label>
                                <Input defaultValue="+258 84 123 4567" />
                            </div>
                            <Button className="w-fit bg-emerald-600">Salvar Alterações</Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="financial" className="mt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Limites e Taxas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-2">
                                <Label>Taxa por transação (%)</Label>
                                <Input type="number" defaultValue="1.5" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Valor mínimo de depósito (MZN)</Label>
                                <Input type="number" defaultValue="50" />
                            </div>
                            <Button className="w-fit bg-emerald-600">Salvar Alterações</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
