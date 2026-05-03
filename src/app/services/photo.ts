import { Injectable } from '@angular/core';
import { HttpClient, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../api.config';
import { PhotoRecord, UploadSignature } from '../models';
import { AuthService } from './auth';

interface CloudinaryUploadPayload {
  secure_url: string;
  public_id: string;
  original_filename: string;
  width: number;
  height: number;
  bytes: number;
}

@Injectable({
  providedIn: 'root'
})
export class PhotoService {
  private readonly photosUrl = `${API_BASE}/photos`;

  constructor(private http: HttpClient, private auth: AuthService) {}

  getUploadSignature(roomId: string): Observable<UploadSignature> {
    return this.http.post<UploadSignature>(
      `${this.photosUrl}/sign-upload`,
      { roomId },
      { headers: this.auth.getAuthHeaders() }
    );
  }

  uploadFileToCloudinary(file: File, signature: UploadSignature): Observable<HttpEvent<CloudinaryUploadPayload>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', signature.apiKey);
    formData.append('timestamp', String(signature.timestamp));
    formData.append('signature', signature.signature);
    formData.append('folder', signature.folder);

    return this.http.post<CloudinaryUploadPayload>(signature.uploadUrl, formData, {
      observe: 'events',
      reportProgress: true
    });
  }

  saveUploadedPhotos(roomId: string, photos: CloudinaryUploadPayload[]): Observable<{ message: string; photos: PhotoRecord[] }> {
    return this.http.post<{ message: string; photos: PhotoRecord[] }>(
      `${this.photosUrl}/upload`,
      { roomId, photos },
      { headers: this.auth.getAuthHeaders() }
    );
  }

  getRoomPhotos(roomId: string): Observable<PhotoRecord[]> {
    return this.http.get<PhotoRecord[]>(`${this.photosUrl}/${roomId}`, {
      headers: this.auth.getAuthHeaders()
    });
  }

  matchPhotos(roomId: string): Observable<{ matches: PhotoRecord[]; maybe: PhotoRecord[] }> {
    return this.http.get<{ matches: PhotoRecord[]; maybe: PhotoRecord[] }>(
      `${this.photosUrl}/match/${roomId}`,
      { headers: this.auth.getAuthHeaders() }
    );
  }

  deletePhoto(photoId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.photosUrl}/${photoId}`, {
      headers: this.auth.getAuthHeaders()
    });
  }

  downloadPdf(imageUrls: string[]): Observable<Blob> {
    return this.http.post(`${this.photosUrl}/download-pdf`, { images: imageUrls }, {
      headers: this.auth.getAuthHeaders(),
      responseType: 'blob'
    });
  }
}
