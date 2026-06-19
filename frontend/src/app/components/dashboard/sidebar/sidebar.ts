import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class Sidebar {
  menuGroups: MenuGroup[] = [
    {
      title: 'Pilotage',
      items: [
        {
          label: 'Tableau de bord',
          icon: 'dashboard',
          route: '/cabinet/dashboard'
        }
      ]
    },
    {
      title: 'Gestion',
      items: [
        {
          label: 'Dossiers / Clients',
          icon: 'folder',
          route: '/cabinet/clients'
        },
        {
          label: 'Taches & revision',
          icon: 'tasks',
          route: '/cabinet/taches'
        }
      ]
    },
    {
      title: 'Comptabilite',
      items: [
        {
          label: 'Echeancier fiscal & social',
          icon: 'calendar',
          route: '/cabinet/echeancier'
        },
        {
          label: 'Reception / Flux e-invoicing',
          icon: 'invoice',
          route: '/cabinet/reception'
        }
      ]
    },
    {
      title: 'Organisation',
      items: [
        {
          label: 'GED / Bibliotheque',
          icon: 'library',
          route: '/cabinet/ged'
        },
        {
          label: 'Equipe & affectations',
          icon: 'team',
          route: '/cabinet/equipe'
        }
      ]
    }
  ];
}
