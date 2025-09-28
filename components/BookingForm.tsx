'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Alert, AlertDescription } from './ui/alert'
import { Badge } from './ui/badge'
import { Textarea } from './ui/textarea'
import { CalendarIcon, CarIcon, CreditCardIcon } from 'lucide-react'
import { format, addHours, isBefore } from 'date-fns'

interface ParkingSlot {
  _id: string
  number: string        // This is the actual field name from API
  section: string       // Section field for generating slot names
  slotName?: string     // New field for names like "A01"
  location: string
  type: string
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  hourlyRate: number
}

interface BookingForm {
  slotId: string
  startTime: string
  endTime: string
  notes?: string
}

interface BookingFormProps {
  onSuccess?: () => void
  preSelectedSlotId?: string | null  // For auto-selecting a specific slot
  currentUser?: {
    name: string
    email: string
    phone: string
    vehicleNumber: string
    vehicleType: string
  }
}

export default function BookingForm({ onSuccess, currentUser, preSelectedSlotId }: BookingFormProps = {}) {
  const [slots, setSlots] = useState<ParkingSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<ParkingSlot | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [form, setForm] = useState<BookingForm>({
    slotId: '',
    startTime: '',
    endTime: '',
    notes: ''
  })

  // Load available slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await fetch('/api/slots')
        if (response.ok) {
          const data = await response.json()
          const availableSlots = data.slots.filter((slot: ParkingSlot) => slot.status === 'available')
          setSlots(availableSlots)
          
          // Auto-select slot if preSelectedSlotId is provided
          if (preSelectedSlotId) {
            const preSelectedSlot = availableSlots.find((slot: ParkingSlot) => slot._id === preSelectedSlotId)
            if (preSelectedSlot) {
              setSelectedSlot(preSelectedSlot)
              setForm(prev => ({ ...prev, slotId: preSelectedSlot._id }))
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch slots:', err)
      }
    }
    fetchSlots()
  }, [preSelectedSlotId])

  // Set default times (now + 1 hour to now + 3 hours)
  useEffect(() => {
    const now = new Date()
    const startTime = addHours(now, 1)
    const endTime = addHours(now, 3)
    
    setForm(prev => ({
      ...prev,
      startTime: format(startTime, "yyyy-MM-dd'T'HH:mm"),
      endTime: format(endTime, "yyyy-MM-dd'T'HH:mm")
    }))
  }, [])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      // Validate required fields
      if (!form.slotId || !form.startTime || !form.endTime) {
        throw new Error('Please select a slot and booking times')
      }

      if (!currentUser?.name || !currentUser?.phone || !currentUser?.vehicleNumber) {
        throw new Error('Please complete your profile information first (name, phone, vehicle details required)')
      }

      console.log('Current user data:', currentUser) // Debug logging

      // Validate times
      const start = new Date(form.startTime)
      const end = new Date(form.endTime)
      
      if (isBefore(start, new Date())) {
        throw new Error('Start time cannot be in the past')
      }
      
      if (isBefore(end, start)) {
        throw new Error('End time must be after start time')
      }

      // Calculate duration in hours
      const durationHours = Math.ceil((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / (1000 * 60 * 60))

      if (durationHours <= 0) {
        throw new Error('Duration must be at least 1 hour')
      }

      const bookingData = {
        userId: 'temp-user-id', // TODO: Get actual user ID from authentication  
        vehicleNumber: currentUser?.vehicleNumber,
        duration: durationHours,
        userDetails: {
          name: currentUser?.name || 'Unknown User',
          email: currentUser?.email || `user.${Date.now()}@temp.com`, // Generate temporary email if not provided
          phone: currentUser?.phone || 'No phone provided',
          vehicleType: currentUser?.vehicleType || 'car',
          notes: form.notes
        },
        startTime: form.startTime,
        endTime: form.endTime
      }

      console.log('Sending booking data:', bookingData) // Debug logging

      // Submit booking
      const response = await fetch(`/api/slots/${form.slotId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(`Booking confirmed! Booking ID: ${data.booking._id}`)
        setForm({
          slotId: '',
          startTime: '',
          endTime: '',
          notes: ''
        })
        setSelectedSlot(null)
        // Call onSuccess callback after a brief delay to show success message
        if (onSuccess) {
          setTimeout(() => {
            onSuccess()
          }, 2000)
        }
        
        // Refresh available slots
        const slotsResponse = await fetch('/api/slots')
        if (slotsResponse.ok) {
          const slotsData = await slotsResponse.json()
          setSlots(slotsData.slots.filter((slot: ParkingSlot) => slot.status === 'available'))
        }
      } else {
        throw new Error(data.error || 'Booking failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  // Calculate booking cost
  const calculateCost = () => {
    if (!selectedSlot || !form.startTime || !form.endTime) return 0
    
    const start = new Date(form.startTime)
    const end = new Date(form.endTime)
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    
    return hours * selectedSlot.hourlyRate
  }

  // Handle slot selection
  const handleSlotSelect = (slotId: string) => {
    const slot = slots.find(s => s._id === slotId)
    setSelectedSlot(slot || null)
    setForm(prev => ({ ...prev, slotId }))
  }

  return (
    <div className="space-y-6">
      {/* Slot Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CarIcon className="h-5 w-5" />
            Select Parking Slot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="slot-select">Choose a parking slot</Label>
              <Select 
                value={selectedSlot?._id || ""} 
                onValueChange={(value) => handleSlotSelect(value)}
              >
                <SelectTrigger id="slot-select">
                  <SelectValue placeholder="Select a parking slot" />
                </SelectTrigger>
                <SelectContent>
                  {slots.map((slot) => (
                    <SelectItem key={slot._id} value={slot._id}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-medium">
                          {slot.slotName || slot.number}
                        </span>
                        <span className="text-sm text-gray-500 ml-4">
                          {slot.location} • {slot.type} • ${slot.hourlyRate}/hr
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Selected Slot Details */}
            {selectedSlot && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Selected Slot Details</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Slot Name:</span>
                    <span className="font-medium ml-2">
                      {selectedSlot.slotName || selectedSlot.number}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <span className="font-medium ml-2">{selectedSlot.type}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Location:</span>
                    <span className="font-medium ml-2">{selectedSlot.location}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Rate:</span>
                    <span className="font-bold text-green-600 ml-2">${selectedSlot.hourlyRate}/hour</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {slots.length === 0 && (
            <p className="text-center text-gray-500 py-8">
              No available slots at the moment
            </p>
          )}
        </CardContent>
      </Card>

      {/* Booking Form */}
      {selectedSlot && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Book Slot {selectedSlot.slotName || selectedSlot.number}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Time Selection */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                    required
                  />
                </div>
              </div>

              {/* User Profile Summary */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <h4 className="font-medium mb-3">Booking Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Driver:</span>
                    <span className="ml-2 font-medium">{currentUser?.name || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Email:</span>
                    <span className="ml-2">{currentUser?.email || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Phone:</span>
                    <span className="ml-2">{currentUser?.phone || 'Not provided'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Vehicle:</span>
                    <span className="ml-2">{currentUser?.vehicleNumber || 'Not provided'} ({currentUser?.vehicleType || 'Not specified'})</span>
                  </div>
                </div>
                {(!currentUser?.name || !currentUser?.phone || !currentUser?.vehicleNumber) && (
                  <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm">
                    ⚠️ Please complete your profile information before booking (name, phone, vehicle details required)
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Any special requirements or notes..."
                  rows={3}
                />
              </div>

              {/* Cost Summary */}
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CreditCardIcon className="h-5 w-5 text-green-600" />
                      <span className="font-semibold">Total Cost:</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      ${calculateCost().toFixed(2)}
                    </span>
                  </div>
                  {form.startTime && form.endTime && (
                    <p className="text-sm text-green-700 mt-1">
                      Duration: {Math.ceil((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / (1000 * 60 * 60))} hours
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Alerts */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert>
                  <AlertDescription>{success}</AlertDescription>
                </Alert>
              )}

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loading}
              >
                {loading ? 'Processing...' : `Book Now - $${calculateCost().toFixed(2)}`}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}