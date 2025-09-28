import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import ParkingSlot from '@/models/ParkingSlot'
import Booking from '@/models/Booking'

// Check-out from a slot
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
      status: 'active'
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "No active booking found for this slot" },
        { status: 400 }
      );
    }

    // Calculate actual duration and final amount
    const checkoutTime = new Date();
    const actualDuration = Math.ceil(
      (checkoutTime.getTime() - booking.actualStartTime!.getTime()) / (1000 * 60 * 60)
    );

    // Get slot hourly rate for calculation
    const slotData = await ParkingSlot.findById(booking.slotId);
    const finalAmount = actualDuration * (slotData?.hourlyRate || 5);

    // Update booking
    booking.status = 'completed';
    booking.actualEndTime = checkoutTime;
    booking.totalAmount = finalAmount;
    await booking.save();

    // Free up the slot
    slot.status = 'available';
    slot.bookedBy = null;
    slot.vehicleNumber = null;
    slot.bookedAt = null;
    slot.bookedByUserId = null;
    await slot.save();

    return NextResponse.json({
      success: true,
      booking: booking.toObject(),
      slot: slot.toObject(),
      checkout: {
        actualDuration,
        finalAmount,
        checkoutTime
      },
      message: "Checked out successfully"
    });

  } catch (error) {
    console.error('Check-out error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}