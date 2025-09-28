import mongoose, { Schema, Document } from 'mongoose'

export interface IPricingTier extends Document {
  _id: string
  name: string
  description: string
  vehicleType: 'car' | 'motorcycle' | 'truck' | 'van' | 'suv' | 'bus' | 'all'
  basePrice: number
  currency: string
  pricingType: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'flat'
  durationRange: {
    min: number // minimum hours
    max: number // maximum hours
  }
  discounts: {
    type: 'percentage' | 'fixed'
    value: number
    minDuration?: number // apply discount for bookings longer than this
    description: string
  }[]
  surcharges: {
    type: 'peak_hours' | 'weekend' | 'holiday' | 'overnight'
    multiplier: number // e.g., 1.5 for 50% surcharge
    timeRanges?: {
      start: string // HH:mm format
      end: string // HH:mm format
    }[]
    days?: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[]
    description: string
  }[]
  isActive: boolean
  priority: number // higher priority tiers are checked first
  validFrom: Date
  validUntil?: Date
  applicableSlots?: string[] // specific slot IDs, empty means all slots
  createdAt: Date
  updatedAt: Date
  
  // Methods
  isValidAt(date?: Date): boolean
  calculatePrice(options: {
    duration: number
    startTime: Date
    endTime: Date
    vehicleType: string
    slotId?: string
  }): any
  appliesSurcharge(surcharge: any, startTime: Date, endTime: Date): boolean
  parseTimeToHours(timeStr: string): number
}

const PricingTierSchema: Schema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  vehicleType: {
    type: String,
    required: true,
    enum: ['car', 'motorcycle', 'truck', 'van', 'suv', 'bus', 'all'],
    default: 'all'
  },
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
    uppercase: true
  },
  pricingType: {
    type: String,
    required: true,
    enum: ['hourly', 'daily', 'weekly', 'monthly', 'flat'],
    default: 'hourly'
  },
  durationRange: {
    min: {
      type: Number,
      required: true,
      min: 0.5,
      default: 1
    },
    max: {
      type: Number,
      required: true,
      min: 1,
      default: 24
    }
  },
  discounts: [{
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      required: true
    },
    value: {
      type: Number,
      required: true,
      min: 0
    },
    minDuration: {
      type: Number,
      min: 1
    },
    description: {
      type: String,
      required: true
    }
  }],
  surcharges: [{
    type: {
      type: String,
      enum: ['peak_hours', 'weekend', 'holiday', 'overnight'],
      required: true
    },
    multiplier: {
      type: Number,
      required: true,
      min: 1
    },
    timeRanges: [{
      start: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      },
      end: {
        type: String,
        match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
      }
    }],
    days: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }],
    description: {
      type: String,
      required: true
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  priority: {
    type: Number,
    default: 0
  },
  validFrom: {
    type: Date,
    required: true,
    default: Date.now
  },
  validUntil: {
    type: Date
  },
  applicableSlots: [{
    type: Schema.Types.ObjectId,
    ref: 'ParkingSlot'
  }]
}, {
  timestamps: true,
  collection: 'pricing_tiers'
})

// Indexes
PricingTierSchema.index({ vehicleType: 1, isActive: 1, priority: -1 })
PricingTierSchema.index({ validFrom: 1, validUntil: 1 })
PricingTierSchema.index({ pricingType: 1 })

// Method to check if pricing tier is currently valid
PricingTierSchema.methods.isValidAt = function(this: IPricingTier, date: Date = new Date()) {
  if (!this.isActive) return false
  if (this.validFrom > date) return false
  if (this.validUntil && this.validUntil < date) return false
  return true
}

// Method to calculate price for a booking
PricingTierSchema.methods.calculatePrice = function(this: IPricingTier, options: {
  duration: number
  startTime: Date
  endTime: Date
  vehicleType: string
  slotId?: string
}) {
  if (!this.isValidAt(options.startTime)) return null
  
  // Check if tier applies to this vehicle type
  if (this.vehicleType !== 'all' && this.vehicleType !== options.vehicleType) return null
  
  // Check if tier applies to this slot
  if (this.applicableSlots && this.applicableSlots.length > 0 && options.slotId) {
    if (!this.applicableSlots.includes(options.slotId)) return null
  }
  
  // Check duration range
  if (options.duration < this.durationRange.min || options.duration > this.durationRange.max) return null
  
  let baseAmount = 0
  
  // Calculate base amount based on pricing type
  switch (this.pricingType) {
    case 'hourly':
      baseAmount = this.basePrice * options.duration
      break
    case 'daily':
      baseAmount = this.basePrice * Math.ceil(options.duration / 24)
      break
    case 'weekly':
      baseAmount = this.basePrice * Math.ceil(options.duration / (24 * 7))
      break
    case 'monthly':
      baseAmount = this.basePrice * Math.ceil(options.duration / (24 * 30))
      break
    case 'flat':
      baseAmount = this.basePrice
      break
  }
  
  // Apply surcharges
  let surchargeMultiplier = 1
  for (const surcharge of this.surcharges) {
    if (this.appliesSurcharge(surcharge, options.startTime, options.endTime)) {
      surchargeMultiplier = Math.max(surchargeMultiplier, surcharge.multiplier)
    }
  }
  
  let finalAmount = baseAmount * surchargeMultiplier
  
  // Apply discounts
  for (const discount of this.discounts) {
    if (!discount.minDuration || options.duration >= discount.minDuration) {
      if (discount.type === 'percentage') {
        finalAmount = finalAmount * (1 - discount.value / 100)
      } else {
        finalAmount = Math.max(0, finalAmount - discount.value)
      }
    }
  }
  
  return {
    baseAmount,
    surchargeMultiplier,
    finalAmount: Math.round(finalAmount * 100) / 100, // Round to 2 decimal places
    appliedDiscounts: this.discounts.filter(d => !d.minDuration || options.duration >= d.minDuration),
    appliedSurcharges: this.surcharges.filter(s => this.appliesSurcharge(s, options.startTime, options.endTime))
  }
}

// Helper method to check if surcharge applies
PricingTierSchema.methods.appliesSurcharge = function(this: IPricingTier, surcharge: any, startTime: Date, endTime: Date) {
  const startDay = startTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  const endDay = endTime.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase()
  
  switch (surcharge.type) {
    case 'weekend':
      return ['saturday', 'sunday'].includes(startDay) || ['saturday', 'sunday'].includes(endDay)
    
    case 'peak_hours':
      if (!surcharge.timeRanges || surcharge.timeRanges.length === 0) return false
      return surcharge.timeRanges.some((range: any) => {
        const startHour = startTime.getHours() + startTime.getMinutes() / 60
        const endHour = endTime.getHours() + endTime.getMinutes() / 60
        const rangeStart = this.parseTimeToHours(range.start)
        const rangeEnd = this.parseTimeToHours(range.end)
        
        return (startHour >= rangeStart && startHour <= rangeEnd) ||
               (endHour >= rangeStart && endHour <= rangeEnd) ||
               (startHour <= rangeStart && endHour >= rangeEnd)
      })
    
    case 'overnight':
      const startHour = startTime.getHours()
      const endHour = endTime.getHours()
      return startHour >= 22 || endHour <= 6 || (startHour < endHour && endHour <= 6)
    
    case 'holiday':
      // This would require a holiday database or external service
      // For now, return false
      return false
    
    default:
      return false
  }
}

// Helper method to parse time string to hours
PricingTierSchema.methods.parseTimeToHours = function(timeStr: string) {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return hours + minutes / 60
}

export default mongoose.models.PricingTier || mongoose.model<IPricingTier>('PricingTier', PricingTierSchema)