export interface AuthUser {
  id: string;
  name: string;
  email: string;
  consentGiven: boolean;
  hasFace: boolean;
  faceRegisteredAt: string | null;
  faceExpiresAt: string | null;
}

export interface RoomSummary {
  _id: string;
  eventName: string;
  roomCode: string;
  status: 'draft' | 'processing' | 'ready' | 'archived';
  organizerId: string;
  lastUploadAt: string | null;
  isOrganizer: boolean;
  photoCount: number;
  processedCount: number;
  processingCount: number;
  failedCount: number;
}

export interface PhotoRecord {
  _id: string;
  roomId: string;
  cloudinaryUrl: string;
  publicId: string;
  originalFilename: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
  status: 'processing' | 'processed' | 'failed';
  processedAt: string | null;
  processingError: string | null;
  bestDistance?: number;
}

export interface UploadSignature {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
  uploadUrl: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
  message: string;
}
