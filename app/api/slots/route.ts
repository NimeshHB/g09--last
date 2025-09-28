const ParkingSlot = require('../models/ParkingSlot');
const dbConnect = require('../lib/dbConnect');

async function parkingSlots(fastify) {
  // Create a new slot (POST)
  fastify.post('/', async (request, reply) => {
    try {
      await dbConnect();
      const data = request.body;

      // Validate required fields
      if (!data.number || !data.section || !data.type || !data.hourlyRate || !data.maxTimeLimit) {
        return reply.code(400).send({
          success: false,
          error: "Number, section, type, hourlyRate, and maxTimeLimit are required"
        });
      }

      // Auto-generate slot name if not provided
      if (!data.slotName) {
        const section = data.section.toUpperCase();
        const number = data.number.toString().padStart(2, '0');
        data.slotName = `${section}${number}`;
      }

      const slot = new ParkingSlot(data);
      await slot.save();

      return reply.code(201).send({ success: true, slot });
    } catch (error) {
      if (error.code === 11000) {
        return reply.code(400).send({
          success: false,
          error: "Slot number already exists"
        });
      }
      return reply.code(400).send({
        success: false,
        error: error.message
      });
    }
  });

  // Get all slots (GET)
  fastify.get('/', async (request, reply) => {
    try {
      await dbConnect();
      const slots = await ParkingSlot.find().sort({ number: 1 });
      return reply.code(200).send({ success: true, slots });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Update a slot (PATCH)
  fastify.patch('/', async (request, reply) => {
    try {
      await dbConnect();
      const { _id, ...updateFields } = request.body;

      if (!_id) {
        return reply.code(400).send({
          success: false,
          error: "Missing slot _id"
        });
      }

      const result = await ParkingSlot.updateOne(
        { _id },
        { $set: updateFields }
      );

      if (result.matchedCount === 0) {
        return reply.code(404).send({
          success: false,
          error: "Slot not found"
        });
      }

      return reply.code(200).send({
        success: true,
        modifiedCount: result.modifiedCount
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });

  // Delete a slot (DELETE)
  fastify.delete('/', async (request, reply) => {
    try {
      await dbConnect();
      const { _id } = request.query;

      if (!_id) {
        return reply.code(400).send({
          success: false,
          error: "Missing slot _id"
        });
      }

      const result = await ParkingSlot.deleteOne({ _id });

      if (result.deletedCount === 0) {
        return reply.code(404).send({
          success: false,
          error: "Slot not found"
        });
      }

      return reply.code(200).send({
        success: true,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  });
}

module.exports = parkingSlots;
