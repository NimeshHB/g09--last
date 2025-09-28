import { useState, useCallback } from 'react'
import { toast } from 'sonner'

// Types
export interface Payment {
  _id: string
  bookingId: string
  userId: string
  amount: number
  currency: string
  paymentMethod: 'cash' | 'card' | 'mobile' | 'online' | 'stripe' | 'paypal'
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
  transactionId?: string
  stripePaymentIntentId?: string
  paypalOrderId?: string
  paymentGateway?: 'stripe' | 'paypal' | 'local'
  paymentDetails: {
    cardLast4?: string
    cardBrand?: string
    paymentMethodType?: string
    receiptUrl?: string
    failureReason?: string
  }
  refundDetails?: {
    refundId: string
    refundAmount: number
    refundReason: string
    refundDate: Date
    refundStatus: 'pending' | 'completed' | 'failed'
  }[]
  metadata: {
    slotNumber?: string
    vehicleNumber?: string
    duration?: number
    processingTime?: number
  }
  createdAt: string
  updatedAt: string
}

export interface PaymentFilters {
  userId?: string
  paymentStatus?: string
  paymentMethod?: string
  startDate?: string
  endDate?: string
  search?: string
}

export interface PaymentStats {
  totalAmount: number
  totalPayments: number
  avgAmount: number
  completedPayments: number
  pendingPayments: number
  refundedAmount: number
}

export interface CreatePaymentData {
  bookingId: string
  amount: number
  paymentMethod: string
  paymentGateway?: string
  metadata?: any
}

export interface RefundData {
  paymentId: string
  refundAmount: number
  refundReason: string
}

export interface PricingCalculation {
  tierId: string
  tierName: string
  pricingType: string
  currency: string
  baseAmount: number
  surchargeMultiplier: number
  finalAmount: number
  appliedDiscounts: any[]
  appliedSurcharges: any[]
}

export function usePayments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(false)
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    limit: 10,
    hasNext: false,
    hasPrev: false
  })
  const [statistics, setStatistics] = useState<PaymentStats | null>(null)

  const fetchPayments = useCallback(async (filters: PaymentFilters = {}, page = 1, limit = 10) => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value.toString()
          return acc
        }, {} as Record<string, string>)
      })

      const response = await fetch(`/api/payments?${params}`)
      const result = await response.json()

      if (result.success) {
        setPayments(result.data)
        setPagination(result.pagination)
        setStatistics(result.statistics)
        return result.data
      } else {
        throw new Error(result.error || 'Failed to fetch payments')
      }
    } catch (error: any) {
      console.error('Error fetching payments:', error)
      toast.error(error.message || 'Failed to fetch payments')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const createPayment = useCallback(async (data: CreatePaymentData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payment created successfully')
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create payment')
      }
    } catch (error: any) {
      console.error('Error creating payment:', error)
      toast.error(error.message || 'Failed to create payment')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const updatePaymentStatus = useCallback(async (
    paymentId: string,
    paymentStatus: string,
    transactionId?: string,
    paymentDetails?: any,
    failureReason?: string
  ) => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentId,
          paymentStatus,
          transactionId,
          paymentDetails,
          failureReason
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payment status updated successfully')
        
        // Update local state
        setPayments(prev => 
          prev.map(payment => 
            payment._id === paymentId 
              ? { ...payment, ...result.data }
              : payment
          )
        )
        
        return result.data
      } else {
        throw new Error(result.error || 'Failed to update payment status')
      }
    } catch (error: any) {
      console.error('Error updating payment status:', error)
      toast.error(error.message || 'Failed to update payment status')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const cancelPayment = useCallback(async (paymentId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/payments?id=${paymentId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Payment cancelled successfully')
        
        // Update local state
        setPayments(prev => 
          prev.map(payment => 
            payment._id === paymentId 
              ? { ...payment, paymentStatus: 'cancelled' }
              : payment
          )
        )
        
        return true
      } else {
        throw new Error(result.error || 'Failed to cancel payment')
      }
    } catch (error: any) {
      console.error('Error cancelling payment:', error)
      toast.error(error.message || 'Failed to cancel payment')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const createRefund = useCallback(async (data: RefundData) => {
    setLoading(true)
    try {
      const response = await fetch('/api/payments/refunds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      const result = await response.json()

      if (result.success) {
        toast.success('Refund initiated successfully')
        
        // Update local state
        setPayments(prev => 
          prev.map(payment => 
            payment._id === data.paymentId 
              ? { ...payment, ...result.data.payment }
              : payment
          )
        )
        
        return result.data
      } else {
        throw new Error(result.error || 'Failed to create refund')
      }
    } catch (error: any) {
      console.error('Error creating refund:', error)
      toast.error(error.message || 'Failed to create refund')
      throw error
    } finally {
      setLoading(false)
    }
  }, [])

  const calculatePrice = useCallback(async (options: {
    vehicleType: string
    duration: number
    startTime: string
    endTime: string
    slotId?: string
  }): Promise<PricingCalculation | null> => {
    setLoading(true)
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options)
      })

      const result = await response.json()

      if (result.success) {
        return result.data.recommendedPricing
      } else {
        throw new Error(result.error || 'Failed to calculate price')
      }
    } catch (error: any) {
      console.error('Error calculating price:', error)
      toast.error(error.message || 'Failed to calculate price')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const exportPayments = useCallback(async (filters: PaymentFilters = {}) => {
    try {
      const params = new URLSearchParams({
        ...Object.entries(filters).reduce((acc, [key, value]) => {
          if (value) acc[key] = value.toString()
          return acc
        }, {} as Record<string, string>)
      })

      // Fetch all payments for export
      const response = await fetch(`/api/payments?${params}&limit=10000`)
      const result = await response.json()

      if (result.success) {
        // Create CSV content
        const headers = [
          'Payment ID',
          'Booking ID',
          'User ID',
          'Amount',
          'Currency',
          'Payment Method',
          'Status',
          'Transaction ID',
          'Vehicle Number',
          'Slot Number',
          'Duration',
          'Created At'
        ]

        const csvContent = [
          headers.join(','),
          ...result.data.map((payment: Payment) => [
            payment._id,
            payment.bookingId,
            payment.userId,
            payment.amount,
            payment.currency,
            payment.paymentMethod,
            payment.paymentStatus,
            payment.transactionId || '',
            payment.metadata.vehicleNumber || '',
            payment.metadata.slotNumber || '',
            payment.metadata.duration || '',
            new Date(payment.createdAt).toLocaleDateString()
          ].join(','))
        ].join('\n')

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `payments-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)

        toast.success('Payments exported successfully')
        return true
      } else {
        throw new Error(result.error || 'Failed to export payments')
      }
    } catch (error: any) {
      console.error('Error exporting payments:', error)
      toast.error(error.message || 'Failed to export payments')
      return false
    }
  }, [])

  return {
    // State
    payments,
    loading,
    pagination,
    statistics,

    // Actions
    fetchPayments,
    createPayment,
    updatePaymentStatus,
    cancelPayment,
    createRefund,
    calculatePrice,
    exportPayments
  }
}