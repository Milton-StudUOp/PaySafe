"use client"

import { useEffect } from 'react'
import { pageMetadata } from '@/lib/page-metadata'

/**
 * Hook to set the document title for client-side pages
 * Uses the centralized page metadata configuration
 * 
 * @param pageKey - Key from pageMetadata config (e.g., 'dashboard', 'transactions')
 * @param customTitle - Optional custom title to override the default
 */
export function useDocumentTitle(pageKey: string, customTitle?: string) {
    useEffect(() => {
        const meta = pageMetadata[pageKey]

        if (customTitle) {
            document.title = `${customTitle} | PaySafe System`
        } else if (meta) {
            document.title = `${meta.title} | PaySafe System`
        } else {
            document.title = 'PaySafe System'
        }

        // Cleanup: reset to default on unmount (optional)
        return () => {
            // Keep the last title set
        }
    }, [pageKey, customTitle])
}

/**
 * Hook to set a dynamic document title
 * 
 * @param title - The title to set (will be appended with " | PaySafe System")
 */
export function useDynamicTitle(title: string) {
    useEffect(() => {
        if (title) {
            document.title = `${title} | PaySafe System`
        }
    }, [title])
}
