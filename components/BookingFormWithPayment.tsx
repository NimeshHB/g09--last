'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { Badge } from './ui/badge'
import { Separator } from './ui/separator'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { CheckCircle, ArrowLeft, Calculator, CarIcon } from 'lucide-react'
import { format, addHours, isBefore } from 'date-fns'
import { toast } from 'sonner'

interface ParkingSlot {
  _id: string
  number: string
  section: string
  slotName?: string
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
  paymentMethod: 'cash' | 'card' | 'mobile' | 'online'
}

interface BookingFormProps {
  onSuccess?: () => void
  preSelectedSlotId?: string | null
  currentUser?: {
    id: string
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
  const [form, setForm] = useState<BookingForm>({
    slotId: preSelectedSlotId || '',
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
    paymentMethod: 'cash'
  })
  const [step, setStep] = useState<'booking' | 'payment' | 'confirmation'>('booking')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    // Fetch slots (dummy for now)
    const fetchSlots = async () => {
      const data: ParkingSlot[] = [
        { _id: '1', number: 'A1', section: 'A', location: 'Ground', type: 'Compact', status: 'available', hourlyRate: 10 },
        { _id: '2', number: 'A2', section: 'A', location: 'Ground', type: 'SUV', status: 'available', hourlyRate: 12 },
        { _id: '3', number: 'B1', section: 'B', location: '1st Floor', type: 'Compact', status: 'occupied', hourlyRate: 10 },
      ]
      setSlots(data)
      if (preSelectedSlotId) {
        const pre = data.find(s => s._id === preSelectedSlotId)
        if (pre) {
          setSelectedSlot(pre)
          setForm(prev => ({ ...prev, slotId: pre._id }))
        }
      }
    }
    fetchSlots()
  }, [preSelectedSlotId])

  const handleSlotSelect = (slot: ParkingSlot) => {
    if (slot.status !== 'available') return
    setSelectedSlot(slot)
    setForm(prev => ({ ...prev, slotId: slot._id }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (step === 'booking') {
      if (!selectedSlot) {
        setError('Please select a parking slot')
        return
      }
      setStep('payment')
    } else if (step === 'payment') {
      setLoading(true)
      setError('')
      try {
        // Simulate booking API
        await new Promise(res => setTimeout(res, 1000))
        setSuccess('Booking confirmed! 🎉')
        setStep('confirmation')
        onSuccess?.()
      } catch (err) {
        setError('Failed to book slot.')
      } finally {
        setLoading(false)
      }
    }
  }

  const handleBack = () => {
    if (step === 'payment') setStep('booking')
    if (step === 'confirmation') setStep('booking')
  }

  return (
    <Card className="max-w-3xl mx-auto p-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {step === 'booking' && 'Select Parking Slot'}
          {step === 'payment' && 'Payment & Booking'}
          {step === 'confirmation' && 'Booking Complete'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && <p className="text-red-600 mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Booking Step */}
          {step === 'booking' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {slots.map(slot => (
                <Card
                  key={slot._id}
                  className={`cursor-pointer border-2 ${selectedSlot?._id === slot._id ? 'border-blue-500' : 'border-gray-200'} ${slot.status !== 'available' ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => handleSlotSelect(slot)}
                >
                  <CardContent className="flex flex-col items-start gap-2">
                    <div className="flex items-center gap-2">
                      <CarIcon className="w-5 h-5" />
                      <span>{slot.slotName || `${slot.section}-${slot.number}`}</span>
                    </div>
                    <Badge variant={slot.status === 'available' ? 'default' : 'secondary'}>
                      {slot.status.toUpperCase()}
                    </Badge>
                    <p className="text-sm">{slot.type} - {slot.location}</p>
                    <p className="font-bold">${slot.hourlyRate}/hr</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Payment Step */}
          {step === 'payment' && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="w-4 h-4 mr-2" /> Back
              </Button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="w-5 h-5" /> Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between">
                    <span>Slot:</span>
                    <span>{selectedSlot?.slotName || `${selectedSlot?.section}-${selectedSlot?.number}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duration:</span>
                    <span>{Math.ceil((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / 3600000)} hrs</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold">
                    <span>Total:</span>
                    <span>${selectedSlot?.hourlyRate ? Math.ceil((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / 3600000) * selectedSlot.hourlyRate : 0}</span>
                  </div>
                </CardContent>
              </Card>

              <div>
                <Label>Payment Method</Label>
                <RadioGroup
                  value={form.paymentMethod}
                  onValueChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value as any }))}
                  className="flex flex-col space-y-2"
                >
                  {['cash', 'card', 'mobile', 'online'].map(method => (
                    <div key={method} className="flex items-center gap-2">
                      <RadioGroupItem value={method} id={method} />
                      <Label htmlFor={method}>{method.charAt(0).toUpperCase() + method.slice(1)}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
