import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/landing/landing').then(m => m.Landing)
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register').then(m => m.Register)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login').then(m => m.Login)
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard)
  },
  {
    path: 'cabinet',
    loadComponent: () => import('./layouts/cabinet/cabinet-layout').then(m => m.CabinetLayout),
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/cabinet/dashboard/cabinet-dashboard').then(m => m.CabinetDashboard)
      },
      {
        path: 'clients',
        loadComponent: () => import('./pages/cabinet/clients/clients').then(m => m.Clients)
      },
      {
        path: 'taches',
        loadComponent: () => import('./pages/cabinet/taches/taches').then(m => m.Taches)
      },
      {
        path: 'revision',
        loadComponent: () => import('./pages/cabinet/revision/revision').then(m => m.Revision)
      },
      {
        path: 'social',
        loadComponent: () => import('./pages/cabinet/social/social').then(m => m.Social)
      },
      {
        path: 'echeancier',
        loadComponent: () => import('./pages/cabinet/echeancier/echeancier').then(m => m.Echeancier)
      },
      {
        path: 'reception',
        loadComponent: () => import('./pages/cabinet/reception/reception').then(m => m.Reception)
      },
      {
        path: 'fec',
        loadComponent: () => import('./pages/cabinet/fec/fec-export').then(m => m.FecExport)
      },
      {
        path: 'ged',
        loadComponent: () => import('./pages/cabinet/ged/ged').then(m => m.Ged)
      },
      {
        path: 'equipe',
        loadComponent: () => import('./pages/cabinet/equipe/equipe').then(m => m.Equipe)
      }
    ]
  }
];
