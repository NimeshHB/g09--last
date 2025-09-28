import { useState, useEffect } from 'react'

interface MonthlyData {
  month: string
  newUsers: number
  activeUsers: number
  bookings: number
  revenue: number
  avgDuration: number
}

interface WeeklyData {
  day: string
  bookings: number
  users: number
  avgDuration: number
}

interface UserTypeData {
  name: string
  value: number
  color: string
}

interface RevenueData {
  totalRevenue: number
  totalBookings: number
  avgBookingValue: number
}

interface OverviewData {
  totalUsers: number
  totalBookings: number
  totalSlots: number
  currentMonthBookings: number
  growthRate: number
  totalRevenue: number
  avgBookingValue: number
}

interface TrendsData {
  bookingTrends: Array<{ _id: string; bookings: number }>
  revenueTrends: Array<{ _id: string; revenue: number }>
  slotUtilization: Array<{ _id: string; count: number }>
}

export function useAnalytics() {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [weeklyData, setWeeklyData] = useState<WeeklyData[]>([])
  const [userTypeData, setUserTypeData] = useState<UserTypeData[]>([])
  const [revenueData, setRevenueData] = useState<RevenueData | null>(null)
  const [overviewData, setOverviewData] = useState<OverviewData | null>(null)
  const [trendsData, setTrendsData] = useState<TrendsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch all analytics data in parallel
      const [monthlyRes, weeklyRes, userTypesRes, revenueRes, overviewRes, trendsRes] = await Promise.all([
        fetch('/api/analytics?type=monthly'),
        fetch('/api/analytics?type=weekly'),
        fetch('/api/analytics?type=userTypes'),
        fetch('/api/analytics?type=revenue'),
        fetch('/api/analytics?type=overview'),
        fetch('/api/analytics?type=trends')
      ])

      if (!monthlyRes.ok || !weeklyRes.ok || !userTypesRes.ok || !revenueRes.ok || !overviewRes.ok || !trendsRes.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const monthly = await monthlyRes.json()
      const weekly = await weeklyRes.json()
      const userTypes = await userTypesRes.json()
      const revenue = await revenueRes.json()
      const overview = await overviewRes.json()
      const trends = await trendsRes.json()

      setMonthlyData(monthly.data || [])
      setWeeklyData(weekly.data || [])
      setUserTypeData(userTypes.data || [])
      setRevenueData(revenue.data || null)
      setOverviewData(overview.data || null)
      setTrendsData(trends.data || null)
    } catch (err) {
      console.error('Analytics fetch error:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      
      // Set fallback data if API fails
      setMonthlyData([
        { month: 'Jan', newUsers: 45, activeUsers: 150, bookings: 420, revenue: 2100, avgDuration: 2.5 },
        { month: 'Feb', newUsers: 52, activeUsers: 165, bookings: 380, revenue: 1900, avgDuration: 2.3 },
        { month: 'Mar', newUsers: 38, activeUsers: 178, bookings: 450, revenue: 2250, avgDuration: 2.8 },
        { month: 'Apr', newUsers: 67, activeUsers: 192, bookings: 520, revenue: 2600, avgDuration: 3.1 },
        { month: 'May', newUsers: 74, activeUsers: 215, bookings: 480, revenue: 2400, avgDuration: 2.7 },
        { month: 'Jun', newUsers: 89, activeUsers: 238, bookings: 550, revenue: 2750, avgDuration: 3.2 },
        { month: 'Jul', newUsers: 95, activeUsers: 255, bookings: 600, revenue: 3000, avgDuration: 3.5 },
        { month: 'Aug', newUsers: 102, activeUsers: 278, bookings: 580, revenue: 2900, avgDuration: 3.0 },
      ])
      
      setWeeklyData([
        { day: 'Mon', bookings: 45, users: 32, avgDuration: 2.5 },
        { day: 'Tue', bookings: 52, users: 38, avgDuration: 2.8 },
        { day: 'Wed', bookings: 48, users: 35, avgDuration: 2.3 },
        { day: 'Thu', bookings: 61, users: 42, avgDuration: 3.1 },
        { day: 'Fri', bookings: 78, users: 55, avgDuration: 3.5 },
        { day: 'Sat', bookings: 85, users: 62, avgDuration: 4.2 },
        { day: 'Sun', bookings: 67, users: 48, avgDuration: 3.8 },
      ])
      
      setUserTypeData([
        { name: 'Users', value: 245, color: '#8884d8' },
        { name: 'Admins', value: 12, color: '#82ca9d' },
        { name: 'Attendants', value: 18, color: '#ffc658' },
      ])
      
      setRevenueData({
        totalRevenue: 2900,
        totalBookings: 580,
        avgBookingValue: 5.0
      })

      setOverviewData({
        totalUsers: 275,
        totalBookings: 580,
        totalSlots: 50,
        currentMonthBookings: 85,
        growthRate: 12,
        totalRevenue: 2900,
        avgBookingValue: 5.0
      })

      setTrendsData({
        bookingTrends: [],
        revenueTrends: [],
        slotUtilization: [
          { _id: 'available', count: 25 },
          { _id: 'occupied', count: 20 },
          { _id: 'blocked', count: 5 }
        ]
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
    const interval = setInterval(fetchAnalytics, 30000) // 30 seconds
    return () => clearInterval(interval)
  }, [])

  return {
    monthlyData,
    weeklyData,
    userTypeData,
    revenueData,
    overviewData,
    trendsData,
    loading,
    error,
    refetch: fetchAnalytics
  }
}