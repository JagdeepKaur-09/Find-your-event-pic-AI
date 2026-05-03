import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthUser } from '../../models';
import { AuthService } from '../../services/auth';
import { FaceRecognition } from '../../services/face-recognition';

@Component({
  selector: 'app-face-profile',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './face-profile.html',
  styleUrl: './face-profile.css'
})
export class FaceProfile {
  profile: AuthUser | null = null;
  consentGiven = true;
  descriptor: number[] | null = null;
  selectedFileName = '';
  statusMessage = '';
  errorMessage = '';
  loading = true;
  saving = false;
  scanning = false;
  deleting = false;

  constructor(
    private auth: AuthService,
    private faceRecognition: FaceRecognition,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
    await this.faceRecognition.loadModels();
  }

  async onReferenceFaceSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.scanning = true;
    this.errorMessage = '';
    this.statusMessage = 'Scanning your face profile...';
    this.selectedFileName = file.name;

    try {
      const descriptor = await this.faceRecognition.extractDescriptorFromFile(file);
      if (!descriptor) {
        this.errorMessage = 'We could not find a clear face in that image. Try a front-facing photo.';
        this.descriptor = null;
        return;
      }

      this.descriptor = descriptor;
      this.statusMessage = 'Face profile ready to save.';
    } catch (error) {
      this.errorMessage = (error as Error).message;
    } finally {
      this.scanning = false;
    }
  }

  async saveFaceProfile(): Promise<void> {
    if (!this.descriptor) {
      this.errorMessage = 'Select a clear face image before saving.';
      return;
    }

    if (!this.consentGiven) {
      this.errorMessage = 'Please confirm biometric consent before saving your face profile.';
      return;
    }

    this.saving = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(
        this.auth.registerFace(this.descriptor, this.consentGiven)
      );
      this.auth.updateStoredUser(response.user);
      this.profile = response.user;
      this.statusMessage = 'Face profile saved successfully.';
      this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to save face profile.');
    } finally {
      this.saving = false;
    }
  }

  async deleteFaceProfile(): Promise<void> {
    this.deleting = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(this.auth.deleteFace());
      this.auth.updateStoredUser(response.user);
      this.profile = response.user;
      this.descriptor = null;
      this.selectedFileName = '';
      this.statusMessage = 'Face profile removed.';
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to delete face profile.');
    } finally {
      this.deleting = false;
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading = true;
    try {
      this.profile = await firstValueFrom(this.auth.getProfile());
      this.auth.updateStoredUser(this.profile);
      this.consentGiven = this.profile.consentGiven || !this.profile.hasFace;
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to load your profile.');
    } finally {
      this.loading = false;
    }
  }

  private readError(error: unknown, fallback: string): string {
    const response = error as { error?: { error?: string } };
    return response.error?.error ?? fallback;
  }
}
