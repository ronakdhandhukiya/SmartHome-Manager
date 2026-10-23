const mongoose = require("mongoose")

const userSchema = new mongoose.Schema(
  {
    name: { type: String,required: true,trim: true
    },
    email: { type: String,required: true,unique: true,trim: true,lowercase: true},
    password: {type: String,required: true},
    role: { type: String, enum: ["Admin", "Member", "Child", "Guest"],
       default: "Member"
    },
    household: { type: mongoose.Schema.Types.ObjectId, ref: "Household", default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema)