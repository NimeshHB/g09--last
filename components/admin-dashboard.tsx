"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import AdminBookingManagement from './AdminBookingManagement'
import { BarChart3, Users, Car, TrendingUp, AlertTriangle, MessageCircle, Send, Calendar, Activity } from "lucide-react"
import { AdminManagement } from "./admin-management"
import { AdminActivityDashboard } from "./admin-activity-dashboard"
import { SlotManagement } from "./slot-management"
import { UserManagementDashboard } from "./user-management-dashboard"
import { useState, useEffect } from "react"
import { LoginForm } from "./login-form" // Adjust path as needed
import { useAnalytics } from "@/hooks/use-analytics"
import { useChat } from "@/hooks/use-chat"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTrigger,
} from "@/components/ui/dialog" // Ensure @radix-ui/react-dialog is installed
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area
} from "recharts"

interface ParkingSlot {
  id: string
  number: string
  status: 'available' | 'occupied' | 'blocked'
  vehicleNumber?: string
  bookedBy?: string
  bookedAt?: string
}

interface AdminDashboardProps {}

export function AdminDashboard({}: AdminDashboardProps) {
  const [parkingSlots, setParkingSlots] = useState<ParkingSlot[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch slots for dashboard statistics
  const fetchSlots = async () => {
    try {
      const response = await fetch('/api/slots')
      const data = await response.json()
      if (data.success) {
        const formattedSlots = data.slots.map((slot: any) => ({
          id: slot._id,
          number: slot.number,
          status: slot.status,
          vehicleNumber: slot.vehicleNumber,
          bookedBy: slot.bookedBy,
          bookedAt: slot.bookedAt
        }))
        setParkingSlots(formattedSlots)
      }
    } catch (error) {
      console.error('Failed to fetch slots:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSlots()
    // Refresh every 30 seconds for real-time updates
    const interval = setInterval(fetchSlots, 30000)
    return () => clearInterval(interval)
  }, [])

  const occupiedSlots = parkingSlots.filter((slot: ParkingSlot) => slot.status === "occupied").length
  const availableSlots = parkingSlots.filter((slot: ParkingSlot) => slot.status === "available").length
  const blockedSlots = parkingSlots.filter((slot: ParkingSlot) => slot.status === "blocked").length
  const occupancyRate = parkingSlots.length > 0 ? Math.round((occupiedSlots / parkingSlots.length) * 100) : 0

  // Real total users state
  const [totalUsers, setTotalUsers] = useState<number | null>(null)
  const [usersLoading, setUsersLoading] = useState(true)
  useEffect(() => {
    setUsersLoading(true)
    fetch('/api/users')
      .then(res => res.json())
      .then(data => {
        if (data.success && Array.isArray(data.users)) {
          setTotalUsers(data.users.length)
        } else {
          setTotalUsers(null)
        }
      })
      .catch(() => setTotalUsers(null))
      .finally(() => setUsersLoading(false))
  }, [])

  const recentBookings = parkingSlots
    .filter((slot: ParkingSlot) => slot.bookedAt)
    .sort((a: ParkingSlot, b: ParkingSlot) => new Date(b.bookedAt!).getTime() - new Date(a.bookedAt!).getTime())
    .slice(0, 5)

  // Use analytics hook
  const { monthlyData, weeklyData, userTypeData, revenueData, loading: analyticsLoading } = useAnalytics()

  // Use chat hook
  const {
    conversations,
    messages,
    selectedConversation,
    setSelectedConversation,
    sendMessage,
    loading: chatLoading
  } = useChat()

  // Chat state
  const [newMessage, setNewMessage] = useState('')

  const handleSendMessage = async () => {
    if (newMessage.trim() && selectedConversation) {
      const success = await sendMessage(selectedConversation, newMessage)
      if (success) {
        setNewMessage('')
      }
    }
  }

  const handleExportReport = () => {
    const headers = ["Slot Number,Status,Vehicle Number,Booked By,Booked At"]
    const rows = parkingSlots.map((slot) =>
      `${slot.number},${slot.status},${slot.vehicleNumber || ""},${slot.bookedBy || ""},${
        slot.bookedAt ? new Date(slot.bookedAt).toLocaleString() : ""
      }`
    )
    const csvContent = [headers, ...rows].join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `parking_report_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Admin Dashboard</h2>
        <Button variant="outline" onClick={handleExportReport}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Slots</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{parkingSlots.length}</div>
            <p className="text-xs text-muted-foreground">Parking capacity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupied</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{occupiedSlots}</div>
            <p className="text-xs text-muted-foreground">Currently parked</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{availableSlots}</div>
            <p className="text-xs text-muted-foreground">Ready for booking</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Occupancy Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground">Current utilization</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-9">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="slots">Slot Management</TabsTrigger>
          <TabsTrigger value="admins">Admin Management</TabsTrigger>
          <TabsTrigger value="activity">Admin Activity</TabsTrigger>
          <TabsTrigger value="bookings">Recent Bookings</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="space-y-4">
          {analyticsLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading analytics...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {usersLoading ? '...' : (totalUsers !== null ? totalUsers : 'N/A')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      +{monthlyData[monthlyData.length - 1]?.newUsers || 0} this month
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                    <Activity className="h-4 w-4 text-green-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {monthlyData[monthlyData.length - 1]?.activeUsers || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Current month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      ${revenueData?.totalRevenue || monthlyData[monthlyData.length - 1]?.revenue || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {revenueData?.totalBookings || monthlyData[monthlyData.length - 1]?.bookings || 0} bookings
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Avg. Session Time</CardTitle>
                    <Calendar className="h-4 w-4 text-purple-500" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {weeklyData.reduce((sum, day) => sum + day.avgDuration, 0) / weeklyData.length || 0}h
                    </div>
                    <p className="text-xs text-muted-foreground">Average duration</p>
                  </CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly User Activity</CardTitle>
                    <CardDescription>Track user registrations and activity over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(monthlyData) && monthlyData.length > 0 && monthlyData.some(m => m.newUsers > 0 || m.activeUsers > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area 
                            type="monotone" 
                            dataKey="newUsers" 
                            stackId="1" 
                            stroke="#8884d8" 
                            fill="#8884d8" 
                            name="New Users"
                          />
                          <Area 
                            type="monotone" 
                            dataKey="activeUsers" 
                            stackId="2" 
                            stroke="#82ca9d" 
                            fill="#82ca9d" 
                            name="Active Users"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-gray-500 mt-4">No monthly user activity data available</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>User Distribution</CardTitle>
                    <CardDescription>Breakdown of user types in the system</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Array.isArray(userTypeData) ? userTypeData.filter(u => u.value > 0) : []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {(Array.isArray(userTypeData) ? userTypeData.filter(u => u.value > 0) : []).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                    {(!userTypeData || userTypeData.length === 0 || userTypeData.every(u => u.value === 0)) && (
                      <div className="text-center text-gray-500 mt-4">No user data available</div>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Bookings & Revenue</CardTitle>
                    <CardDescription>Track bookings and revenue trends</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis yAxisId="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" dataKey="bookings" fill="#8884d8" name="Bookings" />
                        <Line 
                          yAxisId="right" 
                          type="monotone" 
                          dataKey="revenue" 
                          stroke="#ff7300" 
                          strokeWidth={3}
                          name="Revenue ($)"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Activity Pattern</CardTitle>
                    <CardDescription>Daily booking patterns and average duration</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {Array.isArray(weeklyData) && weeklyData.length > 0 && weeklyData.some(w => w.bookings > 0 || w.users > 0) ? (
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="day" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="bookings" fill="#8884d8" name="Bookings" />
                          <Bar dataKey="users" fill="#82ca9d" name="Unique Users" />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="text-center text-gray-500 mt-4">No weekly activity data available</div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="chat" className="space-y-4">
          {chatLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading conversations...</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Active Conversations ({conversations.length})
                  </CardTitle>
                  <CardDescription>Users currently seeking assistance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {conversations.map((conversation) => (
                      <div
                        key={conversation._id}
                        className={`p-3 rounded-lg cursor-pointer transition-colors ${
                          selectedConversation === conversation._id 
                            ? 'bg-blue-50 border-2 border-blue-200' 
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => setSelectedConversation(conversation._id || null)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="font-medium text-sm">{conversation.userName}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {conversation.lastMessageTime && 
                              new Date(conversation.lastMessageTime).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })
                            }
                          </span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 truncate">
                          {conversation.lastMessage || 'No messages yet'}
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>
                      Chat with {
                        selectedConversation 
                          ? conversations.find(c => c._id === selectedConversation)?.userName || 'User'
                          : 'Select a conversation'
                      }
                    </span>
                    {selectedConversation && (
                      <Badge variant="outline" className="text-green-600">Online</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>Provide real-time support to users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ScrollArea className="h-80 w-full rounded-md border p-4">
                    <div className="space-y-4">
                      {selectedConversation ? (
                        messages.map((message) => (
                          <div
                            key={message._id}
                            className={`flex ${message.senderType === 'admin' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                message.senderType === 'admin'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-gray-200 text-gray-900'
                              }`}
                            >
                              <p className="text-sm">{message.message}</p>
                              <p className={`text-xs mt-1 ${
                                message.senderType === 'admin' ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {new Date(message.timestamp).toLocaleTimeString([], { 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          Select a conversation to start chatting
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                  <div className="flex gap-2">
                    <Input
                      placeholder={selectedConversation ? "Type your message..." : "Select a conversation first"}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && selectedConversation && handleSendMessage()}
                      className="flex-1"
                      disabled={!selectedConversation}
                    />
                    <Button 
                      onClick={handleSendMessage} 
                      size="sm"
                      disabled={!selectedConversation || !newMessage.trim()}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Chat Statistics</CardTitle>
              <CardDescription>Overview of support interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{conversations.length}</div>
                  <p className="text-sm text-gray-600">Active Chats</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">156</div>
                  <p className="text-sm text-gray-600">Resolved Today</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">2.3m</div>
                  <p className="text-sm text-gray-600">Avg Response Time</p>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">94%</div>
                  <p className="text-sm text-gray-600">Satisfaction Rate</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <UserManagementDashboard 
            currentUser={{
              id: "1",
              name: "Admin User",
              role: "admin",
              permissions: ["all", "admins", "users", "slots", "analytics", "reports", "settings", "billing"]
            }}
          />
        </TabsContent>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Slot Status Distribution</CardTitle>
                <CardDescription>Current status of all parking slots</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                      <span className="text-sm">Available</span>
                    </div>
                    <Badge variant="outline">{availableSlots} slots</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                      <span className="text-sm">Occupied</span>
                    </div>
                    <Badge variant="outline">{occupiedSlots} slots</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                      <span className="text-sm">Blocked</span>
                    </div>
                    <Badge variant="outline">{blockedSlots} slots</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>System Alerts</CardTitle>
                <CardDescription>Important notifications and warnings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {occupancyRate > 80 && (
                    <div className="flex items-center gap-2 p-2 bg-yellow-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">High occupancy rate: {occupancyRate}%</span>
                    </div>
                  )}
                  {blockedSlots > 0 && (
                    <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">{blockedSlots} slots blocked for maintenance</span>
                    </div>
                  )}
                  {occupancyRate < 30 && (
                    <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-800">Low occupancy - good availability</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="slots" className="space-y-4">
          <SlotManagement />
        </TabsContent>

        <TabsContent value="admins" className="space-y-4">
          <AdminManagement 
            currentUser={{ 
              id: 1, 
              name: "Admin User", 
              role: "admin",
              adminLevel: "super",
              permissions: ["all", "admins", "users", "slots", "analytics", "reports", "settings", "billing"]
            }} 
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <AdminActivityDashboard />
        </TabsContent>

        <TabsContent value="bookings" className="space-y-4">
          <AdminBookingManagement />
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>Configure parking system parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Default Time Limit (hours)</label>
                    <input
                      type="number"
                      defaultValue="2"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Hourly Rate ($)</label>
                    <input
                      type="number"
                      defaultValue="5"
                      className="w-full mt-1 px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}