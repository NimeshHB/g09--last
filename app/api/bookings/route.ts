import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '../../../lib/dbConnect';
import Booking from '../../../models/Booking';
import ParkingSlot from '../../../models/ParkingSlot';

// Create a new booking (POST)
export async function POST(request: NextRequest) {
  await dbConnect();
  
  try {
    const data = await request.json();
    
    // Validate required fields
    const requiredFields = ['userId', 'slotId', 'vehicleNumber', 'vehicleType', 'startTime', 'duration', 'userDetails'];
    
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { success: false, error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Validate user details
    if (!data.userDetails || !data.userDetails.name || !data.userDetails.email || !data.userDetails.phone) {
      return NextResponse.json(
        { success: false, error: "User details (name, email, phone) are required" },
        { status: 400 }
      );
    }

    // Check if slot exists and is available
    const slot = await ParkingSlot.findById(data.slotId);
    
    if (!slot) {
      return NextResponse.json(
        { success: false, error: "Parking slot not found" },
        { status: 400 }
      );
    }

    // Check if slot is available for the requested time
    if (slot.status !== 'available') {
      return NextResponse.json(
        { success: false, error: "Slot is not available" },
        { status: 400 }
      );
    }

    // Validate data
    const startTime = new Date(data.startTime);
    const endTime = new Date(startTime.getTime() + (data.duration * 60 * 60 * 1000));
    const totalAmount = data.duration * (slot.pricePerHour || 10); // Default price

    // Create booking data
    const bookingData = {
      ...data,
      slotNumber: slot.number,
      startTime,
      endTime,
      totalAmount,
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const booking = new Booking(bookingData);
    await booking.save();

    // Update slot status
    const now = new Date();
    if (startTime <= now) {
      slot.status = 'occupied';
      slot.vehicleNumber = data.vehicleNumber;
      slot.vehicleType = data.vehicleType;
      await slot.save();
    }

    return NextResponse.json({ success: true, booking }, { status: 201 });
  } catch (error) {
    console.error('Booking creation error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Get bookings (GET)
export async function GET(request: NextRequest) {
  await dbConnect();
  
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const slotId = searchParams.get('slotId');
    const status = searchParams.get('status');
    
    const query: any = {};
    if (userId) query.userId = userId;
    if (slotId) query.slotId = slotId;
    if (status) query.status = status;
    
    const bookings = await Booking.find(query)
      .populate('slotId')
      .sort({ createdAt: -1 })
      .limit(50);
    
    return NextResponse.json({ success: true, bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}

// Update booking (PATCH)
export async function PATCH(request: NextRequest) {
  await dbConnect();
  
  try {
    const data = await request.json();
    const { bookingId, ...updateData } = data;
    
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findByIdAndUpdate(
      bookingId,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate('slotId');
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Cancel booking (DELETE)
export async function DELETE(request: NextRequest) {
  await dbConnect();
  
  try {
    const { searchParams } = new URL(request.url);
    const bookingId = searchParams.get('bookingId');
    
    if (!bookingId) {
      return NextResponse.json(
        { success: false, error: 'Booking ID is required' },
        { status: 400 }
      );
    }
    
    const booking = await Booking.findById(bookingId).populate('slotId');
    
    if (!booking) {
      return NextResponse.json(
        { success: false, error: 'Booking not found' },
        { status: 404 }
      );
    }
    
    // Update booking status to cancelled
    booking.status = 'cancelled';
    booking.updatedAt = new Date();
    await booking.save();
    
    // Free up the slot if it was occupied
    if (booking.slotId && booking.slotId.status === 'occupied') {
      await ParkingSlot.findByIdAndUpdate(booking.slotId._id, {
        status: 'available',
        vehicleNumber: null,
        vehicleType: null,
        updatedAt: new Date()
      });
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Booking cancelled successfully',
      booking 
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
