import { Injectable, signal } from '@angular/core';

export interface RevisionPoint {
  id: string;
  label: string;
  valide: boolean;
}

export interface RevisionCycle {
  id: string;
  nom: string;
  points: RevisionPoint[];
}

const STORAGE_KEY = 'cabinet.revision.v1';

// Cycles standards de revision comptable, instancies par dossier a la premiere
// ouverture. `valide` part toujours a false.
const DEFAULT_CYCLES: () => RevisionCycle[] = () => [
  {
    id: 'immobilisations',
    nom: 'Immobilisations',
    points: [
      { id: 'imo-1', label: 'Rapprochement tableau des immobilisations / comptes', valide: false },
      { id: 'imo-2', label: 'Controle des dotations aux amortissements', valide: false },
      { id: 'imo-3', label: 'Justification des acquisitions et cessions', valide: false },
    ],
  },
  {
    id: 'stocks',
    nom: 'Stocks',
    points: [
      { id: 'stk-1', label: 'Rapprochement inventaire physique / comptable', valide: false },
      { id: 'stk-2', label: 'Valorisation des stocks', valide: false },
      { id: 'stk-3', label: 'Provisions pour depreciation', valide: false },
    ],
  },
  {
    id: 'tiers',
    nom: 'Tiers (clients / fournisseurs)',
    points: [
      { id: 'tie-1', label: 'Lettrage des comptes clients', valide: false },
      { id: 'tie-2', label: 'Lettrage des comptes fournisseurs', valide: false },
      { id: 'tie-3', label: 'Analyse des creances douteuses', valide: false },
      { id: 'tie-4', label: 'Justification des soldes', valide: false },
    ],
  },
  {
    id: 'tresorerie',
    nom: 'Tresorerie',
    points: [
      { id: 'trz-1', label: 'Rapprochements bancaires a jour', valide: false },
      { id: 'trz-2', label: 'Justification du solde de caisse', valide: false },
      { id: 'trz-3', label: 'Controle des emprunts', valide: false },
    ],
  },
  {
    id: 'capitaux',
    nom: 'Capitaux propres',
    points: [
      { id: 'cap-1', label: 'Tableau de variation des capitaux propres', valide: false },
      { id: 'cap-2', label: 'Affectation du resultat N-1', valide: false },
    ],
  },
  {
    id: 'charges-produits',
    nom: 'Charges et produits',
    points: [
      { id: 'cpr-1', label: 'Controle de coherence des charges', valide: false },
      { id: 'cpr-2', label: 'Cut-off des charges et produits', valide: false },
      { id: 'cpr-3', label: 'Charges et produits constates d\'avance', valide: false },
    ],
  },
];

/**
 * Etat de la revision comptable, indexe par dossier (clientId).
 *
 * L'etat des points coches doit survivre a la navigation et au rechargement :
 * il est persiste dans le localStorage. Calque sur DossierDrawerService pour le
 * style (signal + providedIn root).
 */
@Injectable({ providedIn: 'root' })
export class RevisionStore {
  private readonly _byClient = signal<Record<number, RevisionCycle[]>>(this.load());

  /** Cycles du dossier, instancies par defaut si absents. */
  cyclesFor(clientId: number): RevisionCycle[] {
    const existing = this._byClient()[clientId];
    if (existing) return existing;
    const cycles = DEFAULT_CYCLES();
    this._byClient.update((map) => ({ ...map, [clientId]: cycles }));
    this.persist();
    return cycles;
  }

  togglePoint(clientId: number, cycleId: string, pointId: string): void {
    this._byClient.update((map) => {
      const cycles = map[clientId] ?? DEFAULT_CYCLES();
      const updated = cycles.map((c) =>
        c.id !== cycleId
          ? c
          : {
              ...c,
              points: c.points.map((p) =>
                p.id === pointId ? { ...p, valide: !p.valide } : p
              ),
            }
      );
      return { ...map, [clientId]: updated };
    });
    this.persist();
  }

  /** Progression globale du dossier en % (0-100). */
  progressFor(clientId: number): number {
    const cycles = this._byClient()[clientId];
    if (!cycles) return 0;
    const all = cycles.flatMap((c) => c.points);
    if (all.length === 0) return 0;
    const done = all.filter((p) => p.valide).length;
    return Math.round((done / all.length) * 100);
  }

  /** Progression d'un cycle en % (0-100). */
  progressForCycle(cycle: RevisionCycle): number {
    if (cycle.points.length === 0) return 0;
    const done = cycle.points.filter((p) => p.valide).length;
    return Math.round((done / cycle.points.length) * 100);
  }

  private load(): Record<number, RevisionCycle[]> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Record<number, RevisionCycle[]>;
    } catch {
      // Reset si localStorage indisponible ou corrompu.
    }
    return {};
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._byClient()));
    } catch {
      // Persistance best-effort.
    }
  }
}
