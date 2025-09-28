"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { User, Car, Phone, Mail, Edit, Save, X } from "lucide-react"

export function UserProfile({ currentUser, onUserUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState({
    name: currentUser.name || "",
    phone: currentUser.phone || "",
    vehicleNumber: currentUser.vehicleNumber || "",
    vehicleType: currentUser.vehicleType || "",
  })
  const [errors, setErrors] = useState({})

  const vehicleTypes = [
    { value: "car", label: "Car" },
    { value: "suv", label: "SUV" },
    { value: "motorcycle", label: "Motorcycle" },
    { value: "truck", label: "Truck" },
    { value: "van", label: "Van" },
    { value: "electric", label: "Electric Vehicle" },
  ]

  const handleSave = () => {
    const newErrors = {}
    if (currentUser.role === "user") {
      if (!editData.vehicleNumber) newErrors.vehicleNumber = "Vehicle number is required"
      if (!editData.vehicleType) newErrors.vehicleType = "Vehicle type is required"
      if (!editData.phone) newErrors.phone = "Phone number is required"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onUserUpdate({ ...currentUser, ...editData })
    setIsEditing(false)
    setErrors({})
  }

  const handleCancel = () => {
    setEditData({
      name: currentUser.name || "",
      phone: currentUser.phone || "",
      vehicleNumber: currentUser.vehicleNumber || "",
      vehicleType: currentUser.vehicleType || "",
    })
    setIsEditing(false)
    setErrors({})
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Sidebar Profile Card */}
      <Card className="md:col-span-1">
        <CardHeader className="text-center">
          <User className="mx-auto h-12 w-12 text-blue-600" />
          <CardTitle className="mt-2">{currentUser.name}</CardTitle>
          <p className="text-sm text-gray-500">{currentUser.email}</p>
          <Badge variant="outline" className="mt-2 capitalize">{currentUser.role}</Badge>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          {currentUser.role === "user" && (
            <>
              <p className="flex items-center justify-center gap-2 text-gray-700">
                <Phone className="h-4 w-4" /> {currentUser.phone || "Not provided"}
              </p>
              {currentUser.vehicleNumber && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="font-semibold text-blue-800">{currentUser.vehicleNumber}</p>
                  <p className="text-sm text-blue-600 capitalize">{currentUser.vehicleType}</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Editable Details */}
      <Card className="md:col-span-2">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Edit Information</CardTitle>
          {!isEditing ? (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Edit className="h-4 w-4 mr-2" /> Edit
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" /> Save
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Full Name */}
            <div className="space-y-2">
              <Label>Full Name</Label>
              {isEditing ? (
                <Input
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  placeholder="Enter your full name"
                />
              ) : (
                <p className="p-2 rounded bg-gray-50">{currentUser.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label>Email</Label>
              <p className="p-2 rounded bg-gray-50">{currentUser.email}</p>
            </div>

            {/* Phone */}
            {currentUser.role === "user" && (
              <div className="space-y-2">
                <Label>Phone Number</Label>
                {isEditing ? (
                  <div>
                    <Input
                      value={editData.phone}
                      onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                      placeholder="Enter your phone number"
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && <p className="text-sm text-red-600 mt-1">{errors.phone}</p>}
                  </div>
                ) : (
                  <p className="p-2 rounded bg-gray-50">{currentUser.phone || "Not provided"}</p>
                )}
              </div>
            )}

            {/* Vehicle Number */}
            {currentUser.role === "user" && (
              <div className="space-y-2">
                <Label>Vehicle Number</Label>
                {isEditing ? (
                  <div>
                    <Input
                      value={editData.vehicleNumber}
                      onChange={(e) =>
                        setEditData({ ...editData, vehicleNumber: e.target.value.toUpperCase() })
                      }
                      placeholder="e.g., ABC123"
                      className={errors.vehicleNumber ? "border-red-500" : ""}
                    />
                    {errors.vehicleNumber && <p className="text-sm text-red-600 mt-1">{errors.vehicleNumber}</p>}
                  </div>
                ) : (
                  <p className="p-2 rounded bg-gray-50">{currentUser.vehicleNumber || "Not provided"}</p>
                )}
              </div>
            )}

            {/* Vehicle Type */}
            {currentUser.role === "user" && (
              <div className="space-y-2">
                <Label>Vehicle Type</Label>
                {isEditing ? (
                  <div>
                    <Select
                      value={editData.vehicleType}
                      onValueChange={(value) => setEditData({ ...editData, vehicleType: value })}
                    >
                      <SelectTrigger className={errors.vehicleType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicleTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.vehicleType && <p className="text-sm text-red-600 mt-1">{errors.vehicleType}</p>}
                  </div>
                ) : (
                  <p className="p-2 rounded bg-gray-50">{currentUser.vehicleType || "Not specified"}</p>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
