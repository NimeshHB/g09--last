'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function ApiTestPage() {
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const addResult = (test: string, success: boolean, data: any) => {
    setResults(prev => [...prev, { test, success, data, timestamp: new Date().toLocaleTimeString() }])
  }

  const testSlotsAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/slots')
      const data = await response.json()
      addResult('GET /api/slots', response.ok, data)
    } catch (error: any) {
      addResult('GET /api/slots', false, error.message)
    }
    setLoading(false)
  }

  const testBookingsAPI = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/bookings/user')
      const data = await response.json()
      addResult('GET /api/bookings/user', response.ok, data)
    } catch (error: any) {
      addResult('GET /api/bookings/user', false, error.message)
    }
    setLoading(false)
  }

  const testBookingCreation = async () => {
    setLoading(true)
    try {
      // First get an available slot
      const slotsResponse = await fetch('/api/slots')
      const slotsData = await slotsResponse.json()
      
      if (!slotsData.success || !slotsData.slots.length) {
        addResult('Booking Test', false, 'No slots available')
        setLoading(false)
        return
      }

      const availableSlot = slotsData.slots.find((slot: any) => slot.status === 'available')
      if (!availableSlot) {
        addResult('Booking Test', false, 'No available slots')
        setLoading(false)
        return
      }

      // Create a test booking
      const bookingData = {
        startTime: new Date(Date.now() + 60000).toISOString(), // 1 minute from now
        endTime: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
        vehicleNumber: 'TEST-123',
        vehicleType: 'car',
        driverName: 'Test Driver',
        driverPhone: '+1234567890',
        notes: 'Test booking'
      }

      const response = await fetch(`/api/slots/${availableSlot._id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })

      const data = await response.json()
      addResult(`POST /api/slots/${availableSlot._id}/book`, response.ok, data)
    } catch (error: any) {
      addResult('Booking Test', false, error.message)
    }
    setLoading(false)
  }

  const clearResults = () => {
    setResults([])
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Booking System API Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <Button onClick={testSlotsAPI} disabled={loading}>
              Test Slots API
            </Button>
            <Button onClick={testBookingsAPI} disabled={loading}>
              Test Bookings API
            </Button>
            <Button onClick={testBookingCreation} disabled={loading}>
              Test Booking Creation
            </Button>
            <Button variant="outline" onClick={clearResults}>
              Clear Results
            </Button>
          </div>

          {loading && (
            <Alert>
              <AlertDescription>Running test...</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            {results.map((result, index) => (
              <Alert key={index} variant={result.success ? "default" : "destructive"}>
                <AlertDescription>
                  <div className="font-mono text-sm">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold">{result.test}</span>
                      <span className="text-xs">{result.timestamp}</span>
                    </div>
                    <div className={`px-2 py-1 rounded ${result.success ? 'bg-green-100' : 'bg-red-100'}`}>
                      Status: {result.success ? '✅ Success' : '❌ Failed'}
                    </div>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">Response Data</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.data, null, 2)}
                      </pre>
                    </details>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}