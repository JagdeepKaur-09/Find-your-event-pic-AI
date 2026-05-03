const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const auth = require("../middleware/auth");

const router = express.Router();
const FACE_RETENTION_DAYS = 7;

function createToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

function serializeUser(user) {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    consentGiven: Boolean(user.consentGiven),
    hasFace: Array.isArray(user.faceDescriptor) && user.faceDescriptor.length === 128,
    faceRegisteredAt: user.faceRegisteredAt,
    faceExpiresAt: user.faceExpiresAt
  };
}

router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    if (!name || !email || !password) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword
    });

    return res.status(201).json({
      message: "User created successfully!",
      token: createToken(user._id),
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ error: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password." });
    }

    return res.json({
      message: "Login successful!",
      token: createToken(user._id),
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/register-face", auth, async (req, res) => {
  const { faceDescriptor, consentGiven } = req.body;

  try {
    if (!Array.isArray(faceDescriptor) || faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Invalid face data. Expected 128 values." });
    }

    if (!consentGiven) {
      return res.status(400).json({ error: "Biometric consent is required." });
    }

    const now = new Date();
    const faceExpiresAt = new Date(now);
    faceExpiresAt.setDate(faceExpiresAt.getDate() + FACE_RETENTION_DAYS);

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        faceDescriptor,
        consentGiven: true,
        faceRegisteredAt: now,
        faceExpiresAt
      },
      { new: true }
    );

    return res.json({
      message: "Face registered successfully!",
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/me", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select(
      "name email consentGiven faceDescriptor faceRegisteredAt faceExpiresAt"
    );

    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.json(serializeUser(user));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/my-face", auth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      {
        faceDescriptor: [],
        consentGiven: false,
        faceRegisteredAt: null,
        faceExpiresAt: null
      },
      { new: true }
    );

    return res.json({
      message: "Face data deleted.",
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
