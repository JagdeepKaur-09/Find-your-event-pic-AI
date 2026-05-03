import { Component, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpEventType } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { filter, map, tap } from 'rxjs/operators';
import { io, Socket } from 'socket.io-client';
import { AuthUser, PhotoRecord, RoomSummary } from '../../models';
import { AuthService } from '../../services/auth';
import { RoomService } from '../../services/room';
import { PhotoService } from '../../services/photo';
import { SOCKET_BASE } from '../../api.config';

interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  original_filename: string;
  width: number;
  height: number;
  bytes: number;
}

@Component({
  selector: 'app-room',
  imports: [CommonModule, RouterLink],
  templateUrl: './room.html',
  styleUrl: './room.css'
})
export class Room implements OnDestroy {
  room: RoomSummary | null = null;
  profile: AuthUser | null = null;
  photos: PhotoRecord[] = [];
  matchedPhotos: PhotoRecord[] = [];
  maybePhotos: PhotoRecord[] = [];
  selectedFiles: File[] = [];
  loading = true;
  uploading = false;
  matching = false;
  errorMessage = '';
  successMessage = '';
  uploadProgress = 0;
  currentUploadName = '';
  showAllPhotos = false;
  processedCount = 0;
  processingCount = 0;
  failedCount = 0;
  totalCount = 0;

  private socket: Socket | null = null;

  constructor(
    private route: ActivatedRoute,
    private auth: AuthService,
    private roomService: RoomService,
    private photoService: PhotoService
  ) {}

  async ngOnInit(): Promise<void> {
    const roomCode = this.route.snapshot.paramMap.get('roomCode');
    if (!roomCode) {
      this.errorMessage = 'No room code was provided.';
      this.loading = false;
      return;
    }

    await this.loadRoom(roomCode);
  }

  ngOnDestroy(): void {
    this.socket?.disconnect();
  }

  get isOrganizer(): boolean {
    return Boolean(this.room?.isOrganizer);
  }

  get hasFace(): boolean {
    return Boolean(this.profile?.hasFace);
  }

  get isProcessing(): boolean {
    return this.processingCount > 0;
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFiles = input.files ? Array.from(input.files) : [];
    this.errorMessage = '';
    this.successMessage = '';
  }

  async uploadPhotos(): Promise<void> {
    if (!this.room || !this.isOrganizer) {
      this.errorMessage = 'Only the room organizer can upload photos.';
      return;
    }

    if (this.selectedFiles.length === 0) {
      this.errorMessage = 'Choose at least one image to upload.';
      return;
    }

    this.uploading = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.uploadProgress = 0;

    try {
      const signature = await firstValueFrom(
        this.photoService.getUploadSignature(this.room._id)
      );

      const uploadedAssets: CloudinaryUploadResponse[] = [];
      for (let index = 0; index < this.selectedFiles.length; index += 1) {
        const file = this.selectedFiles[index];
        this.currentUploadName = file.name;

        const cloudinaryAsset = await firstValueFrom(
          this.photoService.uploadFileToCloudinary(file, signature).pipe(
            tap((event) => {
              if (event.type === HttpEventType.UploadProgress && event.total) {
                const perFileProgress = Math.round((event.loaded / event.total) * 100);
                this.uploadProgress = Math.round(
                  ((index + perFileProgress / 100) / this.selectedFiles.length) * 100
                );
              }
            }),
            filter((event) => event.type === HttpEventType.Response),
            map((event) => event.body as CloudinaryUploadResponse)
          )
        );

        uploadedAssets.push(cloudinaryAsset);
      }

      await firstValueFrom(
        this.photoService.saveUploadedPhotos(this.room._id, uploadedAssets)
      );

      this.selectedFiles = [];
      this.currentUploadName = '';
      this.uploadProgress = 100;
      this.successMessage = 'Photos uploaded. AI processing has started.';
      await this.loadPhotos(this.room._id);
    } catch (error) {
      this.errorMessage = this.readError(error, 'Photo upload failed.');
    } finally {
      this.uploading = false;
    }
  }

