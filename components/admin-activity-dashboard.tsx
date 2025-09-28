"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Activity, 
  Clock, 
  Shield, 
  User, 
  Calendar, 
  AlertCircle, 
  Loader2, 
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserX,
  Settings
} from "lucide-react"
import { format, formatDistanceToNow } from "date-fns"

export interface AdminActivityData {
  logs: {
    id: string;
    adminName: string;
    adminEmail: string;
    adminLevel: string;
    status: string;
    lastLogin: string | null;
    lastActivity: string | null;
    daysSinceLastLogin: number;
    createdAt: string;
    actions: {
      action: string;
      timestamp: string;
      status: string;
      details: string;
    }[];
  }[];
  stats: {
    totalAdmins: number;
    activeAdmins: number;
    superAdmins: number;
    recentLogins: number;
  };
}

export function AdminActivityDashboard() {
  const [activityData, setActivityData] = useState<AdminActivityData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterPeriod, setFilterPeriod] = useState("7")
  const [filterType, setFilterType] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  const fetchActivityData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/admin/activity')
      const data = await response.json()
      
      if (data.success) {
        setActivityData(data.data)
      } else {
        throw new Error(data.error || 'Failed to fetch activity data')
      }
    } catch (err) {
      console.error('Error fetching activity data:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchActivityData()
  }, [])

  const filteredLogs = activityData?.logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.adminName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.adminEmail.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || !filterType || log.status === filterType
    
    const matchesPeriod = () => {
      if (!filterPeriod || filterPeriod === 'all') return true
      const days = parseInt(filterPeriod)
      const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      const activityDate = log.lastActivity ? new Date(log.lastActivity) : new Date(log.createdAt)
      return activityDate >= cutoffDate
    }
    
    return matchesSearch && matchesType && matchesPeriod()
  }) || []

  const getActivityStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getAdminLevelColor = (level: string) => {
    switch (level) {
      case 'super': return 'bg-purple-100 text-purple-800'
      case 'manager': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading activity data...</span>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load activity data: {error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Admin Activity Dashboard</h2>
          <p className="text-gray-600">Monitor admin activities and security events</p>
        </div>
        <Button onClick={fetchActivityData} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Activity Stats */}
      {activityData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Admins</CardTitle>
              <Shield className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activityData.stats.totalAdmins}</div>
              <p className="text-xs text-muted-foreground">Registered administrators</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Admins</CardTitle>
              <UserCheck className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activityData.stats.activeAdmins}</div>
              <p className="text-xs text-muted-foreground">Currently active</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Super Admins</CardTitle>
              <Settings className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">{activityData.stats.superAdmins}</div>
              <p className="text-xs text-muted-foreground">Full access level</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Logins</CardTitle>
              <TrendingUp className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{activityData.stats.recentLogins}</div>
              <p className="text-xs text-muted-foreground">Last 7 days</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Admin Activity Log
          </CardTitle>
          <CardDescription>Recent admin activities and login history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <Input
              placeholder="Search by admin name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
            
            <Select value={filterType} onValueChange={(value) => setFilterType(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPeriod} onValueChange={(value) => setFilterPeriod(value)}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Time Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Last 24 hours</SelectItem>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Activity Log */}
          <div className="space-y-4">
            {filteredLogs.length > 0 ? (
              filteredLogs.map((log) => (
                <div key={log.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
                        <User className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium">{log.adminName}</p>
                        <p className="text-sm text-gray-600">{log.adminEmail}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge className={getActivityStatusColor(log.status)}>
                        {log.status}
                      </Badge>
                      <Badge className={getAdminLevelColor(log.adminLevel)}>
                        {log.adminLevel}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Last Login:</span>
                      <span>
                        {log.lastLogin 
                          ? formatDistanceToNow(new Date(log.lastLogin), { addSuffix: true })
                          : "Never"
                        }
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Days Since Login:</span>
                      <span className={log.daysSinceLastLogin > 30 ? "text-red-600" : "text-green-600"}>
                        {log.daysSinceLastLogin} days
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-gray-600">Created:</span>
                      <span>{format(new Date(log.createdAt), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>

                  {/* Recent Actions */}
                  {log.actions.length > 0 && (
                    <div className="border-t pt-3">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Activity</h4>
                      <div className="space-y-1">
                        {log.actions.slice(0, 3).map((action, index) => (
                          <div key={index} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${
                                action.status === 'success' ? 'bg-green-500' : 
                                action.status === 'inactive' ? 'bg-red-500' : 'bg-gray-500'
                              }`} />
                              <span>{action.action}</span>
                              <span className="text-gray-500">-</span>
                              <span className="text-gray-500">{action.details}</span>
                            </div>
                            <span className="text-gray-400">
                              {formatDistanceToNow(new Date(action.timestamp), { addSuffix: true })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No activity found for the selected filters</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}