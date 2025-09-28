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
    // First try to find booking with exact user ID match
    let booking = await Booking.findOne({
      slotId: slot._id,
      userId: data.userId,
      status: { $in: ['active', 'confirmed'] }
    });

    // If no exact match and this is a temp user system, try to find by slot's bookedByUserId
    if (!booking && slot.bookedByUserId) {
      booking = await Booking.findOne({
        slotId: slot._id,
        userId: slot.bookedByUserId,
        status: { $in: ['active', 'confirmed'] }
      });
    }

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "No active or confirmed booking found for this slot" },
        { status: 400 }
      );
    }

    // If booking was confirmed but not checked in, check it in first
    if (booking.status === 'confirmed') {
      booking.status = 'active';
      booking.actualStartTime = new Date();
      await booking.save();
    }

    // Calculate actual duration and final amount
    const checkoutTime = new Date();
    const startTime = booking.actualStartTime || booking.startTime || slot.bookedAt;
    const actualDuration = Math.ceil(
      (checkoutTime.getTime() - startTime.getTime()) / (1000 * 60 * 60)
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