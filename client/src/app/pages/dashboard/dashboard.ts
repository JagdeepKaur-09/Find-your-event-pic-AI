import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Router } from '@angular/router';
import { API_BASE } from '../../api.config';

interface Room {
  _id: string;
  eventName: string;
  roomCode: string;
  status: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class DashboardComponent implements OnInit {
  rooms: Room[] = [];
  errorMsg = '';
  newRoomName = '';
  joinCode = '';
  foundRoom: Room | null = null;
  searchDone = false;
  currentUserName = '';
  currentUserEmail = '';
  hasFaceRegistered = false;

  constructor(private http: HttpClient, public router: Router) { }

  ngOnInit(): void {
    if (!localStorage.getItem('token')) {
      this.router.navigate(['/login']);
      return;
    }
    this.getRooms();
    this.loadCurrentUser();
  }

  loadCurrentUser(): void {
    this.http.get<{ name: string; email: string; hasFace: boolean }>(
      `${API_BASE}/auth/me`, { headers: this.getHeaders() }
    ).subscribe({
      next: (user) => {
        this.currentUserName = user.name;
        this.currentUserEmail = user.email;
        this.hasFaceRegistered = user.hasFace;
      },
      error: () => { }
    });
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  getRooms(): void {
    this.http.get<Room[]>(`${API_BASE}/rooms/my-rooms`, { headers: this.getHeaders() })
      .subscribe({
        next: (res) => { this.rooms = res; this.errorMsg = ''; },
        error: (err) => { this.errorMsg = err.error?.error ?? 'Failed to load rooms.'; }
      });
  }

  createRoom(): void {
    if (!this.newRoomName.trim()) {
      this.errorMsg = 'Please enter an event name.';
      return;
    }
    const duplicate = this.rooms.find(
      r => r.eventName.toLowerCase() === this.newRoomName.toLowerCase()
    );
    if (duplicate) {
      this.errorMsg = 'A room with this name already exists.';
      return;
    }
    this.errorMsg = '';

    this.http.post<{ roomCode: string }>(`${API_BASE}/rooms/create`,
      { eventName: this.newRoomName },
      { headers: this.getHeaders() }
    ).subscribe({
      next: (res) => {
        this.newRoomName = '';
        this.errorMsg = '';
        alert('Room created! Code: ' + res.roomCode);
        this.getRooms();
      },
      error: (err) => { this.errorMsg = err.error?.error ?? 'Failed to create room.'; }
    });
  }

  enterRoom(): void {
    const code = this.joinCode.trim();
    if (!code) {
      this.errorMsg = 'Please enter a room code.';
      this.foundRoom = null;
      this.searchDone = false;
      return;
    }
    this.errorMsg = '';
    this.searchDone = true;

    // Look up the room by code from the backend
    this.http.get<Room>(`${API_BASE}/rooms/${code}`, { headers: this.getHeaders() })
      .subscribe({
        next: (room) => {
          this.foundRoom = room;
          this.errorMsg = '';
        },
        error: () => {
          this.foundRoom = null;
          this.errorMsg = `No room found with code "${code}". Please check and try again.`;
        }
      });
  }

  clearSearch(): void {
    this.joinCode = '';
    this.foundRoom = null;
    this.searchDone = false;
    this.errorMsg = '';
  }

  goToUpload(roomId: string): void {
    this.router.navigate(['/upload', roomId]);
  }

  goToRoom(roomCode: string): void {
    this.router.navigate(['/room', roomCode]);
  }

  logout(): void {
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
