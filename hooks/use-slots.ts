import { useState, useEffect } from 'react'

export interface Slot {
  _id?: string
  date: string
  time: string
  duration: number
  service: string
}

export function useSlots() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSlots = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/slots')
      if (!res.ok) throw new Error('Failed to fetch slots')
      const data = await res.json()
      setSlots(data.slots)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  return { slots, loading, error, refetch: fetchSlots }
}
