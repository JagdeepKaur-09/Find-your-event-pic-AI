const Queue = require("bull");
const Photo = require("../models/Photo");
const { createCanvas, loadImage } = require("@napi-rs/canvas");
const faceapi = require("face-api.js");

// Proper monkey-patch for @napi-rs/canvas with face-api.js
const OffscreenCanvas = createCanvas(1, 1).constructor;
faceapi.env.monkeyPatch({
  Canvas: OffscreenCanvas,
  createCanvasElement: () => createCanvas(300, 300),
  createImageElement: () => ({}),
  ImageData: Uint8ClampedArray
});

const imageQueue = new Queue(
  "image-processing",
  process.env.REDIS_URL || "redis://127.0.0.1:6379"
);

let _io = null;
imageQueue.setIo = (io) => { _io = io; };

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

  const img = await loadImage(imageUrl);

  // Draw onto a canvas so face-api can process it
  const cvs = createCanvas(img.width, img.height);
  const ctx = cvs.getContext("2d");
  ctx.drawImage(img, 0, 0);

  const detections = await faceapi
    .detectAllFaces(cvs, new faceapi.TinyFaceDetectorOptions())
    .withFaceLandmarks()
    .withFaceDescriptors();

  const faceDescriptors = detections.map(d => Array.from(d.descriptor));

  const photo = await Photo.findByIdAndUpdate(
    photoId,
    { faceDescriptors, status: "processed", processedAt: new Date() },
    { new: true }
  );

  if (!photo) throw new Error(`Photo not found: ${photoId}`);

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
