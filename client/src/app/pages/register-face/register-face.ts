import { Component, ElementRef, ViewChild, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import * as faceapi from 'face-api.js';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { API_BASE } from '../../api.config';

@Component({
  selector: 'app-register-face',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './register-face.html',
  styleUrl: './register-face.css'
})
export class RegisterFaceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  capturing = false;
  statusMessage = 'Initializing AI models...';
  debugInfo = '';

  private stream: MediaStream | null = null;

  constructor(private http: HttpClient, private router: Router) { }

  async ngOnInit(): Promise<void> {
    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }
    if (!localStorage.getItem('faceConsentGiven')) {
      this.router.navigate(['/face-consent']);
      return;
    }
    await this.loadModels();
  }

  ngAfterViewInit(): void {
    if (!this.loading) this.startVideo();
  }

  async loadModels(): Promise<void> {
    try {
      const MODEL_URL = '/assets/models';
      await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
      await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
      await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
      this.loading = false;
      this.statusMessage = 'AI Ready. Center your face and click Capture.';
      this.startVideo();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[RegisterFace] Model load error:', msg);
      this.statusMessage = 'Failed to load AI models. Please refresh the page.';
    }
  }

  startVideo(): void {
    if (!this.videoRef) return;
    navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480, facingMode: 'user' }
    }).then(stream => {
      this.stream = stream;
      const video = this.videoRef.nativeElement;
      video.srcObject = stream;
      video.play();
    }).catch((err: Error) => {
      console.error('[RegisterFace] Camera error:', err);
      this.statusMessage = 'Camera error: ' + err.message;
    });
  }

  async captureAndSave(): Promise<void> {
    if (this.capturing) return;

    const video = this.videoRef?.nativeElement;
    if (!video) {
      this.statusMessage = 'Camera not ready. Please refresh.';
      return;
    }

    // Wait for video to be playing
    if (video.readyState < 2 || video.paused || video.videoWidth === 0) {
      this.statusMessage = 'Camera is still loading. Please wait a moment and try again.';
      return;
    }

    this.capturing = true;
    this.statusMessage = 'Scanning your face...';

    try {
      // Draw current video frame to canvas — more reliable than passing video directly
      const canvas = this.canvasRef.nativeElement;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0);

      this.debugInfo = `Frame: ${video.videoWidth}x${video.videoHeight}`;

      // Try multiple inputSizes for better detection
      let detection = null;
      for (const inputSize of [320, 416, 512, 608]) {
        const opts = new faceapi.TinyFaceDetectorOptions({
          inputSize,
          scoreThreshold: 0.3
        });
        detection = await faceapi
          .detectSingleFace(canvas, opts)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detection) {
          this.debugInfo += ` | inputSize=${inputSize} score=${detection.detection.score.toFixed(2)}`;
          break;
        }
      }

      if (!detection) {
        this.statusMessage = 'No face detected. Tips: face the camera directly, ensure good lighting, move closer.';
        this.capturing = false;
        return;
      }

      const faceDescriptor = Array.from(detection.descriptor);
      this.statusMessage = 'Face detected! Saving...';
      this.saveToDatabase(faceDescriptor);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[RegisterFace] Capture error:', msg);
      this.statusMessage = 'Error during capture: ' + msg;
      this.capturing = false;
    }
  }

  private saveToDatabase(faceDescriptor: number[]): void {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    this.http.post(`${API_BASE}/auth/register-face`, { faceDescriptor }, { headers })
      .subscribe({
        next: () => {
          this.capturing = false;
          this.statusMessage = '✅ Face registered! Redirecting...';
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        },
        error: (err) => {
          console.error('[RegisterFace] Save error:', err);
          this.capturing = false;
          this.statusMessage = 'Save failed: ' + (err.error?.error ?? err.message ?? 'Unknown error');
        }
      });
  }

  ngOnDestroy(): void {
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
