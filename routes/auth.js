const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const auth = require("../middleware/auth");

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    if (!name || !email || !password)
      return res.status(400).json({ error: "All fields are required." });

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered." });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    await user.save();
    res.json({ message: "User created successfully!" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required." });

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found." });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: "Wrong password." });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ message: "Login successful!", token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register-face
router.post("/register-face", auth, async (req, res) => {
  try {
    // Client sends { faceDescriptor: [...128 numbers] }
    const { faceDescriptor } = req.body;
    if (!faceDescriptor || faceDescriptor.length !== 128)
      return res.status(400).json({ error: "Invalid face data. Expected 128 values." });

    await User.findByIdAndUpdate(req.user.userId, { faceDescriptor });
    res.json({ message: "Face registered successfully!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
