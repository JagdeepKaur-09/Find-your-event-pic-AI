import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-room',
  imports: [],
  templateUrl: './room.html',
  styleUrl: './room.css'
})
export class Room implements OnInit {
  roomCode: string = '';
  userRole: string = 'attendee'; // Default to attendee
  hasSavedFace: boolean = false;

  // Fake gallery for the presentation
  allPhotos = [
    'sif-pic.jpg', 
    'https://images.unsplash.com/photo-1540039155732-d674d442c4eb?w=500'
  ];

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    // 1. Get the Room Code
    this.roomCode = this.route.snapshot.paramMap.get('id') || 'Unknown';
    
    // 2. Check if they are Organizer or Attendee
    this.route.queryParams.subscribe(params => {
      this.userRole = params['role'] || 'attendee';
    });

    // 3. If Attendee, check if they gave us face data during signup
    if (this.userRole === 'attendee') {
      const savedFace = localStorage.getItem('myFaceMath');
      if (savedFace) {
        this.hasSavedFace = true;
        this.runAutomaticFaceMatch();
      }
    }
  }

  // --- ORGANIZER FUNCTION ---
  onBulkUploadGallery(event: any) {
    const files = event.target.files;
    alert(`Pretending to upload ${files.length} photos to the main gallery!`);
    // Tomorrow we will write the code to loop through these and extract ALL faces
  }

  // --- ATTENDEE FUNCTION ---
  runAutomaticFaceMatch() {
    console.log("Attendee detected. Automatically filtering gallery using face from Signup...");
    // Tomorrow we will write the Euclidean Distance math here to actually filter the photos!
  }
}