import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'; // <-- Lets us read the URL

@Component({
  selector: 'app-room',
  imports: [], // No forms needed here yet
  templateUrl: './room.html',
  styleUrl: './room.css'
})
export class Room implements OnInit {
  roomCode: string = '';
  isScanning: boolean = false;
  hasMatched: boolean = false;

  // Fake gallery of photos for the presentation
  allPhotos = [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500', // Party crowd
    'https://images.unsplash.com/photo-1540039155732-d674d442c4eb?w=500', // Concert
    'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=500', // Group selfie
    'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=500'  // Event lights
  ];

  constructor(private route: ActivatedRoute) {}

  // This runs the moment the page loads
  ngOnInit() {
    // Grab the ID from the URL (e.g., /room/123456 -> 123456)
    this.roomCode = this.route.snapshot.paramMap.get('id') || 'Unknown Room';
  }

  // The MVP "AI Scan" 
  onUploadSelfie(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.isScanning = true;
      
      // Fake a 2.5 second delay so it looks like the AI is "thinking"
      setTimeout(() => {
        this.isScanning = false;
        this.hasMatched = true;
        
        // For the demo, we just shrink the array to 1 photo to prove it "filtered" them
        this.allPhotos = ['https://images.unsplash.com/photo-1478147427282-58a87a120781?w=500']; 
        
      }, 2500);
    }
  }
}