'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'

interface BookingFormProps {
  onSuccess?: () => void
  preSelectedSlotId?: string | null
  currentUser?: any
}

export default function BookingForm({ onSuccess, currentUser, preSelectedSlotId }: BookingFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Book Parking Slot</CardTitle>
      </CardHeader>
      <CardContent>
        <p>Booking form component - Basic version</p>
        <p>Selected Slot: {preSelectedSlotId || 'None'}</p>
        <p>User: {currentUser?.name || 'Unknown'}</p>
      </CardContent>
    </Card>
  )
}
