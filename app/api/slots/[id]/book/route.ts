import { NextRequest, NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/dbConnect'
import ParkingSlot from '@/models/ParkingSlot'
import Booking from '@/models/Booking'

// Book a specific slot
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

    // Check if slot is available
    if (slot.status !== 'available') {
      return NextResponse.json(
        { success: false, error: "Slot is not available" },
        { status: 400 }
      );
    }

    // Validate required booking data
    if (!data.userId || !data.vehicleNumber || !data.duration || !data.userDetails) {
      return NextResponse.json(
        { success: false, error: "Missing required booking information" },
        { status: 400 }
      );
    }

    // Calculate booking times
    const startTime = new Date(data.startTime || new Date());
    const endTime = new Date(startTime.getTime() + (data.duration * 60 * 60 * 1000));
    const totalAmount = data.duration * slot.hourlyRate;

    // Handle temporary user ID - generate a proper ObjectId if using temp user
    let processedUserId = data.userId;
    if (data.userId === 'temp-user-id') {
      processedUserId = new mongoose.Types.ObjectId().toString();
      console.log('Generated new ObjectId for temp user:', processedUserId);
    }
    
    console.log('Original userId:', data.userId, 'Processed userId:', processedUserId);

    // Create booking record
    const booking = new Booking({
      userId: processedUserId,
      slotId: slot._id,
      slotNumber: slot.number,
      vehicleNumber: data.vehicleNumber,
      vehicleType: data.vehicleType || 'car',
      startTime,
      endTime,
      duration: data.duration,
      status: 'confirmed',
      totalAmount,
      paidAmount: 0,
      paymentStatus: 'pending',
      userDetails: data.userDetails,
      notes: data.notes || ''
    });

    await booking.save();

    // Update slot status
    slot.status = 'occupied';
    slot.bookedBy = data.userDetails.name;
    slot.vehicleNumber = data.vehicleNumber;
    slot.bookedAt = startTime;
    
    console.log('Setting slot.bookedByUserId to:', processedUserId);
    slot.bookedByUserId = processedUserId;
    
    await slot.save();

    return NextResponse.json({
      success: true,
      booking: booking.toObject(),
      slot: slot.toObject(),
      message: "Slot booked successfully"
    }, { status: 201 });

  } catch (error) {
    console.error('Slot booking error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}