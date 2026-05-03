const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  faceDescriptor: { type: [Number], default: [] },
  consentGiven: { type: Boolean, default: false },
  faceRegisteredAt: { type: Date, default: null },
  faceExpiresAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