  async findMyPhotos(): Promise<void> {
    if (!this.room) {
      return;
    }

    if (!this.hasFace) {
      this.errorMessage = 'Register your face profile first to run matching.';
      return;
    }

    this.matching = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const response = await firstValueFrom(this.photoService.matchPhotos(this.room._id));
      this.matchedPhotos = response.matches;
      this.maybePhotos = response.maybe;
      if (this.matchedPhotos.length === 0 && this.maybePhotos.length === 0) {
        this.successMessage = 'No matches found yet. Try again after processing finishes.';
      }
    } catch (error) {
      this.errorMessage = this.readError(error, 'Photo matching failed.');
    } finally {
      this.matching = false;
    }
  }

  async deletePhoto(photoId: string): Promise<void> {
    if (!this.isOrganizer) {
      return;
    }

    try {
      await firstValueFrom(this.photoService.deletePhoto(photoId));
      this.photos = this.photos.filter((photo) => photo._id !== photoId);
      this.updateCountsFromPhotos();
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to delete the photo.');
    }
  }

  downloadPhoto(photo: PhotoRecord): void {
    const link = document.createElement('a');
    link.href = photo.cloudinaryUrl;
    link.target = '_blank';
    link.rel = 'noopener';
    link.download = photo.originalFilename || 'match-photo';
    link.click();
  }

  async downloadMatchesPdf(): Promise<void> {
    if (this.matchedPhotos.length === 0) {
      this.errorMessage = 'No matched photos are available to export.';
      return;
    }

    try {
      const blob = await firstValueFrom(
        this.photoService.downloadPdf(this.matchedPhotos.map((photo) => photo.cloudinaryUrl))
      );

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.room?.eventName ?? 'CatchYoFace'}-matches.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to generate the PDF export.');
    }
  }

  private async loadRoom(roomCode: string): Promise<void> {
    this.loading = true;
    this.errorMessage = '';

    try {
      const [profile, room] = await Promise.all([
        firstValueFrom(this.auth.getProfile()),
        firstValueFrom(this.roomService.getRoom(roomCode))
      ]);

      this.profile = profile;
      this.room = room;
      this.auth.updateStoredUser(profile);
      await this.loadPhotos(room._id);
      this.connectSocket(room._id);

      if (!room.isOrganizer && profile.hasFace) {
        await this.findMyPhotos();
      }
    } catch (error) {
      this.errorMessage = this.readError(error, 'Failed to load the room.');
    } finally {
      this.loading = false;
    }
  }

  private async loadPhotos(roomId: string): Promise<void> {
    this.photos = await firstValueFrom(this.photoService.getRoomPhotos(roomId));
    this.updateCountsFromPhotos();
  }

  private updateCountsFromPhotos(): void {
    this.processedCount = this.photos.filter((photo) => photo.status === 'processed').length;
    this.processingCount = this.photos.filter((photo) => photo.status === 'processing').length;
    this.failedCount = this.photos.filter((photo) => photo.status === 'failed').length;
    this.totalCount = this.photos.length;
  }

  private connectSocket(roomId: string): void {
    this.socket?.disconnect();
    this.socket = io(SOCKET_BASE);
    this.socket.emit('joinRoom', roomId);

    this.socket.on('roomProgress', (progress: {
      roomId: string;
      totalCount: number;
      processedCount: number;
      processingCount: number;
      failedCount: number;
      status: RoomSummary['status'];
    }) => {
      if (!this.room || progress.roomId !== this.room._id) {
        return;
      }

      this.totalCount = progress.totalCount;
      this.processedCount = progress.processedCount;
      this.processingCount = progress.processingCount;
      this.failedCount = progress.failedCount;
      this.room = { ...this.room, status: progress.status };
    });

    this.socket.on('photoProcessed', (payload: { photoId: string; status: PhotoRecord['status']; cloudinaryUrl: string }) => {
      this.photos = this.photos.map((photo) =>
        photo._id === payload.photoId ? { ...photo, status: payload.status, cloudinaryUrl: payload.cloudinaryUrl } : photo
      );
      this.updateCountsFromPhotos();

      if (!this.isOrganizer && this.hasFace && !this.matching) {
        this.findMyPhotos();
      }
    });

    this.socket.on('photoFailed', (payload: { photoId: string; processingError: string }) => {
      this.photos = this.photos.map((photo) =>
        photo._id === payload.photoId
          ? { ...photo, status: 'failed', processingError: payload.processingError }
          : photo
      );
      this.updateCountsFromPhotos();
    });
  }

  private readError(error: unknown, fallback: string): string {
    const response = error as { error?: { error?: string } };
    return response.error?.error ?? fallback;
  }
}
