import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../api.config';
import { RoomSummary } from '../models';
import { AuthService } from './auth';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private readonly roomsUrl = `${API_BASE}/rooms`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  createRoom(eventName: string): Observable<{ message: string; roomCode: string; room: RoomSummary }> {
    return this.http.post<{ message: string; roomCode: string; room: RoomSummary }>(
      `${this.roomsUrl}/create`,
      { eventName },
      { headers: this.auth.getAuthHeaders() }
    );
  }

  getMyRooms(): Observable<RoomSummary[]> {
    return this.http.get<RoomSummary[]>(`${this.roomsUrl}/my-rooms`, {
      headers: this.auth.getAuthHeaders()
    });
  }

  getRoom(roomCode: string): Observable<RoomSummary> {
    return this.http.get<RoomSummary>(`${this.roomsUrl}/${roomCode}`, {
      headers: this.auth.getAuthHeaders()
    });
  }
}
