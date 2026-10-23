const mongoose = require("mongoose");

const householdSchema = new mongoose.Schema({
    name: {type: String,required: true,trim: true},
    owner: {type: mongoose.Schema.Types.ObjectId,ref: "User",required: true },
    emergencyMode: {type: Boolean,default: false }
}, 
{ timestamps: true }
)

const HOUSEHOLD = mongoose.model("Household", householdSchema);

module.exports = HOUSEHOLD