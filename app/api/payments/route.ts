import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Payment from '@/models/Payment'
import Booking from '@/models/Booking'

// Helper: uniform JSON responses
const json = (body: any, status = 200) => NextResponse.json(body, { status })

// Helper: build a mongoose query object from URLSearchParams
function buildQuery(searchParams: URLSearchParams) {
  const q: any = {}
  const status = searchParams.get('status')
  const method = searchParams.get('method')
  const userId = searchParams.get('userId')
  const bookingId = searchParams.get('bookingId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  if (status) q.status = status
  if (method) q.method = method
  if (userId) q.userId = userId
  if (bookingId) q.bookingId = bookingId

  if (dateFrom || dateTo) {
    q.createdAt = {}
    if (dateFrom) {
      const d = new Date(dateFrom)
      if (!Number.isNaN(d.getTime())) q.createdAt.$gte = d
    }
    if (dateTo) {
      const d = new Date(dateTo)
      if (!Number.isNaN(d.getTime())) q.createdAt.$lte = d
    }
  }

  return q
}

// Helper: stats aggregation pipeline (kept simple and efficient)
function paymentsStatsPipeline() {
  return [
    {
      $group: {
        _id: null,
        totalPayments: { $sum: 1 },
        totalAmount: { $sum: '$amount' },
        successfulPayments: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        pendingPayments: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        failedPayments: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        refundedPayments: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, 1, 0] } }
      }
    }
  ]
}

// GET /api/payments
export async function GET(request: NextRequest) {
  await dbConnect()

  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '10'))
    const skip = (page - 1) * limit

    if (searchParams.get('stats') === 'true') {
      const [stats] = await Payment.aggregate(paymentsStatsPipeline())

      return json({
        success: true,
        data: stats || {
          totalPayments: 0,
          totalAmount: 0,
          successfulPayments: 0,
          pendingPayments: 0,
          failedPayments: 0,
          refundedPayments: 0
        }
      })
    }

    const query = buildQuery(searchParams)

    const [payments, totalCount] = await Promise.all([
      Payment.find(query)
        .populate('userId', 'name email phone')
        .populate('bookingId', 'slotId startTime endTime totalAmount')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Payment.countDocuments(query)
    ])

    const totalPages = Math.ceil(totalCount / limit) || 1

    return json({
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
  } catch (err) {
    console.error('GET /api/payments error:', err)
    return json({ success: false, error: 'Failed to fetch payments' }, 500)
  }
}

// POST /api/payments
export async function POST(request: NextRequest) {
  await dbConnect()

  try {
    const body = await request.json()
    const { bookingId, userId, amount, currency = 'USD', method, description, transactionId, metadata = {} } = body || {}

    if (!bookingId || !userId || typeof amount === 'undefined' || !method) {
      return json({ success: false, error: 'Missing required fields (bookingId, userId, amount, method)' }, 400)
    }

    const booking = await Booking.findById(bookingId)
    if (!booking) return json({ success: false, error: 'Booking not found' }, 404)

    const payment = await Payment.create({
      bookingId,
      userId,
      amount,
      currency,
      method,
      description: description || `Payment for booking ${bookingId}`,
      transactionId,
      metadata,
      status: 'pending'
    })

    // Link payment to booking
    await Booking.findByIdAndUpdate(bookingId, { paymentStatus: 'pending', paymentId: payment._id })

    return json({ success: true, data: payment, message: 'Payment created successfully' }, 201)
  } catch (err) {
    console.error('POST /api/payments error:', err)
    return json({ success: false, error: 'Failed to create payment' }, 500)
  }
}

// PATCH /api/payments
export async function PATCH(request: NextRequest) {
  await dbConnect()

  try {
    const body = await request.json()
    const { id, status, transactionId, metadata, refundReason } = body || {}

    if (!id) return json({ success: false, error: 'Payment ID required' }, 400)

    const updateData: any = {}
    if (status) updateData.status = status
    if (transactionId) updateData.transactionId = transactionId
    if (metadata) updateData.metadata = metadata

    if (status === 'refunded') {
      updateData.refundReason = refundReason || null
      updateData.refundedAt = new Date()
    }

    const payment = await Payment.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })

    if (!payment) return json({ success: false, error: 'Payment not found' }, 404)

    // Update the associated booking depending on payment status
    if (payment.bookingId && status) {
      const bookingStatus = status === 'completed' ? 'confirmed' : status === 'pending' ? 'pending' : 'cancelled'
      await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: status, status: bookingStatus })
    }

    return json({ success: true, data: payment, message: 'Payment updated successfully' })
  } catch (err) {
    console.error('PATCH /api/payments error:', err)
    return json({ success: false, error: 'Failed to update payment' }, 500)
  }
}

// DELETE /api/payments
export async function DELETE(request: NextRequest) {
  await dbConnect()

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return json({ success: false, error: 'Payment ID required' }, 400)

    const payment = await Payment.findByIdAndDelete(id)
    if (!payment) return json({ success: false, error: 'Payment not found' }, 404)

    if (payment.bookingId) await Booking.findByIdAndUpdate(payment.bookingId, { paymentStatus: 'pending', paymentId: null })

    return json({ success: true, message: 'Payment deleted successfully' })
  } catch (err) {
    console.error('DELETE /api/payments error:', err)
    return json({ success: false, error: 'Failed to delete payment' }, 500)
  }
}
