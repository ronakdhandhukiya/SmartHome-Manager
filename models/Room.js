
const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    name: {type: String, required: true, trim: true},
    household: {type: mongoose.Schema.Types.ObjectId,ref: "Household",
      required: true}
}, 
{ timestamps: true }
);

const ROOM = mongoose.model("Room", roomSchema);

module.exports = ROOM