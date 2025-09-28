import mongoose, { Schema, Document } from 'mongoose';

export interface ISlot extends Document {
  number: string;
  slotName?: string;  // Human-readable name like "A01", "B23", etc.
  section: string;
  type: 'regular' | 'compact' | 'large' | 'electric' | 'handicap' | 'vip';
  status: 'available' | 'occupied' | 'blocked' | 'reserved';
  hourlyRate: number;
  maxTimeLimit: number;
  description?: string;
  bookedBy?: string;
  bookedByUserId?: mongoose.Types.ObjectId;
  vehicleNumber?: string;
  vehicleType?: string;
  bookedAt?: Date;
  expectedCheckout?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SlotSchema: Schema = new Schema({
  number: { type: String, required: true, unique: true },
  slotName: { type: String }, // Human-readable name like "A01"
  section: { type: String, required: true },
  type: { 
    type: String, 
    enum: ['regular', 'compact', 'large', 'electric', 'handicap', 'vip'], 
    required: true 
  },
  status: { 
    type: String, 
    enum: ['available', 'occupied', 'blocked', 'reserved'], 
    default: 'available' 
  },
  hourlyRate: { type: Number, required: true },
  maxTimeLimit: { type: Number, required: true },
  description: String,
  bookedBy: String,
  bookedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  vehicleNumber: String,
  vehicleType: String,
  bookedAt: Date,
  expectedCheckout: Date,
}, { timestamps: true });

export default mongoose.models.Slot || mongoose.model<ISlot>('Slot', SlotSchema, 'slot_list');