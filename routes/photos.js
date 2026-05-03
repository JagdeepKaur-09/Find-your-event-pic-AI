const express = require("express");
const PDFDocument = require("pdfkit");
const axios = require("axios");

const cloudinary = require("../config/cloudinary");
const Photo = require("../models/Photo");
const Room = require("../models/Room");
const User = require("../models/User");
const auth = require("../middleware/auth");
const imageQueue = require("../queues/imageQueue");

const router = express.Router();

const HIGH_CONFIDENCE_THRESHOLD = 0.45;
const MAYBE_THRESHOLD = 0.6;

async function getRoomForOrganizer(roomId, userId) {
  const room = await Room.findById(roomId);
  if (!room) {
    return { error: { code: 404, message: "Room not found." } };
  }

  if (room.organizerId.toString() !== userId.toString()) {
    return { error: { code: 403, message: "Only the room organizer can manage photos." } };
  }

  return { room };
}

function serializePhoto(photo) {
  return {
    _id: photo._id,
    roomId: photo.roomId,
    cloudinaryUrl: photo.cloudinaryUrl,
    publicId: photo.publicId,
    originalFilename: photo.originalFilename,
    width: photo.width,
    height: photo.height,
    bytes: photo.bytes,
    status: photo.status,
    processedAt: photo.processedAt,
    processingError: photo.processingError
  };
}

function extractImageUrls(req) {
  if (Array.isArray(req.body?.images)) {
    return req.body.images.filter(Boolean);
  }

  if (req.query?.images) {
    return String(req.query.images).split(",").filter(Boolean);
  }

  return [];
}

router.post("/sign-upload", auth, async (req, res) => {
  const { roomId } = req.body;

  try {
    if (!roomId) {
      return res.status(400).json({ error: "roomId is required." });
    }

    const { room, error } = await getRoomForOrganizer(roomId, req.user.userId);
    if (error) {
      return res.status(error.code).json({ error: error.message });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const folder = `catchyoface/${room._id}`;
    const paramsToSign = { folder, timestamp };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return res.json({
      timestamp,
      folder,
      signature,
      apiKey: process.env.CLOUDINARY_API_KEY,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      uploadUrl: `https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.post("/upload", auth, async (req, res) => {
  const { roomId } = req.body;
  const uploadedPhotos = Array.isArray(req.body.photos) ? req.body.photos : [];

  try {
    if (!roomId) {
      return res.status(400).json({ error: "roomId is required." });
    }

    if (uploadedPhotos.length === 0) {
      return res.status(400).json({ error: "At least one uploaded photo is required." });
    }

    const { room, error } = await getRoomForOrganizer(roomId, req.user.userId);
    if (error) {
      return res.status(error.code).json({ error: error.message });
    }

    const docsToInsert = uploadedPhotos.map((photo) => {
      const cloudinaryUrl = photo.secureUrl || photo.secure_url || photo.cloudinaryUrl;
      const publicId = photo.publicId || photo.public_id;

      if (!cloudinaryUrl || !publicId) {
        throw new Error("Each uploaded photo must include secureUrl and publicId.");
      }

      return {
        roomId,
        cloudinaryUrl,
        publicId,
        originalFilename: photo.originalFilename || photo.original_filename || photo.display_name || "event-photo",
        width: photo.width || null,
        height: photo.height || null,
        bytes: photo.bytes || null,
        status: "processing"
      };
    });

    const createdPhotos = await Photo.insertMany(docsToInsert);
    await Room.findByIdAndUpdate(room._id, {
      status: "processing",
      lastUploadAt: new Date()
    });

    createdPhotos.forEach((photo) => {
      imageQueue.add({
        photoId: photo._id.toString(),
        imageUrl: photo.cloudinaryUrl
      });
    });

    await imageQueue.emitRoomProgress(room._id.toString());

    return res.status(201).json({
      message: "Photos queued for AI processing.",
      photos: createdPhotos.map(serializePhoto)
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.all("/download-pdf", auth, async (req, res) => {
  try {
    const imageUrls = extractImageUrls(req);
    if (imageUrls.length === 0) {
      return res.status(400).json({ error: "No images provided." });
    }

    const doc = new PDFDocument({ margin: 30 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=CatchYoFace-Matches.pdf");
    doc.pipe(res);

    doc.fontSize(22).text("CatchYoFace Matches", { align: "center" });
    doc.moveDown();

    for (const url of imageUrls) {
      try {
        const response = await axios.get(url, { responseType: "arraybuffer" });
        const buffer = Buffer.from(response.data);
        doc.addPage().image(buffer, { fit: [500, 600], align: "center", valign: "center" });
      } catch (imageError) {
        console.error("Image fetch failed:", url, imageError.message);
      }
    }

    doc.end();
  } catch (error) {
    return res.status(500).json({ error: `PDF Error: ${error.message}` });
  }
});

router.get("/match/:roomId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user || !Array.isArray(user.faceDescriptor) || user.faceDescriptor.length !== 128) {
      return res.status(400).json({ error: "Register your face first!" });
    }

    const photos = await Photo.find({ roomId: req.params.roomId, status: "processed" });
    if (photos.length === 0) {
      return res.json({ matches: [], maybe: [] });
    }

    const userFace = new Float32Array(user.faceDescriptor);
    const highConfidence = [];
    const lowConfidence = [];

    photos.forEach((photo) => {
      if (!photo.faceDescriptors || photo.faceDescriptors.length === 0) {
        return;
      }

      let bestDistance = 1;
      photo.faceDescriptors.forEach((faceData) => {
        const photoFace = new Float32Array(faceData);
        const distance = Math.sqrt(
          userFace.reduce((acc, value, index) => acc + Math.pow(value - photoFace[index], 2), 0)
        );
        if (distance < bestDistance) {
          bestDistance = distance;
        }
      });

      const payload = {
        ...serializePhoto(photo),
        bestDistance
      };

      if (bestDistance < HIGH_CONFIDENCE_THRESHOLD) {
        highConfidence.push(payload);
      } else if (bestDistance < MAYBE_THRESHOLD) {
        lowConfidence.push(payload);
      }
    });

    highConfidence.sort((a, b) => a.bestDistance - b.bestDistance);
    lowConfidence.sort((a, b) => a.bestDistance - b.bestDistance);

    return res.json({ matches: highConfidence, maybe: lowConfidence });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.get("/:roomId", auth, async (req, res) => {
  try {
    const photos = await Photo.find({ roomId: req.params.roomId }).sort({ createdAt: -1 }).lean();
    return res.json(photos.map(serializePhoto));
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

router.delete("/:photoId", auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.photoId);
    if (!photo) {
      return res.status(404).json({ error: "Photo not found." });
    }

    const room = await Room.findById(photo.roomId);
    if (!room || room.organizerId.toString() !== req.user.userId.toString()) {
      return res.status(403).json({ error: "Only the room organizer can delete photos." });
    }

    if (photo.publicId) {
      await cloudinary.uploader.destroy(photo.publicId).catch(() => {});
    }

    await Photo.findByIdAndDelete(req.params.photoId);
    await imageQueue.emitRoomProgress(room._id.toString());

    return res.json({ message: "Photo deleted." });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

module.exports = router;
