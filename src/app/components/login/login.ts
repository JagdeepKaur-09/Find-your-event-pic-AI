import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 
import { AuthService} from '../../services/auth';


@Component({
  selector: 'app-login',
  imports: [RouterLink , FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  constructor(private authService : AuthService) { } // We injected Auth Service to Login component 

  //  Create empty buckets to hold what the user types
  userEmail = '';
  userPassword = '';

  // Create the function that runs when the button is clicked
  onLogin() {
    console.log("--- LOGIN ATTEMPT ---");
    console.log("Email captured:", this.userEmail);
    console.log("Password captured:", this.userPassword);
    alert("Login button clicked! Check your developer console.");
  }
}
