import mongoose, { Schema, Document } from 'mongoose'

export interface IPayment extends Document {
  _id: string
  bookingId: string
  userId: string
  amount: number
  currency: string
  paymentMethod: 'cash' | 'card' | 'mobile' | 'online' | 'stripe' | 'paypal'
  paymentStatus: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'partially_refunded'
  transactionId?: string
  stripePaymentIntentId?: string
  paypalOrderId?: string
  paymentGateway?: 'stripe' | 'paypal' | 'local'
  paymentDetails: {
    cardLast4?: string
    cardBrand?: string
    paymentMethodType?: string
    receiptUrl?: string
    failureReason?: string
  }
  refundDetails?: {
    refundId: string
    refundAmount: number
    refundReason: string
    refundDate: Date
    refundStatus: 'pending' | 'completed' | 'failed'
  }[]
  metadata: {
    slotNumber?: string
    vehicleNumber?: string
    duration?: number
    processingTime?: number
  }
  createdAt: Date
  updatedAt: Date
  
  // Methods
  canRefund(amount?: number): boolean
  addRefund(refundData: {
    refundId: string
    refundAmount: number
    refundReason: string
  }): void
}

const PaymentSchema: Schema = new Schema({
  bookingId: {
    type: Schema.Types.ObjectId,
    required: true,
    ref: 'Booking'
  },
  userId: {
    type: String,
    required: true,
    ref: 'User'
  },
  amount: {
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
  paymentMethod: {
    type: String,
    required: true,
    enum: ['cash', 'card', 'mobile', 'online', 'stripe', 'paypal']
  },
  paymentStatus: {
    type: String,
    required: true,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  paypalOrderId: {
    type: String,
    sparse: true
  },
  paymentGateway: {
    type: String,
    enum: ['stripe', 'paypal', 'local']
  },
  paymentDetails: {
    cardLast4: String,
    cardBrand: String,
    paymentMethodType: String,
    receiptUrl: String,
    failureReason: String
  },
  refundDetails: [{
    refundId: {
      type: String,
      required: true
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0
    },
    refundReason: {
      type: String,
      required: true
    },
    refundDate: {
      type: Date,
      default: Date.now
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending'
    }
  }],
  metadata: {
    slotNumber: String,
    vehicleNumber: String,
    duration: Number,
    processingTime: Number
  }
}, {
  timestamps: true,
  collection: 'payments'
})

// Indexes for better query performance
PaymentSchema.index({ bookingId: 1 })
PaymentSchema.index({ userId: 1 })
PaymentSchema.index({ paymentStatus: 1 })
PaymentSchema.index({ paymentMethod: 1 })
PaymentSchema.index({ transactionId: 1 })
PaymentSchema.index({ createdAt: 1 })
PaymentSchema.index({ stripePaymentIntentId: 1 })
PaymentSchema.index({ paypalOrderId: 1 })

// Virtual for total refunded amount
PaymentSchema.virtual('totalRefundedAmount').get(function(this: IPayment) {
  if (!this.refundDetails || this.refundDetails.length === 0) return 0
  return this.refundDetails
    .filter(refund => refund.refundStatus === 'completed')
    .reduce((total, refund) => total + refund.refundAmount, 0)
})

// Virtual for remaining refundable amount
PaymentSchema.virtual('refundableAmount').get(function(this: IPayment) {
  if (this.paymentStatus !== 'completed') return 0
  const totalRefunded = this.get('totalRefundedAmount')
  return Math.max(0, this.amount - totalRefunded)
})

// Method to check if payment can be refunded
PaymentSchema.methods.canRefund = function(this: IPayment, amount?: number) {
  if (this.paymentStatus !== 'completed') return false
  const refundableAmount = this.get('refundableAmount')
  if (amount && amount > refundableAmount) return false
  return refundableAmount > 0
}

// Method to add refund
PaymentSchema.methods.addRefund = function(this: IPayment, refundData: {
  refundId: string
  refundAmount: number
  refundReason: string
}) {
  if (!this.canRefund(refundData.refundAmount)) {
    throw new Error('Cannot process refund: insufficient refundable amount')
  }
  
  this.refundDetails = this.refundDetails || []
  this.refundDetails.push({
    ...refundData,
    refundDate: new Date(),
    refundStatus: 'pending'
  })
  
  // Update payment status
  const totalRefunded = this.get('totalRefundedAmount') + refundData.refundAmount
  if (totalRefunded >= this.amount) {
    this.paymentStatus = 'refunded'
  } else {
    this.paymentStatus = 'partially_refunded'
  }
}

// Pre-save middleware
PaymentSchema.pre('save', function(this: IPayment, next) {
  // Generate transaction ID if not provided
  if (!this.transactionId && this.paymentStatus === 'completed') {
    this.transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 9).toUpperCase()}`
  }
  
  next()
})

export default mongoose.models.Payment || mongoose.model<IPayment>('Payment', PaymentSchema)