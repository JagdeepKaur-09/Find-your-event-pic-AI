import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

@Injectable({
  providedIn: 'root'
})
export class FaceRecognition {
  private modelsLoaded = false;

  constructor() { }

  // --- Step 1: Boot up the AI ---
  async loadModels() {
    if (this.modelsLoaded) return;

    // This points directly to the public/models folder you created
    const MODEL_URL = '/models'; 

    console.log("AI is loading its neural network...");
    
    // We load all 3 pieces of the brain simultaneously for speed
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
    ]);
    
    console.log("AI Brain Fully Loaded!");
    this.modelsLoaded = true;
  }

  // --- Step 2: Extract the Math from a Face ---
  async getFaceDescriptor(imageElement: HTMLImageElement): Promise<Float32Array | null> {
    // Double check the brain is on
    if (!this.modelsLoaded) await this.loadModels();

    console.log("Scanning face geometry...");

    // The core ML function: Find face -> Map features -> Generate 128 numbers
    const detection = await faceapi.detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      console.error("No face found! The photo might be too blurry or have no people.");
      return null;
    }

    console.log("Face mapped successfully!");
    return detection.descriptor; // This is the 128-number array!
  }
}