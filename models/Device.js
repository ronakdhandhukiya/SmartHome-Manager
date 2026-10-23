
const mongoose = require("mongoose");

const deviceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  type: {
    type: String, enum: [
      "Lamp", "Fan", "Thermostat", "AC", "Heater",
      "Washing Machine", "TV", "Coffee Maker",
      "Door Lock", "Other"],
    required: true
  },
  room: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  household: {type: mongoose.Schema.Types.ObjectId, ref: "Household",
    required: true
  },
  connected: { type: Boolean, default: false },
  power: {type: Boolean,default: false},
  status: {type: String,enum: ["On", "Off", "Standby", "Malfunctioning"],default: "Off"},
  features: {type: mongoose.Schema.Types.Mixed, default: {}},
  watts: {type: Number,default: 100, min: 0},
  turnedOnAt: {type: Date,default: null},
  malfunction: {type: Boolean,default: false
  }
}, { timestamps: true });

const DEVICE = mongoose.model("Device", deviceSchema);

module.exports = DEVICE