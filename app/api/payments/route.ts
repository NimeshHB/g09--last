import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Payment from '@/models/Payment'
import Booking from '@/models/Booking'

// GET /api/payments - Fetch payments with filtering and stats
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Check if stats are requested
    if (searchParams.get('stats') === 'true') {
      const stats = await Payment.aggregate([
        {
          $group: {
            _id: null,
            totalPayments: { $sum: 1 },
            totalAmount: { $sum: '$amount' },
            successfulPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
            },
            pendingPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
            },
            failedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
            },
            refundedPayments: {
              $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] }
            }
          }
        }
      ])

      return NextResponse.json({
        success: true,
        data: stats[0] || {
          totalPayments: 0,
          totalAmount: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          refundedPayments: 0
        }
      })
    }

    // Build query for regular payment listing
    let query: any = {}

    const status = searchParams.get('status')
    if (status) query.status = status

    const method = searchParams.get('method')
    if (method) query.method = method

    const userId = searchParams.get('userId')
    if (userId) query.userId = userId

    const bookingId = searchParams.get('bookingId')
    if (bookingId) query.bookingId = bookingId

    // Date range filters
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    if (dateFrom || dateTo) {
      query.createdAt = {}
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom)
      if (dateTo) query.createdAt.$lte = new Date(dateTo)
    }

    // Execute query with population
    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'name email phone')
        .populate('bookingId', 'slotId startTime endTime totalAmount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query)
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: payments,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        limit,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Payment fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

// POST /api/payments - Create new payment
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()
    const {
      bookingId,
      userId,
      amount,
      currency,
      method,
      description,
      transactionId,
      metadata
    } = data

    // Validate required fields
    if (!bookingId || !userId || !amount || !method) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Verify booking exists
    const booking = await Booking.findById(bookingId)
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Create payment
    const payment = new Payment({
      bookingId,
      userId,
      amount,
      currency: currency || 'USD',
      method,
      description: description || `Payment for booking ${bookingId}`,
      transactionId,
      metadata: metadata || {},
      status: 'pending'
    })

    await payment.save()

    // Update booking payment status
    await Booking.findByIdAndUpdate(bookingId, {
      paymentStatus: 'pending',
      paymentId: payment._id
    })

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Payment creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create payment' },
      { status: 500 }
    )
  }
}

// PATCH /api/payments - Update payment status
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()
    const { id, status, transactionId, metadata, refundReason } = data

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (status) updateData.status = status
    if (transactionId) updateData.transactionId = transactionId
    if (metadata) updateData.metadata = metadata

    // Handle refunds
    if (status === 'refunded' && refundReason) {
      updateData.refundReason = refundReason
      updateData.refundedAt = new Date()
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Update associated booking
    if (payment.bookingId && status) {
      let bookingStatus = 'confirmed'
      if (status === 'failed') bookingStatus = 'cancelled'
      if (status === 'refunded') bookingStatus = 'cancelled'

      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: status,
        status: bookingStatus
      })
    }

    return NextResponse.json({
      success: true,
      data: payment,
      message: 'Payment updated successfully'
    })

  } catch (error) {
    console.error('Payment update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

// DELETE /api/payments - Delete payment (admin only)
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Payment ID required' },
        { status: 400 }
      )
    }

    const payment = await Payment.findByIdAndDelete(id)
    if (!payment) {
      return NextResponse.json(
        { success: false, error: 'Payment not found' },
        { status: 404 }
      )
    }

    // Update associated booking
    if (payment.bookingId) {
      await Booking.findByIdAndUpdate(payment.bookingId, {
        paymentStatus: 'pending',
        paymentId: null
      })
    }

    return NextResponse.json({
      success: true,
      message: 'Payment deleted successfully'
    })

  } catch (error) {
    console.error('Payment deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}