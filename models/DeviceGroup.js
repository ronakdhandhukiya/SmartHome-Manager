
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema({
    name: {type: String,required: true },

    household: {type: mongoose.Schema.Types.ObjectId,ref: "Household", required: true},
    
    devices: [{type: mongoose.Schema.Types.ObjectId,ref: "Device"}]
}, 
{ timestamps: true }
)

const  DeviceGroup = mongoose.model("DeviceGroup", groupSchema)

module.exports = DeviceGroup
