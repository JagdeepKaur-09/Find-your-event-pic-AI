import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { io } from 'socket.io-client';
import { jsPDF } from 'jspdf';

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room.html',
  styleUrl: './room.css'
})
export class RoomComponent implements OnInit {
  room: any = null;
  photos: any[] = [];
  errorMsg = '';
  isOrganizer = false;
  roomId: string = ''; 
  matchedPhotos: any[] = [];
maybePhotos: any[] = [];
private socket: any;
isMatching = false;
showAll = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    public router: Router
  ) {}

 ngOnInit() {
    const roomCode = this.route.snapshot.paramMap.get('roomCode');
    const token = localStorage.getItem('token');

    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    this.http.get<any>(`http://localhost:5000/api/rooms/${roomCode}`, {
      headers: new HttpHeaders({ Authorization: `Bearer ${token}` })
    }).subscribe({
      next: (res) => {
        this.room = res;
        this.roomId = res._id; // ADD THIS LINE: Save the database ID
        this.loadPhotos(res._id);
      },
      error: () => this.errorMsg = 'Room not found!'
    });
    this.setupSocket();
  }

  setupSocket() {
    this.socket = io('http://localhost:5000');
    
    // Join the room to receive specific updates
    this.socket.emit('joinRoom', this.roomId);

    this.socket.on('photoProcessed', (data: any) => {
      // Find the photo in your local array and update its status
      const photo = this.photos.find(p => p._id === data.photoId);
      if (photo) {
        photo.status = 'processed';
        // If the user just ran "Find My Photos", trigger a re-check!
        if (this.matchedPhotos.length > 0) this.findMyPhotos();
      }
    });
  }


  // Your findMyPhotos function will now work because this.roomId is set!
  findMyPhotos() {
    this.isMatching = true;
    const token = localStorage.getItem('token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<any>(`http://localhost:5000/api/photos/match/${this.roomId}`, { headers })
      .subscribe({
        next: (data) => {
          this.matchedPhotos = data.matches; // Matches high confidence
          this.maybePhotos = data.maybe;     // Matches lower confidence
          this.isMatching = false;
        },
        error: () => {
          this.isMatching = false;
          alert("Error matching photos.");
        }
      });
}

  getHeaders() {
    const token = localStorage.getItem('token');
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  loadPhotos(roomId: string) {
    this.http.get<any[]>(`http://localhost:5000/api/photos/${roomId}`, {
      headers: this.getHeaders()
    }).subscribe({
      next: (res) => this.photos = res,
      error: (err) => this.errorMsg = err.error?.error
    });
  }

  // Add this method inside the RoomComponent class
downloadImage(imageUrl: string, fileName: string) {
  // We fetch the image as a blob to bypass browser 'open in new tab' behavior
  this.http.get(imageUrl, { responseType: 'blob' }).subscribe((blob) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName; // This forces the download with a specific name
    link.click();
    window.URL.revokeObjectURL(url);
  });
}

downloadAll() {
  this.photos.forEach((photo, index) => {
    // Adding a slight delay to prevent browser download blocking
    setTimeout(() => {
      this.downloadImage(photo.cloudinaryUrl, `Event-${this.room.eventName}-${index + 1}.jpg`);
    }, index * 200); 
  });
}


async downloadAsPDF() {
  const doc = new jsPDF();
  let yOffset = 20; // Starting vertical position in the PDF

  doc.setFontSize(20);
  doc.text(`My Photos: ${this.room.eventName}`, 10, 10);
  doc.setFontSize(12);

  for (let i = 0; i < this.matchedPhotos.length; i++) {
    const photo = this.matchedPhotos[i];
    
    try {
      // 1. Fetch the image and convert to Base64
      const response = await fetch(photo.cloudinaryUrl);
      const blob = await response.blob();
      const base64Data = await this.blobToBase64(blob);

      // 2. Add to PDF (adjusting position for each image)
      // If we run out of space on one page, add a new one
      if (yOffset > 250) {
        doc.addPage();
        yOffset = 20;
      }

      doc.addImage(base64Data, 'JPEG', 10, yOffset, 50, 50);
      doc.text(`Photo ${i + 1}`, 65, yOffset + 25);
      
      yOffset += 60; // Move down for the next image
    } catch (err) {
      console.error("Error adding image to PDF:", err);
    }
  }

  doc.save(`${this.room.eventName}-MyPhotos.pdf`);
}

// Helper function to handle image data
blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, _) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
}