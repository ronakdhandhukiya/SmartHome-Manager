
const mongoose = require("mongoose");

const alertSchema = new mongoose.Schema({
    household: {type: mongoose.Schema.Types.ObjectId,ref: "Household",
        required: true },
    device: {type: mongoose.Schema.Types.ObjectId, ref: "Device", default: null},
    message: {type: String,required: true},
    resolved: {type: Boolean,default: false}
}, 
{ timestamps: true }
);

const ALERT = mongoose.model("Alert", alertSchema);

module.exports = ALERT