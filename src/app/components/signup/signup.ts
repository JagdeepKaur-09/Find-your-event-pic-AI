import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../services/auth'; // Import the Chef

@Component({
  selector: 'app-signup',
  imports: [RouterLink, FormsModule], // No AuthService here!
  templateUrl: './signup.html',
  styleUrl: './signup.css'
})
export class Signup {
  userName = '';
  userEmail = '';
  userPassword = '';

  // Inject the Chef AND the Angular Router (so we can change pages)
  constructor(private authService: AuthService, private router: Router) { }

  onSignup() {
    const newUserData = {
      name: this.userName,
      email: this.userEmail,
      password: this.userPassword
    };

    // Hand the data to the Chef
    this.authService.registerUser(newUserData).subscribe({
      next: (response:any) => {
        console.log("Success!", response);
        alert("Account Created! Redirecting to Login...");
        this.router.navigate(['/login']); // Instantly send them to the login page
      },
      error: (err:any) => {
        console.error("Signup Failed:", err);
        alert("Signup failed. That email might already be used.");
      }
    });
  }
}