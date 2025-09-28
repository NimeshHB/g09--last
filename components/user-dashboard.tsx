
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Car, Clock, MapPin, CreditCard, History, DollarSign, BarChart, Moon, Sun } from "lucide-react"
import { UserProfile } from "./user-profile"
import BookingForm from "./BookingFormWithPayment"
import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Document, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx"
import { Bar, Line, Pie } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from "chart.js"

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend)

export function UserDashboard({ parkingSlots, currentUser, onSlotUpdate }) {
  const [localParkingSlots, setLocalParkingSlots] = useState(parkingSlots)
  const [refresh, setRefresh] = useState(0)
  const [balance, setBalance] = useState(25.50)
  const [totalSpent, setTotalSpent] = useState(0)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [paymentMethods, setPaymentMethods] = useState([
    { id: 1, type: "Visa", last4: "1234", expiry: "12/25", cardType: "Credit" },
  ])
  const [billingHistory, setBillingHistory] = useState([])
  const [addFundsAmount, setAddFundsAmount] = useState("")
  const [newCard, setNewCard] = useState({ cardNumber: "", expiry: "", cvv: "", cardType: "Credit" })
  const [error, setError] = useState("")
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  const userBookings = localParkingSlots.filter((slot) => slot.bookedBy === currentUser.name)
  const availableSlots = localParkingSlots.filter((slot) => slot.status === "available").length
  const currentBooking = userBookings.find((slot) => slot.status === "occupied")

  // Sync local state with prop changes
  useEffect(() => {
    setLocalParkingSlots(parkingSlots)
  }, [parkingSlots])

  // Refresh UI every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh((prev) => prev + 1)
      console.log("UI refreshed at:", new Date().toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }))
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Open booking form function
  const handleBookSlot = () => {
    setShowBookingForm(true)
  }

  // Checkout function
  const handleCheckOut = async (slotId) => {
    setCheckoutLoading(true)
    setError("")

    try {
      // Make direct API call to checkout endpoint
      const response = await fetch(`/api/slots/${slotId}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: currentUser.id
        })
      })

      const result = await response.json()
      
      if (result.success) {
        // Calculate session details from the result
        const now = new Date()
        const slot = localParkingSlots.find(s => s.id === slotId)
        
        if (slot && slot.bookedAt) {
          const bookedAt = new Date(slot.bookedAt)
          const durationMinutes = Math.floor((now - bookedAt) / (1000 * 60))
          const durationHours = durationMinutes / 60
          const ratePerHour = 5 // $5 per hour
          const amount = Math.max(2.5, Math.round(durationHours * ratePerHour * 100) / 100) // Minimum $2.50 charge

          // Check balance
          if (balance < amount) {
            setError("Insufficient balance. Please add funds.")
            return
          }
          
          setBalance((prev) => prev - amount)

          // Add to billing history
          setBillingHistory((prev) => {
            const newHistory = [
              ...prev,
              {
                id: Date.now(),
                date: now.toISOString().split("T")[0],
                amount,
                description: `Slot ${slot.number} - ${getTimeElapsed(slot.bookedAt)}`,
                slotNumber: slot.number,
                vehicleNumber: slot.vehicleNumber || currentUser.vehicleNumber || "N/A",
                duration: getTimeElapsed(slot.bookedAt),
                startTime: bookedAt.toLocaleTimeString("en-GB", { hour12: true, timeZone: "Asia/Kolkata" }),
              },
            ]
            return newHistory
          })
          setTotalSpent((prev) => Math.round((prev + amount) * 100) / 100)
        }

        // Update local state with the response
        const updatedSlots = localParkingSlots.map((s) =>
          s.id === slotId ? {
            ...s,
            status: "available",
            bookedBy: null,
            vehicleNumber: null,
            bookedAt: null,
          } : s
        )

        setLocalParkingSlots(updatedSlots)
        onSlotUpdate(updatedSlots)
        
        console.log("Checked out slot:", slotId, "at", now.toLocaleString("en-GB", { timeZone: "Asia/Kolkata" }))
        
      } else {
        setError(result.error || "Failed to check out. Please try again.")
      }
    } catch (error) {
      console.error("Checkout error:", error)
      setError("Failed to check out. Please try again.")
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Calculate elapsed time
  const getTimeElapsed = (bookedAt) => {
    if (!bookedAt) return "0 minutes"
    const elapsed = Math.floor((new Date() - new Date(bookedAt)) / (1000 * 60))
    if (elapsed < 60) return `${elapsed} minute${elapsed !== 1 ? "s" : ""}`
    return `${Math.floor(elapsed / 60)} hour${Math.floor(elapsed / 60) !== 1 ? "s" : ""} ${elapsed % 60} minute${elapsed % 60 !== 1 ? "s" : ""}`
  }

  // Calculate current bill for active parking session
  const getCurrentBill = () => {
    if (!currentBooking) return null
    const bookedAt = new Date(currentBooking.bookedAt)
    const now = new Date() // July 24, 2025, 04:25 AM +0530
    const durationMinutes = Math.floor((now - bookedAt) / (1000 * 60))
    const durationHours = durationMinutes / 60
    const ratePerHour = 5 // $5 per hour
    const amount = Math.max(2.5, Math.round(durationHours * ratePerHour * 100) / 100) // Minimum $2.50 charge
    return {
      id: currentBooking.id,
      date: now.toISOString().split("T")[0], // e.g., "2025-07-24"
      amount,
      description: `Slot ${currentBooking.number} - ${getTimeElapsed(currentBooking.bookedAt)}`,
      slotNumber: currentBooking.number,
      vehicleNumber: currentBooking.vehicleNumber || currentUser.vehicleNumber || "N/A",
      duration: getTimeElapsed(currentBooking.bookedAt),
      startTime: bookedAt.toLocaleTimeString("en-GB", { hour12: true, timeZone: "Asia/Kolkata" }),
    }
  }

  // Generate Word bill
  const generateBillWord = (bill) => {
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text: "Parking Management System",
                bold: true,
                size: 32,
                font: "Arial",
              }),
            ],
            alignment: "center",
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Parking Bill Invoice",
                bold: true,
                size: 28,
                font: "Arial",
              }),
            ],
            alignment: "center",
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Issued to: ${currentUser.name}`,
                size: 24,
                font: "Arial",
              }),
            ],
            alignment: "center",
            spacing: { after: 100 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Date: ${new Date(bill.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })}`,
                size: 20,
                font: "Arial",
              }),
            ],
            alignment: "center",
            spacing: { after: 400 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Description", bold: true })] })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Value", bold: true })] })],
                    width: { size: 50, type: WidthType.PERCENTAGE },
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Customer Name" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: currentUser.name })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Vehicle Number" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: bill.vehicleNumber || "N/A" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Slot Number" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: bill.slotNumber })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Date" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: new Date(bill.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }) })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Description" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: bill.description })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Duration" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: bill.duration })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Start Time" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: bill.startTime })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: "Amount" })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ children: [new TextRun({ text: `$ ${bill.amount.toFixed(2)}` })] })],
                  }),
                ],
              }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Amount: $ ${bill.amount.toFixed(2)}`,
                bold: true,
                size: 24,
                font: "Arial",
              }),
            ],
            alignment: "center",
            spacing: { before: 400, after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "Thank you for using our parking services!",
                size: 20,
                font: "Arial",
              }),
            ],
            alignment: "center",
            spacing: { after: 200 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: "For any inquiries, please contact support@parking.com",
                size: 20,
                font: "Arial",
              }),
            ],
            alignment: "center",
          }),
        ],
      }],
    })

    Packer.toBlob(doc).then((blob) => {
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `bill_${bill.id}.docx`
      link.click()
      window.URL.revokeObjectURL(url)
    }).catch((error) => {
      console.error("Error generating Word document:", error)
      alert("Failed to generate bill. Please try again.")
    })
  }

  // Handle adding funds
  const handleAddFunds = () => {
    const amount = parseFloat(addFundsAmount)
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount")
      console.error("Add funds failed: Invalid amount", addFundsAmount)
      return
    }
    setBalance((prev) => prev + amount)
    setAddFundsAmount("")
    console.log("Added funds:", amount, "New balance:", balance + amount)
    alert(`Added $${amount.toFixed(2)} to your balance. New balance: $${(balance + amount).toFixed(2)}`)
  }

  // Handle adding a new payment method
  const handleAddPaymentMethod = (e) => {
    e.preventDefault()
    const { cardNumber, expiry, cvv, cardType } = newCard

    if (!cardNumber || !expiry || !cvv || !cardType) {
      setError("All fields are required")
      console.error("Add payment method failed: Missing fields", newCard)
      return
    }
    if (!/^\d{12,19}$/.test(cardNumber.replace(/\s/g, ""))) {
      setError("Invalid card number (12-19 digits)")
      console.error("Add payment method failed: Invalid card number", cardNumber)
      return
    }
    if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiry)) {
      setError("Invalid expiry date (MM/YY)")
      console.error("Add payment method failed: Invalid expiry", expiry)
      return
    }
    if (!/^\d{3,4}$/.test(cvv)) {
      setError("Invalid CVV (3-4 digits)")
      console.error("Add payment method failed: Invalid CVV", cvv)
      return
    }

    const last4 = cardNumber.slice(-4).padStart(4, "0")
    const newMethod = {
      id: Date.now(),
      type: cardType,
      last4,
      expiry,
      cardType,
    }
    setPaymentMethods((prev) => [...prev, newMethod])
    setNewCard({ cardNumber: "", expiry: "", cvv: "", cardType: "Credit" })
    setError("")
    console.log("Added payment method:", newMethod)
    alert("Payment method added successfully!")
  }

  // Prepare data for monthly analytics charts
  const getMonthlyAnalytics = () => {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ]
    const bookingsPerMonth = new Array(12).fill(0)
    const durationPerMonth = new Array(12).fill(0)
    const amountPerMonth = new Array(12).fill(0)

    billingHistory.forEach((bill) => {
      const date = new Date(bill.date)
      const month = date.getMonth() // 0-11
      bookingsPerMonth[month] += 1
      // Convert duration (e.g., "2 hours 15 minutes") to hours
      const durationMatch = bill.duration.match(/(\d+)\s*hour.*\s*(\d+)\s*minute/)
      const hours = durationMatch ? parseInt(durationMatch[1]) + parseInt(durationMatch[2]) / 60 : 0
      durationPerMonth[month] += hours
      amountPerMonth[month] += bill.amount
    })

    return {
      labels: months,
      bookings: bookingsPerMonth,
      durations: durationPerMonth,
      amounts: amountPerMonth,
    }
  }

  const analytics = getMonthlyAnalytics()

  // Bar chart for bookings per month
  const barChartData = {
    labels: analytics.labels,
    datasets: [{
      label: "Number of Bookings",
      data: analytics.bookings,
      backgroundColor: isDarkMode ? "rgba(96, 165, 250, 0.6)" : "rgba(59, 130, 246, 0.6)", // Light blue in dark mode
      borderColor: isDarkMode ? "#60A5FA" : "#3B82F6",
      borderWidth: 1,
    }],
  }

  // Line chart for duration per month
  const lineChartData = {
    labels: analytics.labels,
    datasets: [{
      label: "Total Duration (Hours)",
      data: analytics.durations,
      fill: false,
      borderColor: isDarkMode ? "#A78BFA" : "#8B5CF6", // Light purple in dark mode
      tension: 0.4,
    }],
  }

  // Pie chart for amount spent per month
  const pieChartData = {
    labels: analytics.labels.filter((_, i) => analytics.amounts[i] > 0),
    datasets: [{
      label: "Total Amount Spent ($)",
      data: analytics.amounts.filter(amount => amount > 0),
      backgroundColor: isDarkMode
        ? ["#60A5FA", "#9CA3AF", "#A78BFA", "#34D399", "#F87171", "#FBBF24", "#60A5FA", "#D1D5DB", "#8B5CF6", "#10B981", "#EF4444", "#F59E0B"]
        : ["#3B82F6", "#6B7280", "#8B5CF6", "#10B981", "#EF4444", "#F59E0B", "#3B82F6", "#D1D5DB", "#7C3AED", "#059669", "#DC2626", "#D97706"],
      borderColor: "#FFFFFF",
      borderWidth: 1,
    }],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: "top" },
      tooltip: { enabled: true },
    },
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? "dark bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-900"}`}>
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">My Dashboard</h2>
          <div className="flex items-center gap-4">
            <Badge variant="outline" className={isDarkMode ? "border-gray-600 text-gray-300" : "text-sm"}>
              Welcome, {currentUser.name}
            </Badge>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className={`border-none ${isDarkMode ? "bg-yellow-400 hover:bg-yellow-500" : "bg-gray-800 hover:bg-gray-700"}`}
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-gray-200" />}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
              <MapPin className={isDarkMode ? "text-green-400" : "text-green-500"} />
            </CardHeader>
            <CardContent>
              <div className={isDarkMode ? "text-green-400" : "text-green-600"}>{availableSlots}</div>
              <p className={isDarkMode ? "text-gray-400" : "text-muted-foreground"}>Ready for booking</p>
            </CardContent>
          </Card>

          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Booking</CardTitle>
              <Car className={isDarkMode ? "text-blue-400" : "text-blue-500"} />
            </CardHeader>
            <CardContent>
              <div className={isDarkMode ? "text-blue-400" : "text-blue-600"}>{currentBooking ? currentBooking.number : "None"}</div>
              <p className={isDarkMode ? "text-gray-400" : "text-muted-foreground"}>{currentBooking ? "Currently parked" : "No active booking"}</p>
            </CardContent>
          </Card>

          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">My Vehicle</CardTitle>
              <Car className={isDarkMode ? "text-purple-400" : "text-purple-500"} />
            </CardHeader>
            <CardContent>
              <div className={isDarkMode ? "text-purple-400" : ""}>{currentUser.vehicleNumber || "N/A"}</div>
              <p className={isDarkMode ? "text-gray-400" : "text-muted-foreground"} capitalize>{currentUser.vehicleType || "Not specified"}</p>
            </CardContent>
          </Card>

          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
              <History className={isDarkMode ? "text-purple-400" : "text-purple-500"} />
            </CardHeader>
            <CardContent>
              <div className={isDarkMode ? "text-purple-400" : ""}>{billingHistory.length}</div>
              <p className={isDarkMode ? "text-gray-400" : "text-muted-foreground"}>This month</p>
            </CardContent>
          </Card>
        </div>

        {/* Analytics Button */}
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="lg"
                className={`border-none ${isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"} text-white`}
              >
                <BarChart className="h-5 w-5 mr-2" />
                View Monthly Parking Analytics
              </Button>
            </DialogTrigger>
            <DialogContent className={`max-w-4xl max-h-[80vh] overflow-y-auto ${isDarkMode ? "bg-gray-900 border-gray-700" : "bg-gradient-to-r from-blue-50 to-purple-50 border-gray-200"}`}>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <BarChart className={isDarkMode ? "text-purple-400" : "text-purple-600"} />
                  Monthly Parking Analytics
                </DialogTitle>
                <DialogDescription>Visualize your parking activity for 2025</DialogDescription>
              </DialogHeader>
              {billingHistory.length === 0 ? (
                <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>No parking data available for analytics.</p>
              ) : (
                <div className="space-y-8 p-4">
                  {/* Bar Chart: Bookings per Month */}
                  <div>
                    <h4 className={isDarkMode ? "text-blue-400" : "text-blue-700"}>Bookings per Month</h4>
                    <div className="h-64">
                      <Bar data={barChartData} options={chartOptions} />
                    </div>
                  </div>

                  {/* Line Chart: Duration per Month */}
                  <div>
                    <h4 className={isDarkMode ? "text-purple-400" : "text-purple-700"}>Total Duration per Month (Hours)</h4>
                    <div className="h-64">
                      <Line data={lineChartData} options={chartOptions} />
                    </div>
                  </div>

                  {/* Pie Chart: Amount Spent per Month */}
                  <div>
                    <h4 className={isDarkMode ? "text-green-400" : "text-green-700"}>Total Amount Spent per Month ($)</h4>
                    <div className="h-64">
                      <Pie data={pieChartData} options={chartOptions} />
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Current Booking Status */}
        {currentBooking && (
          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "border-blue-200 bg-blue-50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className={isDarkMode ? "text-blue-400" : "text-blue-600"} />
                Active Parking Session
              </CardTitle>
              <CardDescription>You are currently parked in slot {currentBooking.number}</CardDescription>
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className={isDarkMode ? "text-gray-400" : "text-gray-700"}>Slot Number</p>
                    <p className={isDarkMode ? "text-blue-400" : "text-blue-600"}>{currentBooking.number}</p>
                  </div>
                  <div>
                    <p className={isDarkMode ? "text-gray-400" : "text-gray-700"}>Vehicle</p>
                    <p className={isDarkMode ? "text-purple-400" : ""}>{currentUser.vehicleNumber}</p>
                  </div>
                  <div>
                    <p className={isDarkMode ? "text-gray-400" : "text-gray-700"}>Duration</p>
                    <p className={isDarkMode ? "text-orange-400" : "text-orange-600"}>{getTimeElapsed(currentBooking.bookedAt)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className={isDarkMode ? "text-gray-400" : ""} />
                    Started at {new Date(currentBooking.bookedAt).toLocaleTimeString("en-GB", { hour12: true, timeZone: "Asia/Kolkata" })}
                  </div>
                  <Button 
                    onClick={() => handleCheckOut(currentBooking.id)} 
                    disabled={checkoutLoading}
                    className={isDarkMode ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700"}
                  >
                    {checkoutLoading ? "Checking out..." : "Check Out"}
                  </Button>
                </div>

                {/* Active Parking Bill Section */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <DollarSign className={isDarkMode ? "text-green-400" : "text-green-600"} />
                    Current Parking Bill
                  </h4>
                  {getCurrentBill() && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className={isDarkMode ? "text-gray-400" : "text-gray-700"}>Slot Number</p>
                          <p className={isDarkMode ? "text-blue-400" : "text-blue-600"}>{getCurrentBill().slotNumber}</p>
                        </div>
                        <div>
                          <p className={isDarkMode ? "text-gray-400" : "text-gray-700"}>Duration</p>
                          <p className={isDarkMode ? "text-orange-400" : "text-orange-600"}>{getCurrentBill().duration}</p>
                        </div>
                        <div>
                          <p className={isDarkMode ? "text-gray-400" : "text-gray-700"}>Estimated Amount</p>
                          <p className={isDarkMode ? "text-green-400" : "text-green-600"}>${getCurrentBill().amount.toFixed(2)}</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className={`mt-2 border-none ${isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"} text-white`}
                        onClick={() => generateBillWord(getCurrentBill())}
                      >
                        Get Bill
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
            <CardHeader>
              <CardTitle>Quick Book</CardTitle>
              <CardDescription>Find and book an available parking slot</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>{availableSlots} slots available for immediate booking</p>
                <Button
                  className={`w-full border-none ${isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"}`}
                  disabled={currentBooking || availableSlots === 0}
                  onClick={handleBookSlot}
                >
                  {currentBooking
                    ? "Already Parked"
                    : availableSlots === 0
                      ? "No Slots Available"
                      : "Book a Slot"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
            <CardHeader>
              <CardTitle>Booking History</CardTitle>
              <CardDescription>View your recent parking sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {billingHistory.length === 0 ? (
                  <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>No booking history available.</p>
                ) : (
                  billingHistory
                    .slice(0, showAllHistory ? billingHistory.length : 2)
                    .map((bill) => (
                      <div key={bill.id} className={isDarkMode ? "bg-gray-700" : "bg-gray-50"}>
                        <div className="flex items-center justify-between p-2 rounded">
                          <div>
                            <p className="font-medium text-sm">{bill.slotNumber}</p>
                            <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                              {new Date(bill.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })}, {bill.startTime}
                            </p>
                          </div>
                          <Badge variant="outline" className={isDarkMode ? "text-gray-400 border-gray-500" : "text-xs"}>
                            {bill.duration}
                          </Badge>
                        </div>
                      </div>
                    ))
                )}
                {billingHistory.length > 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className={`w-full ${isDarkMode ? "bg-transparent text-gray-400 hover:bg-gray-700" : "bg-transparent"}`}
                    onClick={() => setShowAllHistory(!showAllHistory)}
                  >
                    {showAllHistory ? "Show Less" : "View All History"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payment & Billing */}
        <Card className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className={isDarkMode ? "text-gray-400" : ""} />
              Payment & Billing
            </CardTitle>
            <CardDescription>Manage your payment methods and view billing history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className={isDarkMode ? "text-gray-400" : "font-medium"}>Current Balance</h4>
                <p className={isDarkMode ? "text-green-400" : "text-green-600"}>${balance.toFixed(2)}</p>
                <p className={isDarkMode ? "text-gray-500" : "text-sm text-gray-500"}>Available credit</p>
              </div>
              <div>
                <h4 className={isDarkMode ? "text-gray-400" : "font-medium"}>This Month</h4>
                <p className={isDarkMode ? "text-purple-400" : ""}>${totalSpent.toFixed(2)}</p>
                <p className={isDarkMode ? "text-gray-500" : "text-sm text-gray-500"}>Total spent</p>
              </div>
            </div>

            {/* Add Funds Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={`mt-4 border-none ${isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"} text-white`}
                >
                  Add Funds
                </Button>
              </DialogTrigger>
              <DialogContent className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
                <DialogHeader>
                  <DialogTitle>Add Funds</DialogTitle>
                  <DialogDescription>Enter the amount to add to your balance</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="addFunds">Amount ($)</Label>
                    <Input
                      id="addFunds"
                      type="number"
                      placeholder="Enter amount"
                      value={addFundsAmount}
                      onChange={(e) => setAddFundsAmount(e.target.value)}
                      min="0"
                      step="0.01"
                      className={isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : ""}
                    />
                  </div>
                  <Button
                    onClick={handleAddFunds}
                    disabled={!addFundsAmount}
                    className={isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"}
                  >
                    Add Funds
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            {/* Payment Methods */}
            <div className="mt-4">
              <h4 className={isDarkMode ? "text-gray-400" : "font-medium"}>Payment Methods</h4>
              {paymentMethods.map((method) => (
                <div key={method.id} className={isDarkMode ? "bg-gray-700 border-gray-600" : "border rounded mb-2"}>
                  <div className="flex items-center justify-between p-2">
                    <span className={isDarkMode ? "text-gray-300" : ""}>
                      {method.type} ({method.cardType}) ending in {method.last4} (Exp: {method.expiry})
                    </span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setPaymentMethods(paymentMethods.filter((m) => m.id !== method.id))}
                      className={isDarkMode ? "bg-red-800 hover:bg-red-900" : "bg-red-600 hover:bg-red-700"}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={`mt-2 border-none ${isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"} text-white`}
                  >
                    Add Payment Method
                  </Button>
                </DialogTrigger>
                <DialogContent className={isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}>
                  <DialogHeader>
                    <DialogTitle>Add Payment Method</DialogTitle>
                    <DialogDescription>Enter your card details</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddPaymentMethod} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardType">Card Type</Label>
                      <Select
                        value={newCard.cardType}
                        onValueChange={(value) => setNewCard({ ...newCard, cardType: value })}
                        className={isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : ""}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select card type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Credit">Credit</SelectItem>
                          <SelectItem value="Debit">Debit</SelectItem>
                          <SelectItem value="Prepaid">Prepaid</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={newCard.cardNumber}
                        onChange={(e) => setNewCard({ ...newCard, cardNumber: e.target.value.replace(/\D/g, "") })}
                        maxLength={19}
                        className={isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : ""}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date (MM/YY)</Label>
                        <Input
                          id="expiry"
                          type="text"
                          placeholder="MM/YY"
                          value={newCard.expiry}
                          onChange={(e) => setNewCard({ ...newCard, expiry: e.target.value })}
                          maxLength={5}
                          className={isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : ""}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvv">CVV</Label>
                        <Input
                          id="cvv"
                          type="text"
                          placeholder="123"
                          value={newCard.cvv}
                          onChange={(e) => setNewCard({ ...newCard, cvv: e.target.value.replace(/\D/g, "") })}
                          maxLength={4}
                          className={isDarkMode ? "bg-gray-700 border-gray-600 text-gray-100" : ""}
                        />
                      </div>
                    </div>
                    {error && <p className={isDarkMode ? "text-red-400" : "text-red-600"}>{error}</p>}
                    <Button
                      type="submit"
                      className={isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"}
                    >
                      Add Card
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Billing History */}
            <div className="mt-4">
              <h4 className={isDarkMode ? "text-gray-400" : "font-medium"}>Billing History</h4>
              {billingHistory.length === 0 ? (
                <p className={isDarkMode ? "text-gray-400" : "text-gray-600"}>No booking history available.</p>
              ) : (
                billingHistory
                  .slice(0, showAllHistory ? billingHistory.length : 2)
                  .map((bill) => (
                    <div key={bill.id} className={isDarkMode ? "bg-gray-700 border-gray-600" : "border rounded mb-2"}>
                      <div className="flex items-center justify-between p-2">
                        <div>
                          <p className="font-medium text-sm">{bill.description}</p>
                          <p className={isDarkMode ? "text-gray-400" : "text-gray-500"}>
                            {new Date(bill.date).toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" })} | Vehicle: {bill.vehicleNumber} | Start: {bill.startTime}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className={isDarkMode ? "text-green-400" : "text-sm font-bold"}>${bill.amount.toFixed(2)}</p>
                          <Button
                            variant="outline"
                            size="sm"
                            className={`border-none ${isDarkMode ? "bg-gradient-to-r from-blue-700 to-purple-700 hover:from-blue-800 hover:to-purple-800" : "bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"} text-white`}
                            onClick={() => generateBillWord(bill)}
                          >
                            Get Bill
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
              {billingHistory.length > 2 && (
                <Button
                  variant="outline"
                  size="sm"
                  className={`w-full ${isDarkMode ? "bg-transparent text-gray-400 hover:bg-gray-700" : "bg-transparent"}`}
                  onClick={() => setShowAllHistory(!showAllHistory)}
                >
                  {showAllHistory ? "Show Less" : "View All History"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* User Profile Management */}
        <UserProfile
          currentUser={currentUser}
          onUserUpdate={(updatedUser) => {
            console.log("User updated:", updatedUser)
          }}
        />
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
            onSuccess={() => setShowBookingForm(false)} 
            currentUser={currentUser}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}
