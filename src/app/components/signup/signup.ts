import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';
import { FaceRecognition } from '../../services/face-recognition';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  userName = '';
  userEmail = '';
  userPassword = '';
  consentGiven = true;
  referenceImageName = '';
  descriptor: number[] | null = null;
  loading = false;
  scanning = false;
  errorMessage = '';
  infoMessage = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private faceRecognition: FaceRecognition
  ) {}

  async ngOnInit(): Promise<void> {
    await this.faceRecognition.loadModels();
  }

  async onUploadReferenceFace(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    this.scanning = true;
    this.errorMessage = '';
    this.infoMessage = 'Scanning your reference image...';
    this.referenceImageName = file.name;

    try {
      const descriptor = await this.faceRecognition.extractDescriptorFromFile(file);
      if (!descriptor) {
        this.descriptor = null;
        this.errorMessage = 'We could not find a clear face in that image. Use a front-facing, well-lit photo.';
        this.infoMessage = '';
        return;
      }

      this.descriptor = descriptor;
      this.infoMessage = 'Reference face saved. Your account can be created now.';
    } catch (error) {
      this.errorMessage = (error as Error).message;
      this.infoMessage = '';
    } finally {
      this.scanning = false;
    }
  }

  async onSignup(): Promise<void> {
    this.errorMessage = '';

    if (!this.userName || !this.userEmail || !this.userPassword) {
      this.errorMessage = 'Fill in your name, email, and password.';
      return;
    }

    if (!this.descriptor) {
      this.errorMessage = 'Upload a clear reference face image before creating your account.';
      return;
    }

    if (!this.consentGiven) {
      this.errorMessage = 'You need to agree to biometric processing before continuing.';
      return;
    }

    this.loading = true;

    try {
      const signupResponse = await firstValueFrom(this.auth.signup({
        name: this.userName,
        email: this.userEmail,
        password: this.userPassword
      }));

      this.auth.storeSession(signupResponse.token, signupResponse.user);

      try {
        const faceResponse = await firstValueFrom(
          this.auth.registerFace(this.descriptor, this.consentGiven)
        );
        this.auth.updateStoredUser(faceResponse.user);
      } catch (error) {
        this.errorMessage = this.readError(
          error,
          'Your account was created, but face setup failed. Please finish it from the Face Profile page.'
        );
        this.router.navigate(['/face-profile']);
        return;
      }

      this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage = this.readError(error, 'Signup failed. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private readError(error: unknown, fallback: string): string {
    const response = error as { error?: { error?: string } };
    return response.error?.error ?? fallback;
  }
}
