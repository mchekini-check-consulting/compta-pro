import { Injectable, signal } from '@angular/core';
import { COMPTES_DEFAUT, ComptesVentilation } from './tva-ventilation';

const STORAGE_KEY = 'cabinet.ventilation.v1';

/**
 * Comptes de ventilation TVA configurables par dossier (AC-09 / RG-007).
 *
 * Chaque dossier peut surcharger un ou plusieurs comptes par defaut ; la
 * surcharge est persistee dans le localStorage et n'affecte que ce dossier.
 */
@Injectable({ providedIn: 'root' })
export class VentilationConfigStore {
  private readonly _overrides = signal<Record<number, Partial<ComptesVentilation>>>(this.load());

  /** Comptes effectifs d'un dossier : defauts + surcharge eventuelle. */
  get(clientId: number): ComptesVentilation {
    return { ...COMPTES_DEFAUT, ...(this._overrides()[clientId] ?? {}) };
  }

  /** Enregistre les comptes d'un dossier (surcharge complete). */
  set(clientId: number, comptes: ComptesVentilation): void {
    this._overrides.update((map) => ({ ...map, [clientId]: { ...comptes } }));
    this.persist();
  }

  private load(): Record<number, Partial<ComptesVentilation>> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Record<number, Partial<ComptesVentilation>>;
    } catch {
      // localStorage indisponible ou corrompu -> aucune surcharge.
    }
    return {};
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._overrides()));
    } catch {
      // Persistance best-effort.
    }
  }
}
