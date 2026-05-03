import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/landing/landing').then((m) => m.Landing)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login').then((m) => m.Login)
  },
  {
    path: 'signup',
    loadComponent: () => import('./components/signup/signup').then((m) => m.Signup)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard').then((m) => m.Dashboard)
  },
  {
    path: 'face-profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/face-profile/face-profile').then((m) => m.FaceProfile)
  },
  {
    path: 'room/:roomCode',
    canActivate: [authGuard],
    loadComponent: () => import('./components/room/room').then((m) => m.Room)
  },
  { path: '**', redirectTo: '' }
];
