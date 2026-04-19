import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class PhotoService {
  private apiUrl = 'http://localhost:5000/api'; // Update if your port is different

  downloadPdf(imageUrls: string[]) {
    const urlsString = imageUrls.join(',');
    const downloadUrl = `${this.apiUrl}/photos/download-pdf?images=${urlsString}`;
    
    // We use window.open because the backend handles the download headers
    window.open(downloadUrl, '_blank');
  }
}