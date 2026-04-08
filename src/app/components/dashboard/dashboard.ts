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
        alert(`Room Created! Your code is: ${this.createdRoomCode}`);
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
      alert("Please enter a room code!");
      return;
    }
    // Tomorrow, we will route them to the actual room page: /room/abc123
    alert(`Pretending to join room: ${this.joinRoomCode}. Our AI will use the face you provided at signup!`);
  }

  onLogout() {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}