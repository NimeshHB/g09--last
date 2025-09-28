import mongoose, { Schema, Document } from 'mongoose'

export interface IBooking extends Document {
  userId: string
  date: Date
  time: string
  duration: number
  service: string
  price: number
  status: string
}

const BookingSchema: Schema = new Schema({
  userId: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  duration: { type: Number, required: true },
  service: { type: String, required: true },
  price: { type: Number, required: true },
  status: { type: String, default: 'pending' },
})

export default mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema)

async function addNewSlot(slotData: any) {
  const res = await fetch('/api/slots', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(slotData),
  })
  return await res.json()
}