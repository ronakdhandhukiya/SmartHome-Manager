
const mongoose = require("mongoose");

const routineSchema = new mongoose.Schema({
    name: {type: String, required: true},
    household: {type: mongoose.Schema.Types.ObjectId,ref: "Household",
      required: true},
    time: {type: String,required: true },
    actions: [{device: { type: mongoose.Schema.Types.ObjectId,ref: "Device",
            required: true},
        power: {
            type: Boolean,
            required: true
        },
        features: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        }}],

    active: {type: Boolean,default: true },
    lastRun: {type: String,default: ""}
}, 
{ timestamps: true });

const ROUTINE = mongoose.model("Routine", routineSchema);

module.exports = ROUTINE