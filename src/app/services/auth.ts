import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE } from '../api.config';
import { AuthResponse, AuthUser } from '../models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly tokenKey = 'token';
  private readonly userKey = 'catchyoface_user';
  private readonly authUrl = `${API_BASE}/auth`;

  constructor(private http: HttpClient) {}

  signup(payload: { name: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/signup`, payload);
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.authUrl}/login`, payload);
  }

  registerFace(faceDescriptor: number[], consentGiven: boolean): Observable<{ message: string; user: AuthUser }> {
    return this.http.post<{ message: string; user: AuthUser }>(
      `${this.authUrl}/register-face`,
      { faceDescriptor, consentGiven },
      { headers: this.getAuthHeaders() }
    );
  }

  getProfile(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.authUrl}/me`, {
      headers: this.getAuthHeaders()
    });
  }

  deleteFace(): Observable<{ message: string; user: AuthUser }> {
    return this.http.delete<{ message: string; user: AuthUser }>(`${this.authUrl}/my-face`, {
      headers: this.getAuthHeaders()
    });
  }

  storeSession(token: string, user?: AuthUser): void {
    localStorage.setItem(this.tokenKey, token);
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  updateStoredUser(user: AuthUser): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }

  getStoredUser(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    return raw ? JSON.parse(raw) as AuthUser : null;
  }

  getToken(): string {
    return localStorage.getItem(this.tokenKey) ?? '';
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  getAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken()}`
    });
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    localStorage.removeItem('myFaceMath');
  }
}
