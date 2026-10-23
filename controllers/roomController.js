const ROOM = require("../models/Room")
const DEVICE = require("../models/Device")

const createRoom = async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ message: "Room name is required" })
    }

    const room = new ROOM({name,household: req.householdId
    });

    await room.save()

    res.status(201).json(room)
  } catch (error) {
    res.status(400).json({ message: error.message })
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await ROOM.find({ household: req.householdId })
    res.json(rooms)
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
};

const deleteRoom = async (req, res) => {
  try {

    const { id } = req.params
    const room = await ROOM.findOne({ _id: id, household: req.householdId })

    if (!room) {
      return res.status(404).json({ message: "Room not found" })
    }

    if (await DEVICE.exists({ room: room._id })) {
      return res.status(400).json({ message: "Delete or move the room's devices first" })
    }

    await room.deleteOne();
    res.json({ message: "Room deleted successfully" })

  } catch (error) {
    res.status(500).json({ message: error.message })
  }
};

module.exports = { createRoom, getRooms, deleteRoom };