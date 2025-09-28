import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Booking from '@/models/Booking'
import User from '@/models/User'
import ParkingSlot from '@/models/ParkingSlot'
import mongoose from 'mongoose'

export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    switch (type) {
      case 'monthly':
        return NextResponse.json({ data: await getMonthlyData() })
      case 'weekly':
        return NextResponse.json({ data: await getWeeklyData() })
      case 'userTypes':
        return NextResponse.json({ data: await getUserTypeData() })
      case 'revenue':
        return NextResponse.json({ data: await getRevenueData() })
      case 'overview':
        return NextResponse.json({ data: await getOverviewData() })
      case 'trends':
        return NextResponse.json({ data: await getTrendsData() })
      default:
        return NextResponse.json({ data: await getAllAnalytics() })
    }
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics data' },
      { status: 500 }
    )
  }
}

async function getMonthlyData() {
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - 11) // Last 12 months
  startDate.setDate(1)
  startDate.setHours(0, 0, 0, 0)

  const monthlyStats = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        bookings: { $sum: 1 },
        revenue: { $sum: '$totalAmount' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ])

  // Get user registration data for the same period
  const userStats = await User.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        newUsers: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ])

  // Get active users (users who made bookings)
  const activeUserStats = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          userId: '$userId'
        }
      }
    },
    {
      $group: {
        _id: {
          year: '$_id.year',
          month: '$_id.month'
        },
        activeUsers: { $sum: 1 }
      }
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 }
    }
  ])

  // Generate last 12 months
  const months = []
  for (let i = 11; i >= 0; i--) {
    const date = new Date()
    date.setMonth(date.getMonth() - i)
    months.push({
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      name: date.toLocaleDateString('en-US', { month: 'short' })
    })
  }

  return months.map(month => {
    const bookingData = monthlyStats.find(s => 
      s._id.year === month.year && s._id.month === month.month
    ) || { bookings: 0, revenue: 0, avgDuration: 0 }
    
    const userData = userStats.find(u => 
      u._id.year === month.year && u._id.month === month.month
    ) || { newUsers: 0 }
    
    const activeData = activeUserStats.find(a => 
      a._id.year === month.year && a._id.month === month.month
    ) || { activeUsers: 0 }

    return {
      month: month.name,
      newUsers: userData.newUsers,
      activeUsers: activeData.activeUsers,
      bookings: bookingData.bookings,
      revenue: Math.round(bookingData.revenue || 0),
      avgDuration: Math.round((bookingData.avgDuration || 0) * 10) / 10
    }
  })
}

async function getWeeklyData() {
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 6) // Last 7 days
  startDate.setHours(0, 0, 0, 0)

  const weeklyStats = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: {
          dayOfWeek: { $dayOfWeek: '$createdAt' }
        },
        bookings: { $sum: 1 },
        users: { $addToSet: '$userId' },
        avgDuration: { $avg: '$duration' }
      }
    },
    {
      $addFields: {
        users: { $size: '$users' }
      }
    },
    {
      $sort: { '_id.dayOfWeek': 1 }
    }
  ])

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  
  return dayNames.map((day, index) => {
    const dayData = weeklyStats.find(s => s._id.dayOfWeek === index + 1) || 
                   { bookings: 0, users: 0, avgDuration: 0 }
    
    return {
      day,
      bookings: dayData.bookings,
      users: dayData.users,
      avgDuration: Math.round((dayData.avgDuration || 0) * 10) / 10
    }
  })
}

async function getUserTypeData() {
  const userCounts = await User.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 }
      }
    }
  ])

  const colors = {
    user: '#8884d8',
    admin: '#82ca9d', 
    attendant: '#ffc658',
    manager: '#ff7c7c'
  }

  return userCounts.map(item => ({
    name: item._id === 'user' ? 'Users' : 
          item._id === 'admin' ? 'Admins' :
          item._id === 'attendant' ? 'Attendants' : 'Managers',
    value: item.count,
    color: colors[item._id as keyof typeof colors] || '#8884d8'
  }))
}

async function getRevenueData() {
  const currentMonth = new Date()
  currentMonth.setDate(1)
  currentMonth.setHours(0, 0, 0, 0)

  const revenueStats = await Booking.aggregate([
    {
      $match: {
        createdAt: { $gte: currentMonth },
        paymentStatus: 'paid'
      }
    },
    {
      $group: {
        _id: null,
        totalRevenue: { $sum: '$totalAmount' },
        totalBookings: { $sum: 1 },
        avgBookingValue: { $avg: '$totalAmount' }
      }
    }
  ])

  if (revenueStats.length === 0) {
    return {
      totalRevenue: 0,
      totalBookings: 0,
      avgBookingValue: 0
    }
  }

  const stats = revenueStats[0]
  return {
    totalRevenue: Math.round(stats.totalRevenue || 0),
    totalBookings: stats.totalBookings || 0,
    avgBookingValue: Math.round((stats.avgBookingValue || 0) * 100) / 100
  }
}

async function getOverviewData() {
  const [totalUsers, totalBookings, totalSlots, revenueData] = await Promise.all([
    User.countDocuments(),
    Booking.countDocuments(),
    ParkingSlot.countDocuments(),
    getRevenueData()
  ])

  // Get current month bookings for growth calculation
  const currentMonth = new Date()
  currentMonth.setDate(1)
  const currentMonthBookings = await Booking.countDocuments({
    createdAt: { $gte: currentMonth }
  })

  // Get previous month for comparison
  const previousMonth = new Date(currentMonth)
  previousMonth.setMonth(previousMonth.getMonth() - 1)
  const previousMonthBookings = await Booking.countDocuments({
    createdAt: { 
      $gte: previousMonth,
      $lt: currentMonth
    }
  })

  const growthRate = previousMonthBookings > 0 
    ? Math.round(((currentMonthBookings - previousMonthBookings) / previousMonthBookings) * 100)
    : 0

  return {
    totalUsers,
    totalBookings,
    totalSlots,
    currentMonthBookings,
    growthRate,
    totalRevenue: revenueData.totalRevenue,
    avgBookingValue: revenueData.avgBookingValue
  }
}

async function getTrendsData() {
  const last30Days = new Date()
  last30Days.setDate(last30Days.getDate() - 30)

  const [bookingTrends, revenueTrends, slotUtilization] = await Promise.all([
    // Booking trends
    Booking.aggregate([
      {
        $match: { createdAt: { $gte: last30Days } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    
    // Revenue trends
    Booking.aggregate([
      {
        $match: { 
          createdAt: { $gte: last30Days },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { '_id': 1 } }
    ]),
    
    // Slot utilization
    ParkingSlot.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ])
  ])

  return {
    bookingTrends,
    revenueTrends,
    slotUtilization
  }
}

async function getAllAnalytics() {
  const [monthly, weekly, userTypes, revenue, overview, trends] = await Promise.all([
    getMonthlyData(),
    getWeeklyData(),
    getUserTypeData(),
    getRevenueData(),
    getOverviewData(),
    getTrendsData()
  ])

  return {
    monthly,
    weekly,
    userTypes,
    revenue,
    overview,
    trends
  }
}