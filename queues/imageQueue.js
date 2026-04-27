const Queue = require("bull");
const Photo = require("../models/Photo");
const canvas = require("canvas");
const faceapi = require("face-api.js");
const { Canvas, Image, ImageData } = canvas;

faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const imageQueue = new Queue(
  "image-processing",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

// Holds the Socket.io server instance — set by server.js after startup
let _io = null;
imageQueue.setIo = (io) => { _io = io; };

// Load models once
let modelsLoaded = false;
async function ensureModels() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromDisk("./models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk("./models");
  await faceapi.nets.faceRecognitionNet.loadFromDisk("./models");
  modelsLoaded = true;
  console.log("✅ Face-api models loaded in queue worker");
}

imageQueue.process(async (job) => {
  const { photoId, imageUrl } = job.data;

  await ensureModels();

  const img = await canvas.loadImage(imageUrl);

  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  const faceDescriptors = detections.map(d => Array.from(d.descriptor));

  const photo = await Photo.findByIdAndUpdate(
    photoId,
    { faceDescriptors, status: "processed", processedAt: new Date() },
    { new: true }
  );

  if (!photo) throw new Error(`Photo not found: ${photoId}`);

  // Emit real-time update to all clients watching this room
  if (_io) {
    _io.to(photo.roomId.toString()).emit("photoProcessed", {
      photoId: photo._id.toString(),
      status: "processed",
      cloudinaryUrl: photo.cloudinaryUrl,
      roomId: photo.roomId.toString()
    });
  }

  console.log(`✅ Processed photo ${photoId} — ${faceDescriptors.length} face(s) found`);
  return { status: "completed", facesFound: faceDescriptors.length };
});

imageQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

module.exports = imageQueue;
