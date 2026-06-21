import { Component, Signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TasksStore } from '../../../services/tasks.store';

/** Couleur d'accent par module (RG-002), appliquee a l'actif et au survol. */
type ItemAccent = 'blue' | 'orange' | 'green' | 'violet' | 'gray';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  /** Couleur d'accent ; bleu par defaut si absent. */
  accent?: ItemAccent;
  /** Compteur live (badge) ; uniquement sur Taches. */
  badge?: Signal<number>;
  /** Libelle accessible (AC-06) ; retombe sur `label` si absent. */
  ariaLabel?: string;
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
  private tasks = inject(TasksStore);

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
          route: '/cabinet/clients',
          accent: 'gray'
        },
        {
          label: 'Taches',
          icon: 'checkbox',
          route: '/cabinet/taches',
          accent: 'orange',
          badge: this.tasks.pendingCount,
          ariaLabel: 'Taches en attente'
        },
        {
          label: 'Revision',
          icon: 'checklist',
          route: '/cabinet/revision',
          accent: 'green'
        }
      ]
    },
    {
      title: 'Comptabilite',
      items: [
        {
          label: 'Echeancier fiscal & social',
          icon: 'calendar',
          route: '/cabinet/echeancier',
          accent: 'blue'
        },
        {
          label: 'Reception / Flux e-invoicing',
          icon: 'invoice',
          route: '/cabinet/reception',
          accent: 'blue'
        }
      ]
    },
    {
      title: 'Social',
      items: [
        {
          label: 'Social',
          icon: 'people',
          route: '/cabinet/social',
          accent: 'violet'
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
