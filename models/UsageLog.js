
const mongoose = require("mongoose");

const usageLogSchema = new mongoose.Schema({
    household: {type: mongoose.Schema.Types.ObjectId,ref: "Household",required: true},
    device: { type: mongoose.Schema.Types.ObjectId, ref: "Device", required: true
    },
    deviceName: String,
    watts: Number,
    startedAt: Date,
    endedAt: Date,
    minutes: Number,
    kWh: Number
}, 
{ timestamps: true }
)

const UsageLog = mongoose.model("UsageLog", usageLogSchema);

module.exports = UsageLog