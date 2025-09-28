import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import ParkingSlot from '@/models/ParkingSlot'

// Create a new slot (POST)
export async function POST(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    
    // Validate required fields
    if (!data.number || !data.section || !data.type || !data.hourlyRate || !data.maxTimeLimit) {
      return NextResponse.json(
        { success: false, error: "Number, section, type, hourlyRate, and maxTimeLimit are required" },
        { status: 400 }
      );
    }

    // Auto-generate slot name if not provided
    if (!data.slotName) {
      const section = data.section.toUpperCase()
      const number = data.number.toString().padStart(2, '0')
      data.slotName = `${section}${number}`
    }

    const slot = new ParkingSlot(data);
    await slot.save();
    
    return NextResponse.json({ success: true, slot }, { status: 201 });
  } catch (error) {
    if ((error as any).code === 11000) {
      return NextResponse.json(
        { success: false, error: "Slot number already exists" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 400 }
    );
  }
}

// Get all slots (GET)
export async function GET() {
  await dbConnect();
  try {
    const slots = await ParkingSlot.find().sort({ number: 1 });
    return NextResponse.json({ success: true, slots });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Update a slot (PATCH)
export async function PATCH(request: NextRequest) {
  await dbConnect();
  try {
    const data = await request.json();
    const { _id, ...updateFields } = data;
    
    if (!_id) {
      return NextResponse.json(
        { success: false, error: "Missing slot _id" },
        { status: 400 }
      );
    }

    const result = await ParkingSlot.updateOne(
      { _id },
      { $set: updateFields }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, modifiedCount: result.modifiedCount },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

// Delete a slot (DELETE)
export async function DELETE(request: NextRequest) {
  await dbConnect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("_id");
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Missing slot _id" },
        { status: 400 }
      );
    }

    const result = await ParkingSlot.deleteOne({ _id: id });
    
    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Slot not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, deletedCount: result.deletedCount },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}