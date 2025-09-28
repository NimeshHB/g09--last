import mongoose, { Schema, Document } from 'mongoose'

export interface IBooking extends Document {
  _id: string
  userId: string
  slotId: string
  slotNumber: string
  vehicleNumber: string
  vehicleType: string
  startTime: Date
  endTime: Date
  actualStartTime?: Date
  actualEndTime?: Date
  duration: number // hours
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'expired'
  totalAmount: number
  paidAmount: number
  paymentStatus: 'pending' | 'paid' | 'refunded'
  paymentMethod?: string
  paymentId?: string
  userDetails: {
    name: string
    email: string
    phone: string
  }
  notes?: string
  createdAt: Date
  updatedAt: Date
}

const BookingSchema: Schema = new Schema({
  userId: { 
    type: String, 
    required: true,
    ref: 'User'
  },
  slotId: { 
    type: Schema.Types.ObjectId, 
    required: true,
    ref: 'ParkingSlot'
  },
  slotNumber: { 
    type: String, 
    required: true 
  },
  vehicleNumber: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true
  },
  vehicleType: { 
    type: String, 
    required: true,
    enum: ['car', 'motorcycle', 'truck', 'van', 'suv', 'bus'],
    default: 'car'
  },
  startTime: { 
    type: Date, 
    required: true 
  },
  endTime: { 
    type: Date, 
    required: true 
  },
  actualStartTime: { 
    type: Date 
  },
  actualEndTime: { 
    type: Date 
  },
  duration: { 
    type: Number, 
    required: true,
    min: 1,
    max: 24
  },
  status: { 
    type: String, 
    enum: ['pending', 'confirmed', 'active', 'completed', 'cancelled', 'expired'],
    default: 'pending'
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  paidAmount: { 
    type: Number, 
    default: 0,
    min: 0
  },
  paymentStatus: { 
    type: String, 
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending'
  },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'card', 'mobile', 'online']
  },
  paymentId: { 
    type: String 
  },
  userDetails: {
    name: { 
      type: String, 
      required: true 
    },
    email: { 
      type: String, 
      required: true 
    },
    phone: { 
      type: String, 
      required: true 
    }
  },
  notes: { 
    type: String,
    maxlength: 500
  }
}, { 
  timestamps: true,
  collection: 'bookings'
})

// Indexes for better query performance
BookingSchema.index({ userId: 1 })
BookingSchema.index({ slotId: 1 })
BookingSchema.index({ status: 1 })
BookingSchema.index({ startTime: 1, endTime: 1 })
BookingSchema.index({ vehicleNumber: 1 })

// Virtual for booking duration in minutes
BookingSchema.virtual('durationInMinutes').get(function(this: IBooking) {
  return this.duration * 60
})

// Method to check if booking is active
BookingSchema.methods.isActive = function(this: IBooking) {
  const now = new Date()
  return this.status === 'active' && 
         this.actualStartTime && 
         this.actualStartTime <= now && 
         (!this.actualEndTime || this.actualEndTime > now)
}

// Method to check if booking is expired
BookingSchema.methods.isExpired = function(this: IBooking) {
  const now = new Date()
  return this.status === 'confirmed' && this.startTime < now
}

// Method to calculate actual duration (for billing)
BookingSchema.methods.getActualDuration = function(this: IBooking) {
  if (!this.actualStartTime) return 0
  
  const endTime = this.actualEndTime || new Date()
  const durationMs = endTime.getTime() - this.actualStartTime.getTime()
  return Math.ceil(durationMs / (1000 * 60 * 60)) // Round up to nearest hour
}

// Pre-save middleware to update total amount
BookingSchema.pre('save', function(this: IBooking, next) {
  // Auto-expire bookings that are past start time and still pending/confirmed
  const now = new Date()
  if ((this.status === 'pending' || this.status === 'confirmed') && this.startTime < now) {
    this.status = 'expired'
  }
  
  next()
})

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema)