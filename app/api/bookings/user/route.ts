import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import Booking from '@/models/Booking'

export async function GET() {
  try {
    await dbConnect()
    
    // For now, fetch all bookings
    // In production, filter by authenticated user
    const bookings = await Booking.find({})
    .populate('slotId')
    .sort({ createdAt: -1 })

    return NextResponse.json({ 
      success: true, 
      bookings 
    })
  } catch (error) {
    console.error('Fetch bookings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    )
  }
}