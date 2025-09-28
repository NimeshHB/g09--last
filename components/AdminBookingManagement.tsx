'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Input } from './ui/input'
import { Alert, AlertDescription } from './ui/alert'
import { 
  CalendarIcon, 
  SearchIcon,
  FilterIcon,
  UserIcon,
  CarIcon,
  ClockIcon,
  DollarSignIcon
} from 'lucide-react'
import { useBookings, type Booking } from '@/hooks/use-bookings'
import { format } from 'date-fns'

export default function AdminBookingManagement() {
  const { bookings, loading, error, fetchUserBookings, checkInBooking, checkOutBooking } = useBookings()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
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

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.driverPhone.includes(searchQuery) ||
      booking._id.includes(searchQuery)
    
    const matchesStatus = statusFilter === 'all' || booking.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const getBookingStats = () => {
    const total = bookings.length
    const active = bookings.filter(b => b.status === 'active').length
    const completed = bookings.filter(b => b.status === 'completed').length
    const pending = bookings.filter(b => b.status === 'confirmed').length
    const totalRevenue = bookings
      .filter(b => b.finalAmount)
      .reduce((sum, b) => sum + (b.finalAmount || 0), 0)
    
    return { total, active, completed, pending, totalRevenue }
  }

  const handleForceCheckIn = async (booking: Booking) => {
    setActionLoading(`checkin-${booking._id}`)
    try {
      const success = await checkInBooking(booking.slotId, booking._id)
      if (success) {
        // Refresh data
        await fetchUserBookings()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const handleForceCheckOut = async (booking: Booking) => {
    setActionLoading(`checkout-${booking._id}`)
    try {
      const success = await checkOutBooking(booking.slotId, booking._id)
      if (success) {
        // Refresh data
        await fetchUserBookings()
      }
    } finally {
      setActionLoading(null)
    }
  }

  const stats = getBookingStats()

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading booking data...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Bookings</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
              </div>
              <ClockIcon className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl font-bold text-gray-600">{stats.completed}</p>
              </div>
              <CalendarIcon className="h-8 w-8 text-gray-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Revenue</p>
                <p className="text-2xl font-bold text-green-600">${stats.totalRevenue.toFixed(2)}</p>
              </div>
              <DollarSignIcon className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Booking Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="flex-1">
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by vehicle, driver, phone, or booking ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Bookings List */}
          <div className="space-y-4">
            {filteredBookings.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CalendarIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No bookings found matching your criteria</p>
              </div>
            ) : (
              filteredBookings.map((booking) => (
                <Card key={booking._id} className="border-l-4 border-l-purple-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">
                          Booking {booking._id.slice(-8)}
                        </h3>
                        <Badge className={getStatusColor(booking.status)}>
                          {booking.status}
                        </Badge>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Slot</p>
                        <p className="font-semibold">{booking.slotId}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Driver:</span>
                          <span>{booking.driverName}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-medium">Phone:</span>
                          <span>{booking.driverPhone}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CarIcon className="h-4 w-4 text-gray-500" />
                          <span className="font-medium">Vehicle:</span>
                          <span>{booking.vehicleNumber} ({booking.vehicleType})</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Start:</span> 
                          {format(new Date(booking.startTime), 'MMM dd, HH:mm')}
                        </div>
                        <div className="text-sm">
                          <span className="font-medium">End:</span> 
                          {format(new Date(booking.endTime), 'MMM dd, HH:mm')}
                        </div>
                        {booking.actualStartTime && (
                          <div className="text-sm">
                            <span className="font-medium">Actual Start:</span> 
                            {format(new Date(booking.actualStartTime), 'MMM dd, HH:mm')}
                          </div>
                        )}
                        {booking.actualEndTime && (
                          <div className="text-sm">
                            <span className="font-medium">Actual End:</span> 
                            {format(new Date(booking.actualEndTime), 'MMM dd, HH:mm')}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <div className="text-sm">
                          <span className="font-medium">Estimated:</span> 
                          <span className="font-bold text-blue-600"> ${booking.estimatedAmount}</span>
                        </div>
                        {booking.finalAmount && (
                          <div className="text-sm">
                            <span className="font-medium">Final:</span> 
                            <span className="font-bold text-green-600"> ${booking.finalAmount}</span>
                          </div>
                        )}
                        <div className="text-sm">
                          <span className="font-medium">Created:</span> 
                          {format(new Date(booking.createdAt), 'MMM dd, HH:mm')}
                        </div>
                      </div>
                    </div>

                    {booking.notes && (
                      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-sm"><strong>Notes:</strong> {booking.notes}</p>
                      </div>
                    )}

                    {/* Admin Actions */}
                    <div className="flex gap-2 pt-2 border-t">
                      {booking.status === 'confirmed' && (
                        <Button
                          onClick={() => handleForceCheckIn(booking)}
                          disabled={actionLoading === `checkin-${booking._id}`}
                          size="sm"
                          variant="outline"
                        >
                          {actionLoading === `checkin-${booking._id}` ? 'Checking In...' : 'Force Check-In'}
                        </Button>
                      )}
                      
                      {booking.status === 'active' && (
                        <Button
                          onClick={() => handleForceCheckOut(booking)}
                          disabled={actionLoading === `checkout-${booking._id}`}
                          size="sm"
                          variant="outline"
                        >
                          {actionLoading === `checkout-${booking._id}` ? 'Checking Out...' : 'Force Check-Out'}
                        </Button>
                      )}

                      <Button size="sm" variant="ghost">
                        View Details
                      </Button>
                      
                      <Button size="sm" variant="ghost">
                        Edit Booking
                      </Button>
                      
                      {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                        <Button size="sm" variant="destructive">
                          Cancel Booking
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}