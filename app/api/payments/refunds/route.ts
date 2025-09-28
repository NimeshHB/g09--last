import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Payment from '@/models/Payment'
import Booking from '@/models/Booking'
import { checkAuth } from '@/lib/auth'

// POST /api/payments/refunds - Create a refund
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const { user } = await checkAuth(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { paymentId, refundAmount, refundReason } = data

    // Validate required fields
    if (!paymentId || !refundAmount || !refundReason) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find payment
    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Check if refund is possible
    if (!payment.canRefund(refundAmount)) {
      return NextResponse.json(
        { success: false, error: 'Refund amount exceeds refundable amount' },
        { status: 400 }
      )
    }

    // Generate refund ID
    const refundId = `REF_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    // Add refund to payment
    payment.addRefund({
      refundId,
      refundAmount,
      refundReason
    })

    await payment.save()

    // Update booking if fully refunded
    if (payment.paymentStatus === 'refunded') {
      const booking = await Booking.findById(payment.bookingId)
      if (booking) {
        booking.paymentStatus = 'refunded'
        booking.status = 'cancelled'
        await booking.save()
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        refundId,
        refundAmount,
        refundStatus: 'pending',
        payment
      },
      message: 'Refund initiated successfully'
    }, { status: 201 })

  } catch (error: any) {
    console.error('Refund creation error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create refund' },
      { status: 500 }
    )
  }
}

// GET /api/payments/refunds - Get refunds with filtering
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { user } = await checkAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build query
    let query: any = {
      refundDetails: { $exists: true, $ne: [] }
    }

    // If not admin, only show user's refunds
    if (user.role !== 'admin') {
      query.userId = user.id
    }

    // Filters
    const paymentId = searchParams.get('paymentId')
    if (paymentId) query._id = paymentId

    const refundStatus = searchParams.get('refundStatus')
    if (refundStatus) {
      query['refundDetails.refundStatus'] = refundStatus
    }

    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    if (startDate || endDate) {
      const dateQuery: any = {}
      if (startDate) dateQuery.$gte = new Date(startDate)
      if (endDate) dateQuery.$lte = new Date(endDate)
      query['refundDetails.refundDate'] = dateQuery
    }

    // Get payments with refunds
    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate('bookingId', 'slotNumber vehicleNumber startTime endTime')
        .populate('userId', 'name email')
        .sort({ 'refundDetails.refundDate': -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query)
    ])

    // Flatten refunds data
    const refunds = []
    for (const payment of payments) {
      for (const refund of payment.refundDetails || []) {
        refunds.push({
          ...refund.toObject(),
          paymentId: payment._id,
          originalAmount: payment.amount,
          booking: payment.bookingId,
          user: payment.userId,
          currency: payment.currency
        })
      }
    }

    // Calculate statistics for admin
    let statistics = null
    if (user.role === 'admin') {
      const stats = await Payment.aggregate([
        { $match: query },
        { $unwind: '$refundDetails' },
        {
          $group: {
            _id: null,
            totalRefunds: { $sum: 1 },
            totalRefundAmount: { $sum: '$refundDetails.refundAmount' },
            avgRefundAmount: { $avg: '$refundDetails.refundAmount' },
            pendingRefunds: {
              $sum: { $cond: [{ $eq: ['$refundDetails.refundStatus', 'pending'] }, 1, 0] }
            },
            completedRefunds: {
              $sum: { $cond: [{ $eq: ['$refundDetails.refundStatus', 'completed'] }, 1, 0] }
            },
            failedRefunds: {
              $sum: { $cond: [{ $eq: ['$refundDetails.refundStatus', 'failed'] }, 1, 0] }
            }
          }
        }
      ])

      if (stats.length > 0) {
        statistics = stats[0]
        delete statistics._id
      }
    }

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: refunds,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      statistics
    })

  } catch (error) {
    console.error('Refunds fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch refunds' },
      { status: 500 }
    )
  }
}

// PATCH /api/payments/refunds - Update refund status
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()
    
    const { user } = await checkAuth(request)
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { paymentId, refundId, refundStatus } = data

    if (!paymentId || !refundId || !refundStatus) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Find and update the specific refund
    const refund = payment.refundDetails?.find((r: any) => r.refundId === refundId)
    if (!refund) {
      return NextResponse.json(
        { success: false, error: 'Refund not found' },
        { status: 404 }
      )
    }

    refund.refundStatus = refundStatus
    await payment.save()

    return NextResponse.json({
      success: true,
      data: refund,
      message: 'Refund status updated successfully'
    })

  } catch (error) {
    console.error('Refund update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update refund' },
      { status: 500 }
    )
  }
}