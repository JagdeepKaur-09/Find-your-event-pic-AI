import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router'; // <-- Make sure Router is imported
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../services/auth'; 

@Component({
  selector: 'app-login',
  imports: [RouterLink, FormsModule],
  templateUrl: './login.html', // (Make sure this matches your actual HTML filename!)
  styleUrl: './login.css' // (Make sure this matches your actual CSS filename!)
})
export class Login {
  userEmail = '';
  userPassword = '';

  // Inject the Chef AND the Router
  constructor(private authService: AuthService, private router: Router) { }

  onLogin() {
    const credentials = {
      email: this.userEmail,
      password: this.userPassword
    };

    this.authService.loginUser(credentials).subscribe({
      next: (response: any) => {
        console.log("Backend says YES:", response);
        
        // 1. Grab the VIP Wristband and save it to the browser
        localStorage.setItem('token', response.token); 
        
        // 2. Instantly route them to the dashboard page
        this.router.navigate(['/dashboard']); 
      },
      error: (err: any) => {
        console.error("Backend says NO:", err);
        alert("Login Failed. Check your email and password.");
      }
    });
  }
}