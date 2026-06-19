import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register').then(m => m.Register)
  }
];
