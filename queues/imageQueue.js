const Queue = require("bull");
const Photo = require("../models/Photo");
const canvas = require("canvas");
const faceapi = require("face-api.js");
const { Canvas, Image, ImageData } = canvas;

// Patch face-api to use node-canvas
faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

const imageQueue = new Queue(
  "image-processing",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

// Load models once when the worker starts
let modelsLoaded = false;
async function ensureModels() {
  if (modelsLoaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromDisk("./models");
  await faceapi.nets.faceLandmark68Net.loadFromDisk("./models");
  await faceapi.nets.faceRecognitionNet.loadFromDisk("./models");
  modelsLoaded = true;
  console.log("✅ Face-api models loaded in queue worker");
}

// Background worker — processes one job at a time
imageQueue.process(async (job) => {
  const { photoId, imageUrl } = job.data;

  await ensureModels();

  // Load image from Cloudinary URL
  const img = await canvas.loadImage(imageUrl);

  // Run AI face detection
  const detections = await faceapi
    .detectAllFaces(img, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  const faceDescriptors = detections.map(d => Array.from(d.descriptor));

  // Update the photo record with face data and mark as processed
  const photo = await Photo.findByIdAndUpdate(
    photoId,
    { faceDescriptors, status: "processed", processedAt: new Date() },
    { new: true }
  );

  if (!photo) throw new Error(`Photo not found: ${photoId}`);

  console.log(`✅ Processed photo ${photoId} — ${faceDescriptors.length} face(s) found`);
  return { status: "completed", facesFound: faceDescriptors.length };
});

// Log failures
imageQueue.on("failed", (job, err) => {
  console.error(`❌ Job ${job.id} failed:`, err.message);
});

module.exports = imageQueue;
