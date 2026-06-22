import { Component, EventEmitter, Input, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Gabarit } from '../../../services/gabarits';
import { GabaritStore } from '../../../services/gabarit.store';

/**
 * Bibliotheque de gabarits d'ecritures (AC-01) : cartes des gabarits predefinis
 * et personnalises disponibles pour le dossier, + carte "Creer un gabarit".
 */
@Component({
  selector: 'app-gabarit-library',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './gabarit-library.html',
  styleUrl: './gabarit-library.scss',
})
export class GabaritLibrary {
  @Input({ required: true }) clientId!: number;
  @Output() choisir = new EventEmitter<Gabarit>();
  @Output() creer = new EventEmitter<void>();
  @Output() fermer = new EventEmitter<void>();

  private store = inject(GabaritStore);

  supprimerGabarit(id: string): void {
    this.store.remove(id);
  }

  /** Re-evalue la liste quand les customs changent (signal du store). */
  readonly gabarits = computed<Gabarit[]>(() => {
    this.store.customs();
    return this.store.list(this.clientId);
  });

  estPredefini(g: Gabarit): boolean {
    return g.scope === 'PREDEFINI';
  }

  porteeLabel(g: Gabarit): string {
    if (g.scope === 'PREDEFINI') return 'Predefini';
    if (g.scope === 'CABINET') return 'Cabinet';
    return 'Ce dossier';
  }
}
