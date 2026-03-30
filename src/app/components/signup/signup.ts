import { Component } from '@angular/core';
import { RouterLink } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 

@Component({
  selector: 'app-signup',
  imports: [RouterLink, FormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {

  // Data Buckets 
  userName = '';
  userEmail = '';
  userPassword = '';

  onSignup(){
    console.log("--- SIGNUP ATTEMPT ---");
    console.log("Name captured:", this.userName);
    console.log("Email captured:", this.userEmail);
    console.log("Password captured:", this.userPassword);
    alert("Signup button clicked! Check your console.");

  }
}
