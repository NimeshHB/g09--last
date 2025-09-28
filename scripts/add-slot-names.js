// Script to add slot names to existing parking slots
// Run this once to update existing slots with proper slot names

const dbConnect = require('../lib/dbConnect').default
const ParkingSlot = require('../models/ParkingSlot').default

async function addSlotNames() {
  await dbConnect()
  
  try {
    // Get all slots without slot names
    const slots = await ParkingSlot.find({ slotName: { $exists: false } })
    console.log(`Found ${slots.length} slots without slot names`)
    
    for (const slot of slots) {
      // Generate slot name based on section and number
      let slotName = ''
      
      // If section is like "A", "B", "C" and number is like "1", "2", "10"
      // Create names like "A01", "A02", "A10"
      const section = slot.section.toUpperCase()
      const number = slot.number.toString().padStart(2, '0')
      slotName = `${section}${number}`
      
      // Update the slot with the new slot name
      await ParkingSlot.findByIdAndUpdate(slot._id, { slotName })
      console.log(`Updated slot ${slot.number} -> ${slotName}`)
    }
    
    console.log('Slot names updated successfully!')
  } catch (error) {
    console.error('Error updating slot names:', error)
  } finally {
    process.exit(0)
  }
}

// Run the script
addSlotNames()