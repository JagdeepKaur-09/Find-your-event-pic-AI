const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  eventName: { type: String, required: true, trim: true },
  roomCode: { type: String, unique: true, required: true },
  organizerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: {
    type: String,
    enum: ["draft", "processing", "ready", "archived"],
    default: "draft"
  },
  lastUploadAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Room", roomSchema);
