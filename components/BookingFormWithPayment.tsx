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
import { Separator } from './ui/separator'
import { RadioGroup, RadioGroupItem } from './ui/radio-group'
import { CalendarIcon, CarIcon, CreditCardIcon, Calculator, CheckCircle, ArrowLeft } from 'lucide-react'
import { format, addHours, isBefore } from 'date-fns'
import { usePayments } from '@/hooks/use-payments'
import { usePricing } from '@/hooks/use-pricing'
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

interface PricingEstimate {
  tierId: string
  tierName: string
  baseAmount: number
  finalAmount: number
  surchargeMultiplier: number
  appliedDiscounts: any[]
  appliedSurcharges: any[]
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [pricingEstimate, setPricingEstimate] = useState<PricingEstimate | null>(null)
  const [step, setStep] = useState<'booking' | 'payment' | 'confirmation'>('booking')

  const { createPayment } = usePayments()
  const { calculatePrice } = usePricing()

  const [form, setForm] = useState<BookingForm>({
    slotId: preSelectedSlotId || '',
    startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    endTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
    notes: '',
    paymentMethod: 'cash'
  })

  // Fetch available slots
  useEffect(() => {
    const fetchSlots = async () => {
      try {
        const response = await fetch('/api/slots')
        if (response.ok) {
          const data = await response.json()
          setSlots(data.slots || [])
          
          // Auto-select pre-selected slot
          if (preSelectedSlotId) {
            const preSelected = data.slots?.find((slot: ParkingSlot) => slot._id === preSelectedSlotId)
            if (preSelected) {
              setSelectedSlot(preSelected)
              setForm(prev => ({ ...prev, slotId: preSelectedSlotId }))
            }
          }
        }
      } catch (error) {
        console.error('Error fetching slots:', error)
        setError('Failed to load parking slots')
      }
    }

    fetchSlots()
  }, [preSelectedSlotId])

  // Calculate pricing estimate when form changes
  useEffect(() => {
    const calculatePricing = async () => {
      if (!form.slotId || !form.startTime || !form.endTime || !currentUser?.vehicleType) {
        setPricingEstimate(null)
        return
      }

      try {
        const start = new Date(form.startTime)
        const end = new Date(form.endTime)
        const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))

        if (duration > 0) {
          const estimate = await calculatePrice({
            vehicleType: currentUser.vehicleType,
            duration,
            startTime: form.startTime,
            endTime: form.endTime,
            slotId: form.slotId
          })

          setPricingEstimate(estimate)
        }
      } catch (error) {
        console.error('Error calculating price:', error)
      }
    }

    calculatePricing()
  }, [form.slotId, form.startTime, form.endTime, currentUser?.vehicleType, calculatePrice])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (step === 'booking') {
      if (!validateBookingDetails()) return
      setStep('payment')
    } else if (step === 'payment') {
      await processBookingAndPayment()
    }
  }

  const validateBookingDetails = () => {
    setError('')

    if (!form.slotId || !form.startTime || !form.endTime) {
      setError('Please select a slot and booking times')
      return false
    }

    if (!currentUser?.name || !currentUser?.phone || !currentUser?.vehicleNumber) {
      setError('Please complete your profile information first (name, phone, vehicle details required)')
      return false
    }

    const start = new Date(form.startTime)
    const end = new Date(form.endTime)
    
    if (isBefore(start, new Date())) {
      setError('Start time cannot be in the past')
      return false
    }
    
    if (isBefore(end, start)) {
      setError('End time must be after start time')
      return false
    }

    const durationHours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    if (durationHours <= 0) {
      setError('Duration must be at least 1 hour')
      return false
    }

    return true
  }

  const processBookingAndPayment = async () => {
    setLoading(true)
    setError('')

    try {
      const durationHours = Math.ceil((new Date(form.endTime).getTime() - new Date(form.startTime).getTime()) / (1000 * 60 * 60))

      const bookingData = {
        userId: currentUser?.id || 'temp-user-id',
        vehicleNumber: currentUser?.vehicleNumber,
        duration: durationHours,
        userDetails: {
          name: currentUser?.name || 'Unknown User',
          email: currentUser?.email || `user.${Date.now()}@temp.com`,
          phone: currentUser?.phone || 'No phone provided',
          vehicleType: currentUser?.vehicleType || 'car',
          notes: form.notes
        },
        startTime: form.startTime,
        endTime: form.endTime
      }

      const response = await fetch(`/api/slots/${form.slotId}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.success) {
        const booking = result.booking

        // Create payment if pricing estimate is available
        if (pricingEstimate && pricingEstimate.finalAmount > 0) {
          try {
            await createPayment({
              bookingId: booking._id,
              amount: pricingEstimate.finalAmount,
              paymentMethod: form.paymentMethod,
              metadata: {
                slotNumber: selectedSlot?.number,
                vehicleNumber: currentUser?.vehicleNumber,
                duration: durationHours
              }
            })

            toast.success('Payment processed successfully')
          } catch (paymentError: any) {
            console.error('Payment creation failed:', paymentError)
            toast.error('Booking created but payment failed: ' + paymentError.message)
          }
        }

        setSuccess(`Booking created successfully! Booking ID: ${booking._id}`)
        setStep('confirmation')

        // Reset form
        setForm({
          slotId: '',
          startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
          endTime: format(addHours(new Date(), 2), "yyyy-MM-dd'T'HH:mm"),
          notes: '',
          paymentMethod: 'cash'
        })
        setSelectedSlot(null)
        setPricingEstimate(null)

        onSuccess?.()
      } else {
        throw new Error(result.error || 'Failed to create booking')
      }
    } catch (error: any) {
      console.error('Booking submission error:', error)
      setError(error.message || 'Failed to create booking. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const calculateEstimatedCost = () => {
    if (!selectedSlot || !form.startTime || !form.endTime) return 0
    
    const start = new Date(form.startTime)
    const end = new Date(form.endTime)
    const hours = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60))
    
    return hours * selectedSlot.hourlyRate
  }

  const handleSlotChange = (slotId: string) => {
    const slot = slots.find((s: ParkingSlot) => s._id === slotId)
    setSelectedSlot(slot || null)
    setForm(prev => ({ ...prev, slotId }))
  }

  const handleBack = () => {
    if (step === 'payment') {
      setStep('booking')
    } else if (step === 'confirmation') {
      setStep('booking')
    }
  }

  // Booking step render
  const renderBookingStep = () => (
    <div className="space-y-6">
      <div>
        <Label htmlFor="slot">Select Parking Slot</Label>
        <Select value={form.slotId} onValueChange={handleSlotChange}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a parking slot">
              {selectedSlot && (
                <div className="flex items-center gap-2">
                  <CarIcon className="h-4 w-4" />
                  <span>
                    {selectedSlot.slotName || `${selectedSlot.section}-${selectedSlot.number}`} 
                    - {selectedSlot.location} (${selectedSlot.type})
                  </span>
                  <Badge variant={selectedSlot.status === 'available' ? 'default' : 'secondary'}>
                    ${selectedSlot.hourlyRate}/hr
                  </Badge>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {slots
              .filter(slot => slot.status === 'available')
              .map((slot) => (
                <SelectItem key={slot._id} value={slot._id}>
                  <div className="flex items-center gap-2">
                    <CarIcon className="h-4 w-4" />
                    <span>
                      {slot.slotName || `${slot.section}-${slot.number}`} 
                      - {slot.location} ({slot.type})
                    </span>
                    <Badge variant="outline">${slot.hourlyRate}/hr</Badge>
                  </div>
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            id="startTime"
            type="datetime-local"
            value={form.startTime}
            onChange={(e) => setForm(prev => ({ ...prev, startTime: e.target.value }))}
            min={format(new Date(), "yyyy-MM-dd'T'HH:mm")}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            id="endTime"
            type="datetime-local"
            value={form.endTime}
            onChange={(e) => setForm(prev => ({ ...prev, endTime: e.target.value }))}
            min={form.startTime}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Additional Notes (Optional)</Label>
        <Textarea
          id="notes"
          placeholder="Any special requirements or notes..."
          value={form.notes}
          onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
          rows={3}
        />
      </div>

      {/* Pricing Estimate */}
      {pricingEstimate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pricing Estimate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Pricing Tier:</span>
                <span className="font-medium">{pricingEstimate.tierName}</span>
              </div>
              <div className="flex justify-between">
                <span>Base Amount:</span>
                <span>${pricingEstimate.baseAmount.toFixed(2)}</span>
              </div>
              {pricingEstimate.surchargeMultiplier > 1 && (
                <div className="flex justify-between">
                  <span>Surcharge:</span>
                  <span>{pricingEstimate.surchargeMultiplier}x</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total Amount:</span>
                <span>${pricingEstimate.finalAmount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )

  // Payment step render
  const renderPaymentStep = () => (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h3 className="text-lg font-semibold">Payment Information</h3>
      </div>

      {/* Booking Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Booking Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Parking Slot:</span>
              <span className="font-medium">
                {selectedSlot?.slotName || `${selectedSlot?.section}-${selectedSlot?.number}`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Vehicle:</span>
              <span className="font-medium">{currentUser?.vehicleNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Start Time:</span>
              <span>{format(new Date(form.startTime), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span>End Time:</span>
              <span>{format(new Date(form.endTime), 'MMM dd, yyyy HH:mm')}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-lg">
              <span>Total Amount:</span>
              <span>${pricingEstimate?.finalAmount.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Method Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <RadioGroup
            value={form.paymentMethod}
            onValueChange={(value) => setForm(prev => ({ ...prev, paymentMethod: value as any }))}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="cash" id="cash" />
              <Label htmlFor="cash">Cash Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="card" id="card" />
              <Label htmlFor="card">Credit/Debit Card</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="mobile" id="mobile" />
              <Label htmlFor="mobile">Mobile Payment</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="online" id="online" />
              <Label htmlFor="online">Online Payment</Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>
    </div>
  )

  // Confirmation step render
  const renderConfirmationStep = () => (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
        <CheckCircle className="h-8 w-8 text-green-600" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-green-800">Booking Confirmed!</h3>
        <p className="text-muted-foreground mt-2">{success}</p>
      </div>
      <div>
        <Button onClick={() => setStep('booking')}>
          Make Another Booking
        </Button>
      </div>
    </div>
  )

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCardIcon className="h-5 w-5" />
          {step === 'booking' && 'Book Parking Slot'}
          {step === 'payment' && 'Payment & Confirmation'}
          {step === 'confirmation' && 'Booking Complete'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-6" variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          {step === 'booking' && renderBookingStep()}
          {step === 'payment' && renderPaymentStep()}
          {step === 'confirmation' && renderConfirmationStep()}

          {step !== 'confirmation' && (
            <div className="flex justify-end pt-6">
              <Button
                type="submit"
                disabled={loading || !selectedSlot}
                className="min-w-[120px]"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    {step === 'booking' && 'Continue to Payment'}
                    {step === 'payment' && 'Confirm Booking'}
                  </>
                )}
              </Button>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  )
}