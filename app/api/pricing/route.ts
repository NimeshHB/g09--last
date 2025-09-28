import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import PricingTier from '@/models/PricingTier'

// GET /api/pricing - Fetch pricing tiers
export async function GET(request: NextRequest) {
  try {
    await dbConnect()
    
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const skip = (page - 1) * limit

    // Build query
    let query: any = {}

    const isActive = searchParams.get('isActive')
    if (isActive !== null) query.isActive = isActive === 'true'

    const vehicleType = searchParams.get('vehicleType')
    if (vehicleType) query.vehicleType = vehicleType

    const pricingType = searchParams.get('pricingType')
    if (pricingType) query.pricingType = pricingType

    // Execute query
    const [pricingTiers, totalCount] = await Promise.all([
      PricingTier.find(query)
        .sort({ priority: -1, vehicleType: 1, pricingType: 1 })
        .skip(skip)
        .limit(limit),
      PricingTier.countDocuments(query)
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      success: true,
      data: pricingTiers,
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
    console.error('Pricing fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pricing tiers' },
      { status: 500 }
    )
  }
}

// POST /api/pricing - Create new pricing tier
export async function POST(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()
    const {
      name,
      description,
      vehicleType,
      basePrice,
      currency,
      pricingType,
      durationRange,
      discounts,
      surcharges,
      priority,
      validFrom,
      validUntil,
      applicableSlots
    } = data

    // Validate required fields
    if (!name || !vehicleType || !basePrice || !pricingType) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create pricing tier
    const pricingTier = new PricingTier({
      name,
      description,
      vehicleType,
      basePrice,
      currency: currency || 'USD',
      pricingType,
      durationRange: durationRange || { min: 1, max: 24 },
      discounts: discounts || [],
      surcharges: surcharges || [],
      priority: priority || 0,
      validFrom: validFrom ? new Date(validFrom) : new Date(),
      validUntil: validUntil ? new Date(validUntil) : null,
      applicableSlots: applicableSlots || [],
      isActive: true
    })

    await pricingTier.save()

    return NextResponse.json({
      success: true,
      data: pricingTier,
      message: 'Pricing tier created successfully'
    }, { status: 201 })

  } catch (error) {
    console.error('Pricing creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create pricing tier' },
      { status: 500 }
    )
  }
}

// PATCH /api/pricing - Update pricing tier
export async function PATCH(request: NextRequest) {
  try {
    await dbConnect()

    const data = await request.json()
    const { id, ...updateData } = data

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Pricing tier ID required' },
        { status: 400 }
      )
    }

    const pricingTier = await PricingTier.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    )

    if (!pricingTier) {
      return NextResponse.json(
        { success: false, error: 'Pricing tier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: pricingTier,
      message: 'Pricing tier updated successfully'
    })

  } catch (error) {
    console.error('Pricing update error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to update pricing tier' },
      { status: 500 }
    )
  }
}

// DELETE /api/pricing - Delete pricing tier
export async function DELETE(request: NextRequest) {
  try {
    await dbConnect()

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Pricing tier ID required' },
        { status: 400 }
      )
    }

    const pricingTier = await PricingTier.findByIdAndDelete(id)
    if (!pricingTier) {
      return NextResponse.json(
        { success: false, error: 'Pricing tier not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Pricing tier deleted successfully'
    })

  } catch (error) {
    console.error('Pricing deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete pricing tier' },
      { status: 500 }
    )
  }
}