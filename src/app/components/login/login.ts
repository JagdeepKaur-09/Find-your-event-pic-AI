import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  userEmail = '';
  userPassword = '';
  loading = false;
  errorMessage = '';

  constructor(private auth: AuthService, private router: Router) {}

  async onLogin(): Promise<void> {
    this.errorMessage = '';

    if (!this.userEmail || !this.userPassword) {
      this.errorMessage = 'Enter both your email and password.';
      return;
    }

    this.loading = true;
    try {
      const response = await firstValueFrom(
        this.auth.login({
          email: this.userEmail,
          password: this.userPassword
        })
      );

      this.auth.storeSession(response.token, response.user);
      this.router.navigate(['/dashboard']);
    } catch (error) {
      this.errorMessage = this.readError(error, 'Login failed. Please try again.');
    } finally {
      this.loading = false;
    }
  }

  private readError(error: unknown, fallback: string): string {
    const response = error as { error?: { error?: string } };
    return response.error?.error ?? fallback;
  }
}
