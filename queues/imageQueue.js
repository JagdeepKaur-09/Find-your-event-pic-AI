const path = require("path");

const Photo = require("../models/Photo");
const Room = require("../models/Room");

let BullQueue = null;
let canvas = null;
let faceapi = null;

try {
  BullQueue = require("bull");
} catch {}

let queueInstance = null;
const localJobs = [];
let localWorkerActive = false;
let ioInstance = null;
let modelsLoaded = false;

function ensureRuntime() {
  if (canvas && faceapi) {
    return;
  }

  canvas = require("canvas");
  faceapi = require("face-api.js");
  const { Canvas, Image, ImageData } = canvas;
  faceapi.env.monkeyPatch({ Canvas, Image, ImageData });
}

async function ensureModels() {
  if (modelsLoaded) {
    return;
  }

  ensureRuntime();
  const modelDir = path.join(__dirname, "..", "public", "models");

  await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelDir);
  await faceapi.nets.faceLandmark68Net.loadFromDisk(modelDir);
  await faceapi.nets.faceRecognitionNet.loadFromDisk(modelDir);

  modelsLoaded = true;
  console.log("Face-api models loaded in queue worker");
}

async function emitRoomProgress(roomId) {
  const [processingCount, processedCount, failedCount] = await Promise.all([
    Photo.countDocuments({ roomId, status: "processing" }),
    Photo.countDocuments({ roomId, status: "processed" }),
    Photo.countDocuments({ roomId, status: "failed" })
  ]);
  const totalCount = processingCount + processedCount + failedCount;

  let roomStatus = "draft";
  if (totalCount > 0 && processingCount > 0) {
    roomStatus = "processing";
  } else if (totalCount > 0) {
    roomStatus = "ready";
  }

  await Room.findByIdAndUpdate(roomId, {
    status: roomStatus,
    lastUploadAt: totalCount > 0 ? new Date() : null
  });

  if (ioInstance) {
    ioInstance.to(roomId.toString()).emit("roomProgress", {
      roomId: roomId.toString(),
      totalCount,
      processedCount,
      processingCount,
      failedCount,
      status: roomStatus
    });
  }
}

async function markPhotoFailed(photoId, error) {
  const photo = await Photo.findByIdAndUpdate(
    photoId,
    {
      status: "failed",
      processedAt: new Date(),
      processingError: error.message
    },
    { new: true }
  );

  if (!photo) {
    return;
  }

  await emitRoomProgress(photo.roomId.toString());

  if (ioInstance) {
    ioInstance.to(photo.roomId.toString()).emit("photoFailed", {
      photoId: photo._id.toString(),
      roomId: photo.roomId.toString(),
      status: "failed",
      processingError: error.message
    });
  }
}

async function processPhoto({ photoId, imageUrl }) {
  await ensureModels();
  const image = await canvas.loadImage(imageUrl);
  const workingCanvas = canvas.createCanvas(image.width, image.height);
  const context = workingCanvas.getContext("2d");
  context.drawImage(image, 0, 0);

  const detections = await faceapi
    .detectAllFaces(workingCanvas, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
    .withFaceLandmarks()
    .withFaceDescriptors();

  const faceDescriptors = detections.map((detection) => Array.from(detection.descriptor));
  const photo = await Photo.findByIdAndUpdate(
    photoId,
    {
      faceDescriptors,
      status: "processed",
      processedAt: new Date(),
      processingError: null
    },
    { new: true }
  );

  if (!photo) {
    throw new Error(`Photo not found: ${photoId}`);
  }

  await emitRoomProgress(photo.roomId.toString());

  if (ioInstance) {
    ioInstance.to(photo.roomId.toString()).emit("photoProcessed", {
      photoId: photo._id.toString(),
      roomId: photo.roomId.toString(),
      status: "processed",
      cloudinaryUrl: photo.cloudinaryUrl
    });
  }

  return { status: "completed", facesFound: faceDescriptors.length };
}

function runLocalWorker() {
  if (localWorkerActive || localJobs.length === 0) {
    return;
  }

  localWorkerActive = true;
  const nextJob = localJobs.shift();

  processPhoto(nextJob)
    .catch((error) => markPhotoFailed(nextJob.photoId, error))
    .finally(() => {
      localWorkerActive = false;
      runLocalWorker();
    });
}

if (BullQueue && process.env.REDIS_URL) {
  queueInstance = new BullQueue("image-processing", process.env.REDIS_URL);

  queueInstance.process(async (job) => {
    try {
      return await processPhoto(job.data);
    } catch (error) {
      await markPhotoFailed(job.data.photoId, error);
      throw error;
    }
  });

  queueInstance.on("failed", (job, error) => {
    console.error(`Job ${job.id} failed:`, error.message);
  });
}

module.exports = {
  setIo(io) {
    ioInstance = io;
  },
  async add(data) {
    if (queueInstance) {
      return queueInstance.add(data);
    }

    localJobs.push(data);
    runLocalWorker();
    return { queued: true };
  },
  emitRoomProgress,
  async requeueInFlightPhotos() {
    const stuckPhotos = await Photo.find({ status: "processing" }).select("_id cloudinaryUrl");
    const jobs = stuckPhotos.map((photo) => ({
      photoId: photo._id.toString(),
      imageUrl: photo.cloudinaryUrl
    }));

    if (queueInstance) {
      await Promise.all(jobs.map((job) => queueInstance.add(job)));
      return;
    }

    localJobs.push(...jobs);
    runLocalWorker();
  }
};
