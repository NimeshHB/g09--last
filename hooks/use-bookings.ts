import { useState, useEffect } from 'react'

export interface Booking {
  _id: string
  slotId: string
  startTime: string
  endTime: string
  actualStartTime?: string
  actualEndTime?: string
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired'
  vehicleNumber: string
  vehicleType: string
  driverName: string
  driverPhone: string
  notes?: string
  estimatedAmount: number
  finalAmount?: number
  createdAt: string
  updatedAt: string
}

interface UseBookingsReturn {
  bookings: Booking[]
  loading: boolean
  error: string | null
  fetchUserBookings: () => Promise<void>
  checkInBooking: (slotId: string, bookingId: string) => Promise<boolean>
  checkOutBooking: (slotId: string, bookingId: string) => Promise<boolean>
}

export function useBookings(userId?: string): UseBookingsReturn {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchUserBookings = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/bookings/user')
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }
      
      const data = await response.json()
      setBookings(data.bookings || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      console.error('Failed to fetch user bookings:', err)
    } finally {
      setLoading(false)
    }
  }

  const checkInBooking = async (slotId: string, bookingId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/slots/${slotId}/checkin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Check-in failed')
      }

      // Refresh bookings
      await fetchUserBookings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-in failed')
      console.error('Check-in failed:', err)
      return false
    }
  }

  const checkOutBooking = async (slotId: string, bookingId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/slots/${slotId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bookingId })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Check-out failed')
      }

      // Refresh bookings
      await fetchUserBookings()
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Check-out failed')
      console.error('Check-out failed:', err)
      return false
    }
  }

  // Load bookings on mount
  useEffect(() => {
    fetchUserBookings()
  }, [])

  return {
    bookings,
    loading,
    error,
    fetchUserBookings,
    checkInBooking,
    checkOutBooking
  }
}
