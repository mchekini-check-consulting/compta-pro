import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { GrandLivreCompte, GrandLivreResponse, GrandLivreService } from '../../../services/grand-livre';

/**
 * Onglet "Balance" : une ligne par compte avec total debit, total credit et
 * solde (debiteur si > 0, crediteur si < 0). Derive des donnees du grand livre
 * (chaque compte porte deja ses totaux) — aucun appel backend supplementaire.
 */
@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './balance.html',
  styleUrl: './balance.scss',
})
export class Balance implements OnInit {
  @Input({ required: true }) client!: Client;

  private grandLivreService = inject(GrandLivreService);

  data?: GrandLivreResponse;
  loading = true;

  ngOnInit(): void {
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

  /** Total des soldes debiteurs (solde > 0). */
  totalSoldeDebiteur(): number {
    return (this.data?.comptes ?? []).reduce((s, c) => s + (c.solde > 0 ? c.solde : 0), 0);
  }

  /** Total des soldes crediteurs (solde < 0), en valeur absolue. */
  totalSoldeCrediteur(): number {
    return (this.data?.comptes ?? []).reduce((s, c) => s + (c.solde < 0 ? -c.solde : 0), 0);
  }
}
