import { Injectable, signal } from '@angular/core';
import { GABARITS_PREDEFINIS, Gabarit } from './gabarits';

const STORAGE_KEY = 'cabinet.gabarits.v1';

/**
 * Gabarits personnalises de l'expert-comptable (AC-09/10/11).
 *
 * Chaque gabarit personnalise a une portee (RG-007) : un dossier precis
 * (clientId) ou tout le cabinet ('CABINET'). La liste exposee a un dossier
 * combine les 6 gabarits predefinis + les customs visibles pour ce dossier.
 */
@Injectable({ providedIn: 'root' })
export class GabaritStore {
  private readonly _customs = signal<Gabarit[]>(this.load());
  readonly customs = this._customs.asReadonly();

  /** Gabarits disponibles pour un dossier : predefinis + customs cabinet + customs du dossier. */
  list(clientId: number): Gabarit[] {
    const customs = this._customs().filter(
      (g) => g.scope === 'CABINET' || g.scope === clientId
    );
    return [...GABARITS_PREDEFINIS, ...customs];
  }

  /** Cree ou met a jour un gabarit personnalise. */
  save(gabarit: Gabarit): void {
    this._customs.update((list) => {
      const exists = list.some((g) => g.id === gabarit.id);
      return exists ? list.map((g) => (g.id === gabarit.id ? gabarit : g)) : [...list, gabarit];
    });
    this.persist();
  }

  remove(id: string): void {
    this._customs.update((list) => list.filter((g) => g.id !== id));
    this.persist();
  }

  /** Identifiant unique base sur le nombre de gabarits (pas de Date.now en SSR). */
  nextId(): string {
    return `custom-${this._customs().length + 1}-${this._customs().reduce((s, g) => s + g.id.length, 0)}`;
  }

  private load(): Gabarit[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Gabarit[];
    } catch {
      // localStorage indisponible ou corrompu -> aucun custom.
    }
    return [];
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._customs()));
    } catch {
      // Persistance best-effort.
    }
  }
}
