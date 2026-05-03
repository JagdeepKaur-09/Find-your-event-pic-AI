const express = require("express");
const crypto = require("crypto");

const Room = require("../models/Room");
const Photo = require("../models/Photo");
const auth = require("../middleware/auth");

const router = express.Router();

async function buildRoomSummary(room, currentUserId) {
  const counts = await Photo.aggregate([
    { $match: { roomId: room._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } }
  ]);

  const countMap = counts.reduce((acc, item) => {
    acc[item._id] = item.count;
    return acc;
  }, {});

  return {
    _id: room._id,
    eventName: room.eventName,
    roomCode: room.roomCode,
    status: room.status,
    organizerId: room.organizerId,
    lastUploadAt: room.lastUploadAt,
    isOrganizer: room.organizerId.toString() === currentUserId.toString(),
    photoCount: (countMap.processing || 0) + (countMap.processed || 0) + (countMap.failed || 0),
    processedCount: countMap.processed || 0,
    processingCount: countMap.processing || 0,
    failedCount: countMap.failed || 0
  };
}

router.post("/create", auth, async (req, res) => {
  const { eventName } = req.body;

  try {
    if (!eventName || !eventName.trim()) {
      return res.status(400).json({ error: "Event name is required." });
    }

    const roomCode = crypto.randomBytes(6).toString("hex");
    const room = await Room.create({
      eventName: eventName.trim(),
      organizerId: req.user.userId,
      roomCode,
      status: "draft"
    });

    return res.status(201).json({
      message: "Room created!",
      roomCode,
      room: await buildRoomSummary(room, req.user.userId)
    });
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});

router.get("/my-rooms", auth, async (req, res) => {
  try {
    const rooms = await Room.find({ organizerId: req.user.userId }).sort({ createdAt: -1 });
    const summaries = await Promise.all(
      rooms.map((room) => buildRoomSummary(room, req.user.userId))
    );

    return res.json(summaries);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:roomCode", auth, async (req, res) => {
  try {
    const room = await Room.findOne({ roomCode: req.params.roomCode });
    if (!room) {
      return res.status(404).json({ error: "Room not found." });
    }

    return res.json(await buildRoomSummary(room, req.user.userId));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
