import { Routes } from '@angular/router';
import { Landing } from './components/landing/landing';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { Dashboard } from './components/dashboard/dashboard';
import { Room } from './components/room/room';

export const routes: Routes = [
  // When the URL is exactly localhost:4200/ (empty path), show the Landing Page
  { path: '', component: Landing },
  
  // When the URL is localhost:4200/login, show the Login Page
  { path: 'login', component: Login },

  { path: 'signup', component: Signup },

  { path: 'dashboard', component: Dashboard },

  { path: 'room/:id', component: Room }
];