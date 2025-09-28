"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Car } from "lucide-react"
import { ParkingSlotGrid } from "@/components/parking-slot-grid"
import { AdminDashboard } from "@/components/admin-dashboard"
import { UserDashboard } from "@/components/user-dashboard"
import { AttendantDashboard } from "@/components/attendant-dashboard"
import { LoginForm } from "@/components/login-form"

interface User {
  id: number | string
  name: string
  role: "admin" | "user" | "attendant"
  email: string
}

interface ParkingSlot {
  id: string
  _id: string
  number: string
  status: "available" | "occupied" | "blocked"
  vehicleNumber?: string | null
  bookedBy?: string | null
  bookedAt?: Date | string | null
  timeLimit: number
  section?: string
  type?: string
  hourlyRate?: number
  maxTimeLimit?: number
  description?: string
  bookedByUserId?: string | null
}

// Mock user data - in real app, this would come from your auth system
const mockUsers = {
  admin: { id: 1, name: "Admin User", role: "admin" as const, email: "admin@parking.com" },
  // Remove the hardcoded user and attendant - they'll login properly
}

export default function ParkingManagementSystem() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch parking slots from API
  const fetchSlots = async () => {
    try {
      const response = await fetch('/api/slots')
      const data = await response.json()
      if (data.success) {
        // Convert backend format to frontend format
        const formattedSlots = data.slots.map((slot: any) => ({
          id: slot._id,
          _id: slot._id,
          number: slot.number,
          status: slot.status,
          vehicleNumber: slot.vehicleNumber,
          bookedBy: slot.bookedBy,
          bookedAt: slot.bookedAt,
          timeLimit: slot.maxTimeLimit || 2,
          section: slot.section,
          type: slot.type,
          hourlyRate: slot.hourlyRate,
          maxTimeLimit: slot.maxTimeLimit,
          description: slot.description,
          bookedByUserId: slot.bookedByUserId
        }))
        setParkingSlots(formattedSlots)
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error)
      // Fallback to empty array if API fails
      setParkingSlots([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
  }, [])

  // Load persisted user on first mount so refresh doesn't log out
  useEffect(() => {
    try {
      const saved = localStorage.getItem("currentUser")
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed && parsed.id && parsed.role) {
          setCurrentUser(parsed)
        }
      }
    } catch (e) {
      console.warn("Failed to load saved user:", e)
    }
  }, [])

  const handleLogin = (userData: User) => {
    setCurrentUser(userData)
    try {
      localStorage.setItem("currentUser", JSON.stringify(userData))
    } catch (e) {
      console.warn("Failed to persist user:", e)
    }
  }

  const handleLogout = () => {
    setCurrentUser(null)
    try {
      localStorage.removeItem("currentUser")
    } catch (e) {
      console.warn("Failed to clear saved user:", e)
    }
  }

  if (!currentUser) {
    return <LoginForm onLogin={handleLogin} onClose={() => {}} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <Car className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Smart Parking System</h1>
                <p className="text-sm text-gray-500">10 Slot Management</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="capitalize">
                {currentUser.role}
              </Badge>
              <span className="text-sm text-gray-700">{currentUser.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Live Parking Status */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Live Parking Status</h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Available</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Occupied</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-sm text-gray-600">Block</span>
              </div>
            </div>
          </div>
          <ParkingSlotGrid
            slots={parkingSlots}
            onSlotUpdate={setParkingSlots}
            userRole={currentUser.role}
            currentUser={currentUser}
          />
        </div>

        {/* Role-based Dashboard */}
        {currentUser.role === "admin" && <AdminDashboard />}

        {currentUser.role === "user" && (
          <UserDashboard parkingSlots={parkingSlots} currentUser={currentUser} onSlotUpdate={setParkingSlots} />
        )}

        {currentUser.role === "attendant" && (
          <AttendantDashboard parkingSlots={parkingSlots} onSlotUpdate={setParkingSlots} />
        )}
      </main>
    </div>
  )
}