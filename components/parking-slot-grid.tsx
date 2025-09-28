import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Car, Clock, User } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import BookingForm from "./BookingForm"

export function ParkingSlotGrid({ slots, onSlotUpdate, userRole, currentUser }: any) {
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null)

  const handleSlotAction = (slotId: string, action: string) => {
    if (action === "book") {
      // Set the selected slot and open BookingForm dialog
      setSelectedSlotId(slotId)
      setShowBookingForm(true)
      return
    }
    
    const updatedSlots = slots.map((slot: any) => {
      if (slot.id === slotId) {
        switch (action) {
          case "free":
            return {
              ...slot,
              status: "available",
              bookedBy: null,
              vehicleNumber: null,
              vehicleType: null,
              bookedAt: null,
            }
          case "block":
            return {
              ...slot,
              status: "blocked",
              bookedBy: "Maintenance",
              vehicleNumber: null,
              vehicleType: null,
              bookedAt: new Date(),
            }
          default:
            return slot
        }
      }
      return slot
    })
    onSlotUpdate(updatedSlots)
  }

  const getSlotColor = (status: string) => {
    switch (status) {
      case "available":
        return "bg-green-100 border-green-300 hover:bg-green-200"
      case "occupied":
        return "bg-red-100 border-red-300"
      case "reserved":
        return "bg-yellow-100 border-yellow-300"
      case "blocked":
        return "bg-gray-100 border-gray-300"
      default:
        return "bg-gray-100 border-gray-300"
    }
  }

  const getTimeElapsed = (bookedAt: string) => {
    if (!bookedAt) return null
    const elapsed = Math.floor((new Date().getTime() - new Date(bookedAt).getTime()) / (1000 * 60))
    if (elapsed < 60) return `${elapsed}m`
    return `${Math.floor(elapsed / 60)}h ${elapsed % 60}m`
  }

  return (
    <>
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {slots.map((slot: any) => (
        <Card
          key={slot.id}
          className={cn("relative transition-all duration-200 cursor-pointer", getSlotColor(slot.status))}
        >
          <CardContent className="p-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-2">
                <Car
                  className={cn(
                    "h-8 w-8",
                    slot.status === "available"
                      ? "text-green-600"
                      : slot.status === "occupied"
                        ? "text-red-600"
                        : slot.status === "blocked"
                          ? "text-gray-600"
                          : "text-yellow-600",
                  )}
                />
              </div>

              <h3 className="font-bold text-lg mb-1">
                {slot.slotName || slot.number}
              </h3>

              <Badge variant={slot.status === "available" ? "default" : "secondary"} className="mb-2 capitalize">
                {slot.status}
              </Badge>

              {slot.vehicleNumber && <p className="text-xs text-gray-600 mb-1">🚗 {slot.vehicleNumber}</p>}

              {slot.bookedBy && (
                <p className="text-xs text-gray-600 mb-1">
                  <User className="inline h-3 w-3 mr-1" />
                  {slot.bookedBy}
                </p>
              )}

              {slot.bookedAt && (
                <p className="text-xs text-gray-500 mb-2">
                  <Clock className="inline h-3 w-3 mr-1" />
                  {getTimeElapsed(slot.bookedAt)}
                </p>
              )}

              {/* Action Buttons based on role */}
              <div className="space-y-1">
                {userRole === "user" && slot.status === "available" && (
                  <Button size="sm" className="w-full text-xs" onClick={() => handleSlotAction(slot.id, "book")}>
                    Book Now
                  </Button>
                )}

                {userRole === "admin" && (
                  <div className="space-y-1">
                    {slot.status === "occupied" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs bg-transparent"
                        onClick={() => handleSlotAction(slot.id, "free")}
                      >
                        Free Slot
                      </Button>
                    )}
                    {slot.status === "available" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full text-xs"
                        onClick={() => handleSlotAction(slot.id, "block")}
                      >
                        Block
                      </Button>
                    )}
                  </div>
                )}

                {userRole === "attendant" && slot.status === "occupied" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs bg-transparent"
                    onClick={() => handleSlotAction(slot.id, "free")}
                  >
                    Check Out
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Booking Form Dialog */}
    <Dialog open={showBookingForm} onOpenChange={setShowBookingForm}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book a Parking Slot</DialogTitle>
          <DialogDescription>
            Select your preferred slot and complete your booking
          </DialogDescription>
        </DialogHeader>
        <BookingForm 
          onSuccess={() => {
            setShowBookingForm(false)
            setSelectedSlotId(null)
          }} 
          currentUser={currentUser}
          preSelectedSlotId={selectedSlotId}
        />
      </DialogContent>
    </Dialog>
    </>
  )
}