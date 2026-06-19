import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cabinet-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page">
      <h1>Tableau de bord cabinet</h1>
      <p class="page__placeholder">Contenu a venir...</p>
    </div>
  `,
  styles: [`
    .page {
      h1 {
        font-size: 1.75rem;
        font-weight: 700;
        color: #1a1a2e;
        margin-bottom: 1rem;
      }
      &__placeholder {
        color: #6b7280;
        font-size: 1rem;
      }
    }
  `]
})
export class CabinetDashboard {}
