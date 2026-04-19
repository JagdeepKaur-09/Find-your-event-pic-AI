import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login';
import { SignupComponent } from './pages/signup/signup';
import { DashboardComponent } from './pages/dashboard/dashboard';
import { UploadComponent } from './pages/upload/upload';
import { RoomComponent } from './pages/room/room';
import { RegisterFaceComponent } from './pages/register-face/register-face';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'upload/:roomId', component: UploadComponent },
  { path: 'room/:roomCode', component: RoomComponent },
  { path: 'register-face', component: RegisterFaceComponent },
];