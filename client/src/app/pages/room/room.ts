import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { PhotoService } from '../../services/photo';
import { API_BASE } from '../../api.config';
import { io, Socket } from 'socket.io-client';

interface Photo {
  _id: string;
  cloudinaryUrl: string;
  status: string;
  roomId: string;
}

interface Room {
  _id: string;
  eventName: string;
  roomCode: string;
  status: string;
  organizerId: string;
}

interface MatchResult {
  matches: Photo[];
  maybe: Photo[];
}

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css'
})
export class RoomComponent implements OnInit, OnDestroy {
  room: Room | null = null;
  photos: Photo[] = [];
  errorMsg = '';
  roomId = '';
  matchedPhotos: Photo[] = [];
  maybePhotos: Photo[] = [];
  isMatching = false;
  isProcessing = false;
  /** true once we've confirmed the user has a face descriptor saved */
  hasFaceRegistered = false;
  /** true while we're checking face registration status */
  checkingFace = true;

  private socket: Socket | null = null;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private photoService: PhotoService,
    public router: Router
  ) { }

  ngOnInit(): void {
    const roomCode = this.route.snapshot.paramMap.get('roomCode');

    this.http.get<Room>(`${API_BASE}/rooms/${roomCode}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res: Room) => {
        this.room = res;
        this.roomId = res._id;
        this.loadPhotos(res._id);
        this.connectSocket(res._id);
      },
      error: () => { this.errorMsg = 'Room not found!'; }
    });

    // Check if the user already has a face registered
    this.http.get<{ hasFace: boolean }>(`${API_BASE}/auth/me`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => {
        this.hasFaceRegistered = res.hasFace;
        this.checkingFace = false;
      },
      error: () => { this.checkingFace = false; }
    });
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({ Authorization: `Bearer ${localStorage.getItem('token')}` });
  }

  // ── Socket.io ──────────────────────────────────────────────────────────────
  private connectSocket(roomId: string): void {
    this.socket = io('http://localhost:5000', { transports: ['websocket'] });

    this.socket.on('connect', () => {
      this.socket!.emit('joinRoom', roomId);
    });

    this.socket.on('photoProcessed', (data: { photoId: string; status: string }) => {
      const idx = this.photos.findIndex(p => p._id === data.photoId);
      if (idx !== -1) {
        this.photos = [
          ...this.photos.slice(0, idx),
          { ...this.photos[idx], status: data.status },
          ...this.photos.slice(idx + 1)
        ];
      }
      this.isProcessing = this.photos.some(p => p.status === 'processing');
    });
  }

  // ── Data ───────────────────────────────────────────────────────────────────
  loadPhotos(roomId: string): void {
    this.http.get<Photo[]>(`${API_BASE}/photos/${roomId}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res: Photo[]) => {
        this.photos = res;
        this.isProcessing = res.some(p => p.status === 'processing');
      },
      error: (err: { error?: { error?: string } }) => {
        this.errorMsg = err.error?.error ?? 'Failed to load photos';
      }
    });
  }

  // ── Computed ───────────────────────────────────────────────────────────────
  get processedCount(): number {
    return this.photos.filter(p => p.status !== 'processing').length;
  }

  // ── Face matching ──────────────────────────────────────────────────────────
  findMyPhotos(): void {
    if (!this.hasFaceRegistered) {
      this.goToConsent();
      return;
    }
    this.isMatching = true;
    this.matchedPhotos = [];
    this.maybePhotos = [];

    this.http.get<MatchResult>(`${API_BASE}/photos/match/${this.roomId}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (data: MatchResult) => {
        this.matchedPhotos = data.matches;
        this.maybePhotos = data.maybe;
        this.isMatching = false;
      },
      error: (err: { error?: { error?: string } }) => {
        this.isMatching = false;
        this.errorMsg = err.error?.error ?? 'Error matching photos.';
      }
    });
  }

  // ── Downloads ──────────────────────────────────────────────────────────────
  downloadImage(imageUrl: string, fileName: string): void {
    this.http.get(imageUrl, { responseType: 'blob' }).subscribe((blob: Blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      window.URL.revokeObjectURL(url);
    });
  }

  downloadAsPDF(): void {
    this.photoService.downloadPdf(this.matchedPhotos.map(p => p.cloudinaryUrl));
  }

  downloadAll(): void {
    this.photos.forEach((photo, index) => {
      setTimeout(() => {
        this.downloadImage(photo.cloudinaryUrl, `Event-${this.room?.eventName}-${index + 1}.jpg`);
      }, index * 200);
    });
  }

  goToUpload(): void { this.router.navigate(['/upload', this.roomId]); }
  goToConsent(): void { this.router.navigate(['/face-consent']); }
}
