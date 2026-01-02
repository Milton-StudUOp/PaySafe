"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

export interface ComboboxOption {
    label: string
    value: string
    disabled?: boolean
}

interface SearchableSelectProps {
    options: ComboboxOption[]
    value: string
    onChange: (value: string) => void
    placeholder?: string
    searchPlaceholder?: string
    emptyMessage?: string
    disabled?: boolean
    className?: string
    icon?: React.ElementType
}

export function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = "Selecionar...",
    searchPlaceholder = "Buscar...",
    emptyMessage = "Nenhum resultado encontrado.",
    disabled = false,
    className,
    icon: Icon
}: SearchableSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    // Filter options based on search
    const filteredOptions = React.useMemo(() => {
        if (!search.trim()) return options
        const searchLower = search.toLowerCase()
        return options.filter(opt =>
            opt.label.toLowerCase().includes(searchLower)
        )
    }, [options, search])

    // Find selected option label
    const selectedLabel = React.useMemo(() => {
        if (!value || value === "ALL") return null
        return options.find(opt => opt.value === value)?.label
    }, [value, options])

    // Handle selection
    const handleSelect = (optionValue: string) => {
        onChange(optionValue === value ? "ALL" : optionValue)
        setOpen(false)
        setSearch("")
    }

    // Reset search when popover closes
    React.useEffect(() => {
        if (!open) setSearch("")
    }, [open])

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    disabled={disabled}
                    className={cn(
                        "w-full justify-between font-normal",
                        "bg-white border-slate-200 text-slate-700",
                        "hover:bg-slate-50 focus:ring-1 focus:ring-emerald-500 focus:ring-offset-0",
                        "transition-colors duration-150",
                        !selectedLabel && "text-slate-500",
                        disabled && "opacity-50 cursor-not-allowed",
                        className
                    )}
                >
                    <div className="flex items-center gap-2 truncate">
                        {Icon && <Icon className="h-4 w-4 opacity-50 shrink-0" />}
                        <span className="truncate">
                            {selectedLabel || placeholder}
                        </span>
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[220px] p-0 bg-white border border-slate-200 shadow-lg z-[150]"
                align="start"
                sideOffset={4}
            >
                {/* Search Input */}
                <div className="flex items-center border-b border-slate-100 px-3 py-2">
                    <Search className="h-4 w-4 text-slate-400 shrink-0" />
                    <Input
                        placeholder={searchPlaceholder}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="border-0 bg-transparent h-8 px-2 text-sm focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400"
                    />
                </div>

                {/* Options List */}
                <div className="max-h-[220px] overflow-y-auto">
                    <div className="p-1">
                        {/* "All" option */}
                        <button
                            type="button"
                            onClick={() => handleSelect("ALL")}
                            className={cn(
                                "relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none",
                                "transition-colors duration-100",
                                "hover:bg-slate-100 hover:text-slate-900",
                                value === "ALL" && "bg-emerald-50 text-emerald-700"
                            )}
                        >
                            <Check
                                className={cn(
                                    "mr-2 h-4 w-4 text-emerald-600",
                                    value === "ALL" ? "opacity-100" : "opacity-0"
                                )}
                            />
                            <span>Todos</span>
                        </button>

                        {/* Filtered options */}
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => !option.disabled && handleSelect(option.value)}
                                    disabled={option.disabled}
                                    className={cn(
                                        "relative flex w-full cursor-pointer select-none items-center rounded-md px-3 py-2 text-sm outline-none",
                                        "transition-colors duration-100",
                                        "hover:bg-slate-100 hover:text-slate-900",
                                        value === option.value && "bg-emerald-50 text-emerald-700",
                                        option.disabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
                                    )}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4 text-emerald-600",
                                            value === option.value ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <span className="truncate">{option.label}</span>
                                </button>
                            ))
                        ) : (
                            <div className="py-6 text-center text-sm text-slate-500">
                                {emptyMessage}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
