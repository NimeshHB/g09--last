'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { 
  CalendarIcon, 
  ClockIcon, 
  CarIcon, 
  CheckCircleIcon, 
  CircleIcon,
  XCircleIcon 
} from 'lucide-react'
import { useBookings, type Booking } from '@/hooks/use-bookings'
import { format } from 'date-fns'

export default function BookingManagement() {
  const { bookings, loading, error, checkInBooking, checkOutBooking } = useBookings()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'expired': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CircleIcon className="h-4 w-4" />
      case 'active': return <CheckCircleIcon className="h-4 w-4" />
      case 'completed': return <CheckCircleIcon className="h-4 w-4" />
      case 'cancelled': return <XCircleIcon className="h-4 w-4" />
      case 'expired': return <XCircleIcon className="h-4 w-4" />
      default: return <CircleIcon className="h-4 w-4" />
    }
  }

  const handleCheckIn = async (booking: Booking) => {
    setActionLoading(`checkin-${booking._id}`)
    try {
      const success = await checkInBooking(booking.slotId, booking._id)
      if (success) {
        // Success message will be handled by the useBookings hook
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckOut = async (booking: Booking) => {
    setActionLoading(`checkout-${booking._id}`)
    try {
      const success = await checkOutBooking(booking.slotId, booking._id)
      if (success) {
        // Success message will be handled by the useBookings hook
      }
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading your bookings...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            My Bookings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {bookings.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No bookings found</p>
              <p className="text-sm">Book a parking slot to see your reservations here</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <Card key={booking._id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          Slot {booking.slotId || 'N/A'}
                        </h3>
                        <Badge className={getStatusColor(booking.status)}>
                          <span className="flex items-center gap-1">
                            {getStatusIcon(booking.status)}
                            {booking.status}
                          </span>
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Booking ID</p>
                        <p className="font-mono text-xs">{booking._id.slice(-8)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Start:</span>
                          <span>{format(new Date(booking.startTime), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <ClockIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">End:</span>
                          <span>{format(new Date(booking.endTime), 'MMM dd, yyyy HH:mm')}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CarIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Vehicle:</span>
                          <span>{booking.vehicleNumber} ({booking.vehicleType})</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Driver:</span> {booking.driverName}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Phone:</span> {booking.driverPhone}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">Estimated Cost:</span> 
                          <span className="font-bold text-green-600"> ${booking.estimatedAmount}</span>
                          {booking.finalAmount && (
                            <span className="ml-2">
                              (Final: <span className="font-bold">${booking.finalAmount}</span>)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm"><strong>Notes:</strong> {booking.notes}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {booking.status === 'confirmed' && (
                        <Button
                          onClick={() => handleCheckIn(booking)}
                          disabled={actionLoading === `checkin-${booking._id}`}
                          size="sm"
                        >
                          {actionLoading === `checkin-${booking._id}` ? 'Checking In...' : 'Check In'}
                        </Button>
                      )}
                      
                      {booking.status === 'active' && (
                        <Button
                          onClick={() => handleCheckOut(booking)}
                          disabled={actionLoading === `checkout-${booking._id}`}
                          variant="outline"
                          size="sm"
                        >
                          {actionLoading === `checkout-${booking._id}` ? 'Checking Out...' : 'Check Out'}
                        </Button>
                      )}

                      {booking.status === 'completed' && (
                        <Badge variant="outline" className="self-start">
                          ✓ Completed
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}