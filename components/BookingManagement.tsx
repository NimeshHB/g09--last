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

  const statusColors: Record<string, string> = {
    confirmed: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    completed: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
    expired: 'bg-yellow-100 text-yellow-800',
  }

  const statusIcons: Record<string, JSX.Element> = {
    confirmed: <CircleIcon className="h-4 w-4" />,
    active: <CheckCircleIcon className="h-4 w-4" />,
    completed: <CheckCircleIcon className="h-4 w-4" />,
    cancelled: <XCircleIcon className="h-4 w-4" />,
    expired: <XCircleIcon className="h-4 w-4" />,
  }

  const handleCheckIn = async (booking: Booking) => {
    setActionLoading(`checkin-${booking._id}`)
    try {
      await checkInBooking(booking.slotId, booking._id)
    } finally {
      setActionLoading(null)
    }
  }

  const handleCheckOut = async (booking: Booking) => {
    setActionLoading(`checkout-${booking._id}`)
    try {
      await checkOutBooking(booking.slotId, booking._id)
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          Loading your bookings...
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {bookings.length === 0 ? (
        <Card className="text-center py-10">
          <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-gray-500">No bookings found</p>
          <p className="text-sm text-gray-400">Book a parking slot to see your reservations here</p>
        </Card>
      ) : (
        bookings.map((booking) => (
          <Card key={booking._id} className="flex border-l-4 border-l-blue-500">
            <CardContent className="flex-1 space-y-4">
              
              {/* Header */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <h3 className="font-semibold">Slot {booking.slotId}</h3>
                  <Badge className={`${statusColors[booking.status] || 'bg-gray-100 text-gray-800'}`}>
                    <span className="flex items-center gap-1">
                      {statusIcons[booking.status] || <CircleIcon className="h-4 w-4" />}
                      {booking.status.toUpperCase()}
                    </span>
                  </Badge>
                </div>
                <div className="text-right text-xs text-gray-500">
                  Booking ID: <span className="font-mono">{booking._id.slice(-8)}</span>
                </div>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-gray-500" />
                    <span>Start:</span>
                    <span className="font-medium">{format(new Date(booking.startTime), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ClockIcon className="h-4 w-4 text-gray-500" />
                    <span>End:</span>
                    <span className="font-medium">{format(new Date(booking.endTime), 'MMM dd, yyyy HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CarIcon className="h-4 w-4 text-gray-500" />
                    <span>Vehicle:</span>
                    <span className="font-medium">{booking.vehicleNumber} ({booking.vehicleType})</span>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Driver:</span> {booking.driverName}
                  </div>
                  <div>
                    <span className="font-medium">Phone:</span> {booking.driverPhone}
                  </div>
                  <div>
                    <span className="font-medium">Estimated Cost:</span> 
                    <span className="font-bold text-green-600"> ${booking.estimatedAmount}</span>
                    {booking.finalAmount && (
                      <span className="ml-2">(Final: <span className="font-bold">${booking.finalAmount}</span>)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {booking.notes && (
                <div className="p-3 bg-gray-50 rounded-md text-sm">
                  <strong>Notes:</strong> {booking.notes}
                </div>
              )}

              {}
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
                    variant="outline"
                    size="sm"
                    disabled={actionLoading === `checkout-${booking._id}`}
                  >
                    {actionLoading === `checkout-${booking._id}` ? 'Checking Out...' : 'Check Out'}
                  </Button>
                )}
                {booking.status === 'completed' && (
                  <Badge variant="outline" className="self-start">✓ Completed</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
