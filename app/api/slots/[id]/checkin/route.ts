import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import ParkingSlot from '@/models/ParkingSlot'
import Booking from '@/models/Booking'

// Check-in to a booked slot
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  await dbConnect();
  try {
    const data = await request.json();
    const { id: slotId } = params;

    // Find the slot
    const slot = await ParkingSlot.findById(slotId);
    if (!slot) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    // Find the active booking for this slot
    const booking = await Booking.findOne({
      slotId: slot._id,
      userId: data.userId,
      status: 'confirmed'
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "No confirmed booking found for this slot" },
        { status: 400 }
      );
    }

    // Update booking status to active
    booking.status = 'active';
    booking.actualStartTime = new Date();
    await booking.save();

    // Update slot status
    slot.status = 'occupied';
    await slot.save();

    return NextResponse.json({
      success: true,
      booking: booking.toObject(),
      slot: slot.toObject(),
      message: "Checked in successfully"
    });

  } catch (error) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}