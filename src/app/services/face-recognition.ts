import { Injectable } from '@angular/core';
import * as faceapi from 'face-api.js';

@Injectable({
  providedIn: 'root'
})
export class FaceRecognition {
  private modelsLoaded = false;

  async loadModels(): Promise<void> {
    if (this.modelsLoaded) {
      return;
    }

    const modelUrl = '/models';
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
      faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
      faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl)
    ]);

    this.modelsLoaded = true;
  }

  async getFaceDescriptor(imageElement: HTMLImageElement): Promise<Float32Array | null> {
    if (!this.modelsLoaded) {
      await this.loadModels();
    }

    const detection = await faceapi
      .detectSingleFace(imageElement)
      .withFaceLandmarks()
      .withFaceDescriptor();

    return detection?.descriptor ?? null;
  }

  async extractDescriptorFromFile(file: File): Promise<number[] | null> {
    const image = await this.loadImageFromFile(file);
    const descriptor = await this.getFaceDescriptor(image);
    return descriptor ? Array.from(descriptor) : null;
  }

  private loadImageFromFile(file: File): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);

      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(image);
      };

      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Unable to load the selected image.'));
      };

      image.src = objectUrl;
    });
  }
}
