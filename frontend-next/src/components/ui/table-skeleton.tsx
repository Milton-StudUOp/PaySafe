import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface TableSkeletonProps {
    columnCount: number
    rowCount?: number
    showHeaders?: boolean
}

// Shimmer animation component
function ShimmerBar({ className }: { className?: string }) {
    return (
        <div className={cn(
            "relative overflow-hidden rounded-md bg-slate-200",
            className
        )}>
            <div
                className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent"
            />
        </div>
    )
}

export function TableSkeleton({
    columnCount,
    rowCount = 5,
    showHeaders = true
}: TableSkeletonProps) {
    // Different widths for variety
    const widths = ["60%", "80%", "50%", "70%", "90%", "40%", "75%"]

    return (
        <div className="rounded-xl border-2 border-slate-200 overflow-hidden bg-white shadow-lg">
            <Table>
                {showHeaders && (
                    <TableHeader>
                        <TableRow className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-200">
                            {Array.from({ length: columnCount }).map((_, i) => (
                                <TableHead key={i} className="py-5">
                                    <ShimmerBar
                                        className="h-5 bg-slate-300"
                                        style={{ width: widths[i % widths.length] } as React.CSSProperties}
                                    />
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                )}
                <TableBody>
                    {Array.from({ length: rowCount }).map((_, rowIndex) => (
                        <TableRow
                            key={rowIndex}
                            className={cn(
                                "border-b border-slate-100",
                                rowIndex % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            )}
                        >
                            {Array.from({ length: columnCount }).map((_, colIndex) => (
                                <TableCell key={colIndex} className="py-5">
                                    <ShimmerBar
                                        className="h-5 bg-slate-200"
                                        style={{
                                            width: widths[(colIndex + rowIndex) % widths.length],
                                            animationDelay: `${(rowIndex * 100) + (colIndex * 50)}ms`
                                        } as React.CSSProperties}
                                    />
                                </TableCell>
                            ))}
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    )
}

// Card Skeleton with shimmer effect
export function CardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "rounded-xl border-2 border-slate-200 bg-white p-6 shadow-lg",
            className
        )}>
            <div className="space-y-4">
                <ShimmerBar className="h-4 w-1/3 bg-slate-200" />
                <ShimmerBar className="h-10 w-2/3 bg-slate-300" />
                <div className="flex gap-3 pt-2">
                    <ShimmerBar className="h-4 w-20 bg-slate-200" />
                    <ShimmerBar className="h-4 w-16 bg-emerald-200" />
                </div>
            </div>
        </div>
    )
}

// Chart Skeleton with animated bars
export function ChartSkeleton({ className, height = 350 }: { className?: string, height?: number }) {
    const barHeights = [0.5, 0.8, 0.35, 0.9, 0.6, 0.75, 0.45, 0.85]

    return (
        <div className={cn(
            "rounded-xl border-2 border-slate-200 bg-white shadow-lg overflow-hidden",
            className
        )}>
            {/* Chart Header */}
            <div className="p-6 border-b-2 border-slate-100 bg-gradient-to-r from-slate-50 to-white">
                <ShimmerBar className="h-6 w-56 mb-3 bg-slate-300" />
                <ShimmerBar className="h-4 w-40 bg-slate-200" />
            </div>

            {/* Chart Area with animated bars */}
            <div className="p-6" style={{ height }}>
                <div className="flex items-end justify-between h-full gap-4">
                    {barHeights.map((h, i) => (
                        <div
                            key={i}
                            className="flex-1 relative overflow-hidden rounded-t-lg bg-gradient-to-t from-slate-300 via-slate-200 to-slate-100"
                            style={{
                                height: `${h * 100}%`,
                            }}
                        >
                            <div
                                className="absolute inset-0 animate-pulse"
                                style={{
                                    animationDuration: '1.5s',
                                    animationDelay: `${i * 150}ms`
                                }}
                            />
                            <div
                                className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent"
                                style={{ animationDelay: `${i * 200}ms` }}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
