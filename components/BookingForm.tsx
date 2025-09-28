'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'

interface BookingFormProps {
  onSuccess?: () => void
  preSelectedSlotId?: string | null
  currentUser?: any
}

export default function BookingForm({
  onSuccess,
  currentUser,
  preSelectedSlotId,
}: BookingFormProps) {
  const [selectedSlot, setSelectedSlot] = useState(preSelectedSlotId || '')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = () => {
    setIsSubmitting(true)
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false)
      if (onSuccess) onSuccess()
      alert(`Slot ${selectedSlot || 'None'} booked successfully!`)
    }, 1000)
  }

  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Book a Parking Slot</CardTitle>
      </CardHeader>
      <CardContent>
        {/* User Info Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">User Info</h3>
          <p>Name: {currentUser?.name || 'Unknown'}</p>
          <p>Email: {currentUser?.email || 'Not provided'}</p>
        </div>

        {/* Slot Selection Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">Select Slot</h3>
          <select
            className="w-full p-2 border rounded"
            value={selectedSlot}
            onChange={(e) => setSelectedSlot(e.target.value)}
          >
            <option value="">-- Choose a slot --</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
          </select>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Booking...' : 'Book Slot'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
