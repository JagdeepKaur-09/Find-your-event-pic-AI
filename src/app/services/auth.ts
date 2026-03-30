import { Injectable } from '@angular/core';
// This service can be injected (handed over) to anyone who asks for it.

import { HttpClient } from '@angular/common/http'; // 1. Import the Mail Carrier

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // 2. This is Jagdeep's backend address
  private backendUrl = 'http://localhost:5000/api/auth'; 

  // 3. We "inject" the Mail Carrier (HttpClient) into our Service's constructor
  constructor(private http: HttpClient) { }

  // 4. The function for the Signup page to use
  registerUser(userData: any) {
    console.log("Service is sending Signup data to backend...");
    // We send a POST request to Jagdeep's /register route
    return this.http.post(`${this.backendUrl}/register`, userData);
  }

  // 5. The function for the Login page to use
  loginUser(credentials: any) {
    console.log("Service is sending Login data to backend...");
    // We send a POST request to Jagdeep's /login route
    return this.http.post(`${this.backendUrl}/login`, credentials);
  }
}
