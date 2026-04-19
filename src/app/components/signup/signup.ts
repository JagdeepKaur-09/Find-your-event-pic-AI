import { Component } from '@angular/core';
import { RouterLink, Router } from '@angular/router'; 
import { FormsModule } from '@angular/forms'; 
import { AuthService } from '../../services/auth'; // Import the Chef
import { FaceRecognition } from '../../services/face-recognition';

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

  isScanningFace = false;
  faceCaptured = false;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private aiService: FaceRecognition // <-- Inject Brain
  ) { }

  ngOnInit() {
    this.aiService.loadModels(); // Boot up the AI in the background
  }

  // 1. Capture Face Data First
  async onUploadReferenceFace(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.isScanningFace = true;
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = async () => {
      const descriptor = await this.aiService.getFaceDescriptor(img);
      if (descriptor) {
        // Convert the Float32Array to a standard array and save to browser memory
        localStorage.setItem('myFaceMath', JSON.stringify(Array.from(descriptor)));
        this.faceCaptured = true;
        console.log("✅ Face Biometrics Saved Securely!");
      } else {
        alert("❌ AI couldn't find a face. Please try a clearer photo.");
      }
      this.isScanningFace = false;
    };
  }

  // 2. Then Signup
  onSignup() {
    if (!this.faceCaptured) {
      alert("You must upload a reference photo before signing up!");
      return;
    }

    const newUserData = { name: this.userName, email: this.userEmail, password: this.userPassword };

    this.authService.registerUser(newUserData).subscribe({
      next: (response: any) => {
        if (response.token) {
          localStorage.setItem('token', response.token); 
        }
        
        // 2. Take them straight to the Dashboard!
        this.router.navigate(['/dashboard']); 
      },
      error: (err: any) => { alert("Signup failed."); }
    });
  }
}