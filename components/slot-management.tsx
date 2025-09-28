"use client"

import React, { useEffect, useReducer, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Car, Plus, Edit, Trash2, MapPin, AlertTriangle, CheckCircle, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

// --- Types
interface ParkingSlot {
  _id: string
  number: string
  section: string
  type: string
  hourlyRate: number
  status: string
  maxTimeLimit: number
  description?: string
  bookedBy?: string | null
  vehicleNumber?: string | null
  bookedAt?: string | Date | null
  bookedByUserId?: string | null
}

// --- Constants
const DEFAULT_NEW_SLOT = {
  number: "",
  section: "A",
  type: "regular",
  hourlyRate: 5,
  status: "available",
  maxTimeLimit: 2,
  description: "",
}

const SLOT_TYPES = [
  { value: "regular", label: "Regular", rate: 5 },
  { value: "compact", label: "Compact", rate: 4 },
  { value: "large", label: "Large Vehicle", rate: 7 },
  { value: "electric", label: "Electric Vehicle", rate: 6 },
  { value: "handicap", label: "Handicap", rate: 5 },
  { value: "vip", label: "VIP", rate: 10 },
]

const SECTIONS = ["A", "B", "C", "D", "E"]

// --- Custom hook that encapsulates slot data + actions
function useSlots() {
  const [slots, setSlots] = useState<ParkingSlot[]>([])
  const [loading, setLoading] = useState(true)

  const fetchSlots = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/slots")
      const json = await res.json()
      if (json && json.success) setSlots(json.slots || [])
      else setSlots([])
    } catch (e) {
      setSlots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  const upsertSlot = async (payload: Partial<ParkingSlot> & { _id?: string }) => {
    const method = payload._id ? "PATCH" : "POST"
    try {
      const res = await fetch("/api/slots", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (json?.success) await fetchSlots()
      return json
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  const deleteSlot = async (_id: string) => {
    try {
      const res = await fetch(`/api/slots?_id=${encodeURIComponent(_id)}`, { method: "DELETE" })
      const json = await res.json()
      if (json?.success) await fetchSlots()
      return json
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  const patchStatus = async (_id: string, status: string) => {
    try {
      const res = await fetch("/api/slots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id, status }),
      })
      const json = await res.json()
      if (json?.success) await fetchSlots()
      return json
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  }

  return { slots, loading, fetchSlots, upsertSlot, deleteSlot, patchStatus }
}

// --- Reducer for form state (clean separation from component)
type FormState = typeof DEFAULT_NEW_SLOT
type FormAction =
  | { type: "reset" }
  | { type: "set"; payload: Partial<FormState> }

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset":
      return { ...DEFAULT_NEW_SLOT }
    case "set":
      return { ...state, ...action.payload }
    default:
      return state
  }
}

// --- Small presentational subcomponents (kept inside same file for single-file delivery)
function StatsGrid({ slots }: { slots: ParkingSlot[] }) {
  const total = slots.length
  const available = slots.filter((s) => s.status === "available").length
  const occupied = slots.filter((s) => s.status === "occupied").length
  const blocked = slots.filter((s) => s.status === "blocked").length
  const revenue = slots
    .filter((s) => s.bookedAt)
    .reduce((sum, slot) => {
      const bookedAt = slot.bookedAt ? new Date(slot.bookedAt).getTime() : 0
      const hours = bookedAt ? Math.ceil((Date.now() - bookedAt) / (1000 * 60 * 60)) : 0
      return sum + hours * (slot.hourlyRate || 5)
    }, 0)

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
          <MapPin className="h-4 w-4 text-blue-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{total}</div>
          <p className="text-xs text-muted-foreground">Parking capacity</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Available</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{available}</div>
          <p className="text-xs text-muted-foreground">Ready for booking</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Occupied</CardTitle>
          <Car className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">{occupied}</div>
          <p className="text-xs text-muted-foreground">Currently parked</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          <AlertTriangle className="h-4 w-4 text-orange-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-orange-600">{blocked}</div>
          <p className="text-xs text-muted-foreground">Under maintenance</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
          <DollarSign className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">${revenue.toFixed(2)}</div>
          <p className="text-xs text-muted-foreground">Estimated earnings</p>
        </CardContent>
      </Card>
    </div>
  )
}

// --- Main refactor component (default export as requested by canmore rules)
export default function SlotManagementRefactor() {
  const { toast } = useToast()
  const { slots, loading, upsertSlot, deleteSlot, patchStatus } = useSlots()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<ParkingSlot | null>(null)
  const [form, dispatch] = useReducer(formReducer, DEFAULT_NEW_SLOT)

  // helpers
  const openAdd = () => {
    dispatch({ type: "reset" })
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (slot: ParkingSlot) => {
    dispatch({ type: "set", payload: {
      number: slot.number,
      section: slot.section || "A",
      type: slot.type || "regular",
      hourlyRate: slot.hourlyRate || 5,
      status: slot.status || "available",
      maxTimeLimit: slot.maxTimeLimit || 2,
      description: slot.description || "",
    }})
    setEditing(slot)
    setShowForm(true)
  }

  const autoGenerateNumber = () => {
    const sectionSlots = slots.filter((s) => s.number.startsWith(form.section))
    const next = (sectionSlots.length + 1).toString().padStart(2, "0")
    dispatch({ type: "set", payload: { number: `${form.section}${next}` } })
  }

  const submitForm = async () => {
    if (!form.number) {
      toast({ title: "Error", description: "Please enter a slot number", variant: "destructive" })
      return
    }

    const payload = editing ? { _id: editing._id, ...form } : form
    const res = await upsertSlot(payload as any)
    if (res?.success) {
      toast({ title: "Success", description: editing ? "Slot updated" : "Slot created" })
      setShowForm(false)
      dispatch({ type: "reset" })
      setEditing(null)
    } else {
      toast({ title: "Error", description: res?.error || "Failed to save slot", variant: "destructive" })
    }
  }

  const tryDelete = async (slot: ParkingSlot) => {
    if (slot.status === "occupied") {
      toast({ title: "Error", description: "Cannot delete an occupied slot", variant: "destructive" })
      return
    }
    const res = await deleteSlot(slot._id)
    if (res?.success) toast({ title: "Success", description: "Slot deleted" })
    else toast({ title: "Error", description: res?.error || "Delete failed", variant: "destructive" })
  }

  const changeStatus = async (slot: ParkingSlot, newStatus: string) => {
    const res = await patchStatus(slot._id, newStatus)
    if (res?.success) toast({ title: "Success", description: "Status updated" })
    else toast({ title: "Error", description: res?.error || "Update failed", variant: "destructive" })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Slot Management (Refactor)</h2>
          <p className="text-gray-600">Same functionality — reorganized with a hook + reducer.</p>
        </div>
        <Button onClick={openAdd} className="flex items-center gap-2">
