import { Injectable, computed, inject, signal } from '@angular/core';
import { Client, ClientService } from './client';

export type TacheStatut = 'A_FAIRE' | 'EN_COURS' | 'FAIT';
export type TachePriorite = 'BASSE' | 'NORMALE' | 'HAUTE';

export interface Tache {
  id: number;
  titre: string;
  clientId: number;
  /** Snapshot de la raison sociale : evite un fetch client pour afficher la tache. */
  clientRaisonSociale: string;
  /** Collaborateur en charge de la tache (tableau de bord manager). */
  collaborateur: string;
  /** Echeance au format ISO yyyy-mm-dd. */
  echeance: string;
  statut: TacheStatut;
  priorite: TachePriorite;
}

// v3 : ajout du champ collaborateur (tableau de bord). v2 seedait sans collaborateur.
const STORAGE_KEY = 'cabinet.taches.v3';

/** Collaborateurs fictifs du cabinet (pas de notion de role en base). */
const COLLABORATEURS = ['Sophie Martin', 'Karim Benali', 'Lucie Durand', 'Thomas Petit'];

// Modeles de taches generes pour chaque dossier reel. Offsets negatifs = en retard.
const TEMPLATES: { titre: string; statut: TacheStatut; priorite: TachePriorite; offsetJours: number }[] = [
  { titre: 'Saisie des achats du mois', statut: 'A_FAIRE', priorite: 'HAUTE', offsetJours: 4 },
  { titre: 'Rapprochement bancaire', statut: 'EN_COURS', priorite: 'NORMALE', offsetJours: -3 },
  { titre: 'Declaration TVA', statut: 'A_FAIRE', priorite: 'HAUTE', offsetJours: 9 },
  { titre: 'Lettrage des comptes tiers', statut: 'A_FAIRE', priorite: 'BASSE', offsetJours: 14 },
  { titre: 'Revue des immobilisations', statut: 'A_FAIRE', priorite: 'HAUTE', offsetJours: -10 },
  { titre: 'Cloture mensuelle', statut: 'EN_COURS', priorite: 'NORMALE', offsetJours: 2 },
];

/** Decale la date du jour de N jours et la renvoie au format ISO local yyyy-mm-dd. */
function isoDans(jours: number): string {
  const d = new Date();
  d.setDate(d.getDate() + jours);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Etat partage des taches du cabinet, synchronise avec les dossiers reels.
 *
 * Le compteur `pendingCount` (taches non terminees) est lu par la sidebar pour
 * afficher le badge (TREZ US1 AC-04 / RG-003) : comme c'est un signal computed,
 * toute mutation (marquer "fait") met le badge a jour instantanement, sans reload.
 *
 * Les taches referencent les vrais dossiers : `syncClients()` (appele depuis le
 * shell cabinet) genere les taches initiales a partir des clients du backend,
 * supprime celles dont le dossier n'existe plus et rafraichit les libelles.
 */
@Injectable({ providedIn: 'root' })
export class TasksStore {
  private clientService = inject(ClientService);

  private readonly _taches = signal<Tache[]>(this.load());
  private synced = false;

  /** Liste complete (lecture seule). */
  readonly taches = this._taches.asReadonly();

  /** Nombre de taches en attente (A_FAIRE + EN_COURS) -> badge sidebar. */
  readonly pendingCount = computed(
    () => this._taches().filter((t) => t.statut !== 'FAIT').length
  );

  /** Nombre de taches en attente pour un dossier donne (indicateur carte, AC-07). */
  pendingForClient(clientId: number): number {
    return this._taches().filter(
      (t) => t.clientId === clientId && t.statut !== 'FAIT'
    ).length;
  }

  /** Tache en retard : non terminee et echeance passee (avant `todayIso`). */
  isEnRetard(t: Tache, todayIso: string): boolean {
    return t.statut !== 'FAIT' && t.echeance < todayIso;
  }

  /**
   * Charge les dossiers reels puis synchronise les taches. Idempotent : une seule
   * synchro reseau par session (sauf `force`), pour ne pas refetch a chaque page.
   */
  loadFromBackend(force = false): void {
    if (this.synced && !force) return;
    this.synced = true;
    this.clientService.getClients().subscribe({
      next: (clients) => this.syncClients(clients),
      error: () => {
        // Backend indisponible : on garde l'etat persiste, on autorise un retry.
        this.synced = false;
      },
    });
  }

  /**
   * Reconcilie les taches avec la liste reelle des dossiers :
   * - supprime les taches dont le dossier n'existe plus ;
   * - rafraichit le libelle (dossier renomme) ;
   * - genere les taches initiales si aucune n'existe encore.
   */
  syncClients(clients: Client[]): void {
    // Liste vide = probable erreur de chargement : on ne purge pas l'etat.
    if (clients.length === 0) return;

    const byId = new Map(clients.map((c) => [c.id, c]));
    let next = this._taches()
      .filter((t) => byId.has(t.clientId))
      .map((t) => ({ ...t, clientRaisonSociale: byId.get(t.clientId)!.raisonSociale }));

    if (next.length === 0) {
      next = this.generateSeed(clients);
    }

    this._taches.set(next);
    this.persist();
  }

  setStatut(id: number, statut: TacheStatut): void {
    this._taches.update((list) =>
      list.map((t) => (t.id === id ? { ...t, statut } : t))
    );
    this.persist();
  }

  /** Fait avancer la tache au statut suivant (A_FAIRE -> EN_COURS -> FAIT -> A_FAIRE). */
  cycleStatut(id: number): void {
    const next: Record<TacheStatut, TacheStatut> = {
      A_FAIRE: 'EN_COURS',
      EN_COURS: 'FAIT',
      FAIT: 'A_FAIRE',
    };
    const tache = this._taches().find((t) => t.id === id);
    if (tache) this.setStatut(id, next[tache.statut]);
  }

  // Trois taches par dossier reel (triplets de modeles), collaborateurs en round-robin.
  private generateSeed(clients: Client[]): Tache[] {
    const taches: Tache[] = [];
    let id = 1;
    clients.forEach((client, i) => {
      for (let k = 0; k < 3; k++) {
        const t = TEMPLATES[(i * 3 + k) % TEMPLATES.length];
        taches.push({
          id: id++,
          titre: t.titre,
          clientId: client.id,
          clientRaisonSociale: client.raisonSociale,
          collaborateur: COLLABORATEURS[taches.length % COLLABORATEURS.length],
          echeance: isoDans(t.offsetJours),
          statut: t.statut,
          priorite: t.priorite,
        });
      }
    });
    return taches;
  }

  private load(): Tache[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Tache[];
    } catch {
      // localStorage indisponible ou JSON corrompu -> on repart a vide.
    }
    return [];
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this._taches()));
    } catch {
      // Persistance best-effort : on ignore les erreurs de quota / mode prive.
    }
  }
}
