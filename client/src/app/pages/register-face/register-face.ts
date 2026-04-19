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
  // ViewChild is only safe to access from ngAfterViewInit onwards
  @ViewChild('video') videoRef!: ElementRef<HTMLVideoElement>;

  loading = true;
  capturing = false;
  statusMessage = 'Initializing AI models...';

  private stream: MediaStream | null = null;

  constructor(private http: HttpClient, private router: Router) { }

  async ngOnInit(): Promise<void> {
    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }
    await this.loadModels();
  }

  // Start the webcam only after the view (and #video element) is ready
  ngAfterViewInit(): void {
    if (!this.loading) {
      this.startVideo();
    }
  }

  async loadModels(): Promise<void> {
    try {
      const MODEL_URL = '/assets/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      this.loading = false;
      this.statusMessage = 'AI Ready. Center your face in the camera.';
      // View is already initialized by now (ngAfterViewInit already ran),
      // so we can safely start the video here
      this.startVideo();
    } catch {
      this.statusMessage = 'Failed to load AI models. Please refresh.';
    }
  }

  startVideo(): void {
    if (!this.videoRef) return;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
      .then(stream => {
        this.stream = stream;
        this.videoRef.nativeElement.srcObject = stream;
      })
      .catch(err => {
        this.statusMessage = 'Webcam error: ' + (err as Error).message;
      });
  }

  async captureAndSave(): Promise<void> {
    if (!this.videoRef) return;
    this.capturing = true;
    this.statusMessage = 'Scanning face...';

    const detection = await faceapi
      .detectSingleFace(this.videoRef.nativeElement, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (!detection) {
      this.statusMessage = 'Face not detected clearly. Please try again.';
      this.capturing = false;
      return;
    }

    const faceDescriptor = Array.from(detection.descriptor);
    this.saveToDatabase(faceDescriptor);
  }

  private saveToDatabase(faceDescriptor: number[]): void {
    const headers = new HttpHeaders({
      Authorization: `Bearer ${localStorage.getItem('token')}`
    });

    this.http.post(`${API_BASE}/auth/register-face`, { faceDescriptor }, { headers })
      .subscribe({
        next: () => {
          this.capturing = false;
          this.statusMessage = '✅ Face registered successfully!';
          setTimeout(() => this.router.navigate(['/dashboard']), 1500);
        },
        error: (err) => {
          this.capturing = false;
          this.statusMessage = 'Failed to save: ' + (err.error?.error ?? 'Unknown error');
        }
      });
  }

  // Stop the webcam stream when leaving the page to release the camera
  ngOnDestroy(): void {
    this.stream?.getTracks().forEach(t => t.stop());
  }
}
