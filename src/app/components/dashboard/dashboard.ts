import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { FaceRecognition } from '../../services/face-recognition';

@Component({
  selector: 'app-dashboard',
  imports: [FormsModule],
  templateUrl: './dashboard.html', // (Make sure this matches!)
  styleUrl: './dashboard.css'
})
export class Dashboard {
  // Organizer Variables
  newEventName = '';
  createdRoomCode = '';

  // Attendee Variables
  joinRoomCode = '';

  constructor(private router: Router, private http: HttpClient , private aiService: FaceRecognition) {}

  ngOnInit() {
  this.aiService.loadModels();
  }

  // --- ORGANIZER: Create a new room ---
  onCreateRoom() {
    if (!this.newEventName) {
      alert("Please enter an event name!");
      return;
    }

    const roomData = { eventName: this.newEventName, organizerId: "123456789012345678901234" };

    this.http.post('http://localhost:5000/api/rooms/create', roomData).subscribe({
      next: (res: any) => {
        this.createdRoomCode = res.roomCode;
        this.router.navigate(['/room', res.roomCode], { queryParams: { role: 'organizer' }});
      },
      error: (err: any) => {
        console.error("Error creating room:", err);
        alert("Failed to create room.");
      }
    });
  }

  // --- ATTENDEE: Join a room ---
  onJoinRoom() {
    if (!this.joinRoomCode) {
      return;
    }
    /// Defensive Programming: If they paste the whole URL, just grab the last part!
    // e.g., "localhost:4200/room/abc" becomes "abc"
    const cleanRoomCode = this.joinRoomCode.split('/').pop()?.trim();

    // Use the Angular Router to actually send them to the room!
    this.router.navigate(['/room', cleanRoomCode], { queryParams: { role: 'attendee' }});
  }

  onLogout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}