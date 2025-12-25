"use client"

import { useState, useEffect } from "react"
import api from "@/lib/api"
import { Province, Municipality } from "@/types"

/**
 * Hook to fetch provinces and municipalities from the locations API.
 * Municipalities are filtered based on selected province.
 */
export function useLocations(selectedProvinceId?: number | string) {
    const [provinces, setProvinces] = useState<Province[]>([])
    const [municipalities, setMunicipalities] = useState<Municipality[]>([])
    const [loadingProvinces, setLoadingProvinces] = useState(true)
    const [loadingMunicipalities, setLoadingMunicipalities] = useState(false)

    // Fetch provinces on mount
    useEffect(() => {
        const fetchProvinces = async () => {
            setLoadingProvinces(true)
            try {
                const res = await api.get("/locations/provinces")
                setProvinces(res.data)
            } catch (error) {
                console.error("Error fetching provinces:", error)
            } finally {
                setLoadingProvinces(false)
            }
        }
        fetchProvinces()
    }, [])

    // Fetch municipalities when province changes
    useEffect(() => {
        if (!selectedProvinceId) {
            setMunicipalities([])
            return
        }

        const fetchMunicipalities = async () => {
            setLoadingMunicipalities(true)
            try {
                const res = await api.get(`/locations/municipalities?province_id=${selectedProvinceId}`)
                setMunicipalities(res.data)
            } catch (error) {
                console.error("Error fetching municipalities:", error)
            } finally {
                setLoadingMunicipalities(false)
            }
        }
        fetchMunicipalities()
    }, [selectedProvinceId])

    // Helper to find province ID by name
    const getProvinceIdByName = (name: string): number | undefined => {
        const province = provinces.find(p => p.name === name)
        return province?.id
    }

    // Helper to find province name by ID
    const getProvinceNameById = (id: number | string): string | undefined => {
        const province = provinces.find(p => p.id === Number(id))
        return province?.name
    }

    return {
        provinces,
        municipalities,
        loadingProvinces,
        loadingMunicipalities,
        getProvinceIdByName,
        getProvinceNameById
    }
}
