import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin' | 'attendant';
  phone?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  adminLevel?: 'manager' | 'super';
  permissions?: string[];
  status: 'active' | 'inactive';
  isVerified: boolean;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema: Schema = new Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin', 'attendant'], required: true },
  phone: String,
  vehicleNumber: String,
  vehicleType: String,
  adminLevel: { type: String, enum: ['manager', 'super'], default: undefined },
  permissions: [String],
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  isVerified: { type: Boolean, default: false },
  verificationToken: String,
  verificationTokenExpires: Date,
  lastLogin: Date,
}, { timestamps: true });

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);