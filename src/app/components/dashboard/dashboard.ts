import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AuthUser, RoomSummary } from '../../models';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard {
  profile: AuthUser | null = null;
  rooms: RoomSummary[] = [];
  newEventName = '';
  joinRoomCode = '';
  loading = true;
  creating = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private auth: AuthService,
    private roomService: RoomService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadDashboard();
  }

  async createRoom(): Promise<void> {
    if (!this.newEventName.trim()) {
      this.errorMessage = 'Enter an event name before creating a room.';
      return;
    }

    this.creating = true;
    this.errorMessage = '';

    try {
      const response = await firstValueFrom(this.roomService.createRoom(this.newEventName.trim()));
      this.rooms = [response.room, ...this.rooms];
      this.newEventName = '';
      this.successMessage = `Room ${response.roomCode} created successfully.`;
      this.router.navigate(['/room', response.roomCode]);
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to create the room.');
    } finally {
      this.creating = false;
    }
  }

  joinRoom(): void {
    const roomCode = this.joinRoomCode.split('/').pop()?.trim();
    if (!roomCode) {
      this.errorMessage = 'Enter a room code first.';
      return;
    }

    this.router.navigate(['/room', roomCode]);
  }

  openRoom(roomCode: string): void {
    this.router.navigate(['/room', roomCode]);
  }

  private async loadDashboard(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [profile, rooms] = await Promise.all([
        firstValueFrom(this.auth.getProfile()),
        firstValueFrom(this.roomService.getMyRooms())
      ]);

      this.profile = profile;
      this.auth.updateStoredUser(profile);
      this.rooms = rooms;
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to load your dashboard.');
    } finally {
      this.loading = false;
    }
  }

  private readError(error: unknown, fallback: string): string {
    const response = error as { error?: { error?: string } };
    return response.error?.error ?? fallback;
  }
}
