"use client"

import * as React from "react"
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Viewport>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Viewport
        ref={ref}
        className={cn(
            "fixed z-[100] flex max-h-screen w-full flex-col-reverse gap-3 p-4",
            "top-0 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col",
            "md:max-w-[420px]",
            className
        )}
        {...props}
    />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

const toastVariants = cva(
    cn(
        "group pointer-events-auto relative flex w-full items-center gap-4 overflow-hidden",
        "rounded-xl border-2 p-4 pr-10 shadow-2xl",
        "transition-all duration-300 ease-out",
        // Swipe animations
        "data-[swipe=cancel]:translate-x-0",
        "data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
        "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)]",
        "data-[swipe=move]:transition-none",
        // Enter/Exit animations
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
        "data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full"
    ),
    {
        variants: {
            variant: {
                // LIGHT THEME ONLY - High contrast colors
                default: "bg-white border-slate-300 text-slate-900 shadow-slate-300/50",
                destructive: "bg-red-50 border-red-400 text-red-900 shadow-red-200/60",
                success: "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-emerald-200/60",
                warning: "bg-amber-50 border-amber-400 text-amber-900 shadow-amber-200/60",
                info: "bg-blue-50 border-blue-400 text-blue-900 shadow-blue-200/60",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

// Icon mapping for each variant
const variantIcons = {
    default: Info,
    destructive: AlertCircle,
    success: CheckCircle2,
    warning: AlertTriangle,
    info: Info,
}

// Icon background colors - high contrast
const iconBgColors = {
    default: "bg-slate-200",
    destructive: "bg-red-200",
    success: "bg-emerald-200",
    warning: "bg-amber-200",
    info: "bg-blue-200",
}

// Icon colors - dark for contrast
const iconColors = {
    default: "text-slate-700",
    destructive: "text-red-700",
    success: "text-emerald-700",
    warning: "text-amber-700",
    info: "text-blue-700",
}

const Toast = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Root>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants>
>(({ className, variant, children, ...props }, ref) => {
    const Icon = variantIcons[variant || "default"]
    const iconBg = iconBgColors[variant || "default"]
    const iconColor = iconColors[variant || "default"]

    return (
        <ToastPrimitives.Root
            ref={ref}
            className={cn(toastVariants({ variant }), className)}
            {...props}
        >
            {/* Icon with solid background */}
            <div className={cn("flex-shrink-0 p-2.5 rounded-full", iconBg)}>
                <Icon className={cn("h-5 w-5", iconColor)} strokeWidth={2.5} />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
                {children}
            </div>
        </ToastPrimitives.Root>
    )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Action>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Action
        ref={ref}
        className={cn(
            "inline-flex h-8 shrink-0 items-center justify-center rounded-lg",
            "border-2 bg-white px-3 text-sm font-semibold",
            "transition-all duration-200 hover:scale-105",
            "focus:outline-none focus:ring-2 focus:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            // Variant-specific colors
            "group-[.success]:border-emerald-500 group-[.success]:text-emerald-700 group-[.success]:hover:bg-emerald-100",
            "group-[.destructive]:border-red-500 group-[.destructive]:text-red-700 group-[.destructive]:hover:bg-red-100",
            "group-[.warning]:border-amber-500 group-[.warning]:text-amber-700 group-[.warning]:hover:bg-amber-100",
            "group-[.info]:border-blue-500 group-[.info]:text-blue-700 group-[.info]:hover:bg-blue-100",
            className
        )}
        {...props}
    />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Close>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Close
        ref={ref}
        className={cn(
            "absolute right-3 top-3 rounded-lg p-1.5",
            "text-slate-500 transition-all duration-200",
            "hover:bg-slate-200 hover:text-slate-900",
            "focus:outline-none focus:ring-2 focus:ring-slate-400",
            // Variant-specific close button colors
            "group-[.destructive]:text-red-600 group-[.destructive]:hover:bg-red-200 group-[.destructive]:hover:text-red-900",
            "group-[.success]:text-emerald-600 group-[.success]:hover:bg-emerald-200 group-[.success]:hover:text-emerald-900",
            "group-[.warning]:text-amber-600 group-[.warning]:hover:bg-amber-200 group-[.warning]:hover:text-amber-900",
            "group-[.info]:text-blue-600 group-[.info]:hover:bg-blue-200 group-[.info]:hover:text-blue-900",
            className
        )}
        toast-close=""
        {...props}
    >
        <X className="h-4 w-4" strokeWidth={2.5} />
    </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Title>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Title
        ref={ref}
        className={cn("text-sm font-bold leading-tight text-slate-900", className)}
        {...props}
    />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef<
    React.ElementRef<typeof ToastPrimitives.Description>,
    React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
    <ToastPrimitives.Description
        ref={ref}
        className={cn("text-sm text-slate-700 leading-relaxed mt-0.5", className)}
        {...props}
    />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>

type ToastActionElement = React.ReactElement<typeof ToastAction>

export {
    type ToastProps,
    type ToastActionElement,
    ToastProvider,
    ToastViewport,
    Toast,
    ToastTitle,
    ToastDescription,
    ToastClose,
    ToastAction,
}
