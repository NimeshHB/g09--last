import { NextRequest, NextResponse } from 'next/server'
import dbConnect from '@/lib/dbConnect'
import PricingTier from '@/models/PricingTier'

// POST /api/pricing/calculate - Calculate price for a booking
export async function POST(request: NextRequest) {
  try {
    await dbConnect()
    
    const data = await request.json()
    const { vehicleType, duration, startTime, endTime, slotId } = data

    // Validate required fields
    if (!vehicleType || !duration || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const startDate = new Date(startTime)
    const endDate = new Date(endTime)

    // Get all active pricing tiers that could apply
    const pricingTiers = await PricingTier.find({
      isActive: true,
      validFrom: { $lte: startDate },
      $and: [
        {
          $or: [
            { validUntil: { $exists: false } },
            { validUntil: { $gte: startDate } }
          ]
        },
        {
          $or: [
            { vehicleType: vehicleType },
            { vehicleType: 'all' }
          ]
        }
      ]
    }).sort({ priority: -1 })

    if (pricingTiers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pricing tiers available for this vehicle type' },
        { status: 404 }
      )
    }

    // Calculate pricing for each applicable tier
    const pricingResults = []
    
    for (const tier of pricingTiers) {
      const result = tier.calculatePrice({
        duration,
        startTime: startDate,
        endTime: endDate,
        vehicleType,
        slotId
      })

      if (result) {
        pricingResults.push({
          tierId: tier._id,
          tierName: tier.name,
          pricingType: tier.pricingType,
          currency: tier.currency,
          ...result
        })
      }
    }

    if (pricingResults.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No applicable pricing found for the given parameters' },
        { status: 404 }
      )
    }

    // Return the best pricing (highest priority tier that applies)
    const bestPricing = pricingResults[0]
    
    // Also return all available options
    return NextResponse.json({
      success: true,
      data: {
        recommendedPricing: bestPricing,
        allOptions: pricingResults,
        calculationDetails: {
          vehicleType,
          duration,
          startTime: startDate,
          endTime: endDate,
          slotId
        }
      }
    })

  } catch (error) {
    console.error('Price calculation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to calculate pricing' },
      { status: 500 }
    )
  }
}

// GET /api/pricing/calculate - Get pricing estimate (for quick queries)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const vehicleType = searchParams.get('vehicleType')
    const duration = parseFloat(searchParams.get('duration') || '0')
    const startTime = searchParams.get('startTime')
    const endTime = searchParams.get('endTime')
    const slotId = searchParams.get('slotId')

    if (!vehicleType || !duration || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Use the POST method internally
    const mockRequest = new Request(request.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleType,
        duration,
        startTime,
        endTime,
        slotId
      })
    })

    return await POST(mockRequest as NextRequest)

  } catch (error) {
    console.error('Price estimation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to estimate pricing' },
      { status: 500 }
    )
  }
}