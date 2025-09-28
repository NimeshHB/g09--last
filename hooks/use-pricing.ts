import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// Types
export interface PricingTier {
  _id: string
  name: string
  description: string
  vehicleType: 'car' | 'motorcycle' | 'truck' | 'van' | 'suv' | 'bus' | 'all'
  basePrice: number
  currency: string
  pricingType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'flat'
  durationRange: {
    min: number
    max: number
  }
  discounts: {
    type: 'percentage' | 'fixed'
    value: number
    minDuration?: number
    description: string
  }[]
  surcharges: {
    type: 'peak_hours' | 'weekend' | 'holiday' | 'overnight'
    multiplier: number
    timeRanges?: {
      start: string
      end: string
    }[]
    days?: string[]
    description: string
  }[]
  isActive: boolean
  priority: number
  validFrom: string
  validUntil?: string
  applicableSlots?: string[]
  createdAt: string
  updatedAt: string
}

export interface PricingFilters {
  isActive?: boolean
  vehicleType?: string
  pricingType?: string
}

export interface CreatePricingTierData {
  name: string
  description?: string
  vehicleType: string
  basePrice: number
  currency?: string
  pricingType: string
  durationRange?: {
    min: number
    max: number
  }
  discounts?: any[]
  surcharges?: any[]
  priority?: number
  validFrom?: string
  validUntil?: string
  applicableSlots?: string[]
  isActive?: boolean
}

export function usePricing() {
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false
  })

  const fetchPricingTiers = useCallback(async (filters: PricingFilters = {}, page = 1, limit = 10) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value !== undefined && value !== null) {
            acc[key] = value.toString()
          }
          return acc
        }, {} as Record<string, string>)
      })

      const response = await fetch(`/api/pricing?${params}`)
      const result = await response.json()

      if (result.success) {
        setPricingTiers(result.data)
        setPagination(result.pagination)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch pricing tiers')
      }
    } catch (error: any) {
      console.error('Error fetching pricing tiers:', error)
      toast.error(error.message || 'Failed to fetch pricing tiers')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const createPricingTier = useCallback(async (data: CreatePricingTierData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pricing tier created successfully')
        
        // Add to local state
        setPricingTiers(prev => [result.data, ...prev])
        
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create pricing tier')
      }
    } catch (error: any) {
      console.error('Error creating pricing tier:', error)
      toast.error(error.message || 'Failed to create pricing tier')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePricingTier = useCallback(async (id: string, data: Partial<CreatePricingTierData>) => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricing', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pricing tier updated successfully')
        
        // Update local state
        setPricingTiers(prev => 
          prev.map(tier => 
            tier._id === id ? { ...tier, ...result.data } : tier
          )
        )
        
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update pricing tier')
      }
    } catch (error: any) {
      console.error('Error updating pricing tier:', error)
      toast.error(error.message || 'Failed to update pricing tier')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const deletePricingTier = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/pricing?id=${id}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Pricing tier deleted successfully')
        
        // Remove from local state
        setPricingTiers(prev => prev.filter(tier => tier._id !== id))
        
        return true
      } else {
        throw new Error(result.error || 'Failed to delete pricing tier')
      }
    } catch (error: any) {
      console.error('Error deleting pricing tier:', error)
      toast.error(error.message || 'Failed to delete pricing tier')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const togglePricingTierStatus = useCallback(async (id: string, isActive: boolean) => {
    return await updatePricingTier(id, { isActive })
  }, [updatePricingTier])

  const calculatePrice = useCallback(async (options: {
    vehicleType: string
    duration: number
    startTime: string
    endTime: string
    slotId?: string
  }) => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const result = await response.json()

      if (result.success) {
        return result.data
      } else {
        throw new Error(result.error || 'Failed to calculate price')
      }
    } catch (error: any) {
      console.error('Error calculating price:', error)
      toast.error(error.message || 'Failed to calculate price')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const getQuickEstimate = useCallback(async (
    vehicleType: string,
    duration: number,
    startTime?: string,
    endTime?: string
  ) => {
    try {
      const now = new Date()
      const start = startTime || now.toISOString()
      const end = endTime || new Date(now.getTime() + duration * 60 * 60 * 1000).toISOString()

      const params = new URLSearchParams({
        vehicleType,
        duration: duration.toString(),
        startTime: start,
        endTime: end
      })

      const response = await fetch(`/api/pricing/calculate?${params}`)
      const result = await response.json()

      if (result.success) {
        return result.data.recommendedPricing
      } else {
        return null
      }
    } catch (error) {
      console.error('Error getting quick estimate:', error)
      return null
    }
  }, [])

  const duplicatePricingTier = useCallback(async (id: string, newName: string) => {
    setLoading(true)
    try {
      const tierToDuplicate = pricingTiers.find(tier => tier._id === id)
      if (!tierToDuplicate) {
        throw new Error('Pricing tier not found')
      }

      const { _id, createdAt, updatedAt, ...tierData } = tierToDuplicate
      const duplicateData = {
        ...tierData,
        name: newName,
        isActive: false, // Start duplicates as inactive
        priority: 0
      }

      return await createPricingTier(duplicateData)
    } catch (error: any) {
      console.error('Error duplicating pricing tier:', error)
      toast.error(error.message || 'Failed to duplicate pricing tier')
      throw error
    } finally {
      setLoading(false)
    }
  }, [pricingTiers, createPricingTier])

  const exportPricingTiers = useCallback(async () => {
    try {
      // Fetch all pricing tiers
      const response = await fetch('/api/pricing?limit=1000')
      const result = await response.json()

      if (result.success) {
        // Create CSV content
        const headers = [
          'Name',
          'Vehicle Type',
          'Base Price',
          'Currency',
          'Pricing Type',
          'Min Duration',
          'Max Duration',
          'Priority',
          'Active',
          'Valid From',
          'Valid Until',
          'Created At'
        ]

        const csvContent = [
          headers.join(','),
          ...result.data.map((tier: PricingTier) => [
            `"${tier.name}"`,
            tier.vehicleType,
            tier.basePrice,
            tier.currency,
            tier.pricingType,
            tier.durationRange.min,
            tier.durationRange.max,
            tier.priority,
            tier.isActive,
            new Date(tier.validFrom).toLocaleDateString(),
            tier.validUntil ? new Date(tier.validUntil).toLocaleDateString() : '',
            new Date(tier.createdAt).toLocaleDateString()
          ].join(','))
        ].join('\n')

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `pricing-tiers-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success('Pricing tiers exported successfully')
        return true
      } else {
        throw new Error(result.error || 'Failed to export pricing tiers')
      }
    } catch (error: any) {
      console.error('Error exporting pricing tiers:', error)
      toast.error(error.message || 'Failed to export pricing tiers')
      return false
    }
  }, [])

  return {
    // State
    pricingTiers,
    loading,
    pagination,

    // Actions
    fetchPricingTiers,
    createPricingTier,
    updatePricingTier,
    deletePricingTier,
    togglePricingTierStatus,
    calculatePrice,
    getQuickEstimate,
    duplicatePricingTier,
    exportPricingTiers
  }
}