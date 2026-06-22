import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { GrandLivreCompte, GrandLivreResponse, GrandLivreService } from '../../../services/grand-livre';

/**
 * Onglet "Grand livre" : regroupe les ecritures du dossier par compte, avec
 * solde cumule et totaux par compte.
 */
@Component({
  selector: 'app-grand-livre',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './grand-livre.html',
  styleUrl: './grand-livre.scss',
})
export class GrandLivre implements OnInit {
  @Input({ required: true }) client!: Client;

  private grandLivreService = inject(GrandLivreService);

  data?: GrandLivreResponse;
  loading = true;

  ngOnInit(): void {
    this.reload();
  }

  /** Recharge le grand livre (apres enregistrement d'une ecriture). */
  reload(): void {
    this.loading = true;
    this.grandLivreService.getGrandLivre(this.client.id).subscribe({
      next: (res) => {
        this.data = res;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  trackCompte(_: number, c: GrandLivreCompte): string {
    return c.numeroCompte;
  }

  formatDate(iso: string): string {
    return iso ? new Date(iso).toLocaleDateString('fr-FR') : '';
  }

  formatMontant(montant: number | null): string {
    return montant != null && montant !== 0 ? montant.toFixed(2) : '';
  }
}
