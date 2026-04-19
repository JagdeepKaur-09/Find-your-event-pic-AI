import { Component } from '@angular/core';
import { RouterOutlet, Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html', 
  styleUrl: './app.css'
})
export class App {
  constructor(private router: Router) {}

  // The Smart Check: Returns true if they have a VIP wristband
  get isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // The Escape Hatch
  onLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('myFaceMath'); // Clear their face data for privacy!
    this.router.navigate(['/login']);
  }
}