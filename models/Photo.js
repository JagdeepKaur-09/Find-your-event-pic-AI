const mongoose = require("mongoose");

const photoSchema = new mongoose.Schema({
  roomId: { type: mongoose.Schema.Types.ObjectId, ref: "Room", required: true },
  cloudinaryUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  originalFilename: { type: String, default: "event-photo" },
  width: { type: Number, default: null },
  height: { type: Number, default: null },
  bytes: { type: Number, default: null },
  faceDescriptors: { type: [[Number]], default: [] },
  status: {
    type: String,
    enum: ["processing", "processed", "failed"],
    default: "processing"
  },
  processedAt: { type: Date, default: null },
  processingError: { type: String, default: null }
}, { timestamps: true });

module.exports = mongoose.model("Photo", photoSchema);
