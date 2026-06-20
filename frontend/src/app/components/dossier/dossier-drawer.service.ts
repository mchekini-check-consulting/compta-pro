import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { Client, ClientService } from '../../services/client';

/** Cle interne identifiant chaque section / drawer. */
export type DossierSection = 'infos' | 'compta' | 'social';

export interface DossierDrawerState {
  client: Client;
  section: DossierSection;
}

/**
 * Etat partage du drawer des sections de dossier (TREZ-39).
 *
 * Un seul drawer peut etre ouvert a la fois, tous dossiers confondus (RG-004) :
 * cet etat est donc centralise ici plutot que dans chaque ligne de la liste.
 */
@Injectable({ providedIn: 'root' })
export class DossierDrawerService {
  private clientService = inject(ClientService);

  /** Drawer actuellement ouvert, ou null si aucun (AC-03). */
  readonly state = signal<DossierDrawerState | null>(null);
  /** Chargement des donnees du dossier en cours (AC-14). */
  readonly loading = signal(false);
  /** Donnees fraiches du dossier affiche dans le drawer. */
  readonly detail = signal<Client | null>(null);
  /** Erreur de chargement (TREZ-40 AC-13 / TREZ-41 AC-14). */
  readonly loadError = signal(false);

  private sub?: Subscription;

  /**
   * Clic sur une icone (RG-004 / RG-005) :
   * - meme dossier + meme section deja ouverts -> ferme le drawer
   * - sinon -> ferme l'eventuel drawer courant et ouvre le nouveau
   */
  toggle(client: Client, section: DossierSection): void {
    const cur = this.state();
    if (cur && cur.client.id === client.id && cur.section === section) {
      this.close();
      return;
    }
    this.state.set({ client, section });
    this.loadDetail(client);
  }

  close(): void {
    this.sub?.unsubscribe();
    this.state.set(null);
    this.loading.set(false);
    this.detail.set(null);
    this.loadError.set(false);
  }

  isActive(clientId: number, section: DossierSection): boolean {
    const cur = this.state();
    return !!cur && cur.client.id === clientId && cur.section === section;
  }

  /** Relance le chargement apres une erreur (bouton "Reessayer"). */
  retry(): void {
    const cur = this.state();
    if (cur) this.loadDetail(cur.client);
  }

  // On recharge les donnees du dossier a l'ouverture ; pendant ce temps le
  // drawer affiche un skeleton, sans bloquer les icones de la liste (AC-13/AC-14).
  private loadDetail(client: Client): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.detail.set(null);
    this.sub?.unsubscribe();
    this.sub = this.clientService.getClient(client.id).subscribe({
      next: (c) => {
        this.detail.set(c);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }
}
