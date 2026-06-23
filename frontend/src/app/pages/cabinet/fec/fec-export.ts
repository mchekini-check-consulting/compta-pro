import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, ClientService } from '../../../services/client';
import { Fec } from '../../../components/dossier/saisie-comptable/fec';

/**
 * Ecran autonome « Exporter le FEC » (FEC-001, AC-01) : selection d'un dossier
 * du portefeuille puis d'un exercice, avant la preparation et le controle.
 */
@Component({
  selector: 'app-fec-export',
  standalone: true,
  imports: [CommonModule, Fec],
  templateUrl: './fec-export.html',
  styleUrl: './fec-export.scss',
})
export class FecExport implements OnInit {
  private clientService = inject(ClientService);

  dossiers = signal<Client[]>([]);
  loading = signal(true);
  error = signal('');
  dossierSelectionne = signal<Client | undefined>(undefined);

  ngOnInit(): void {
    this.clientService.getClients().subscribe({
      next: (list) => {
        this.dossiers.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les dossiers.');
        this.loading.set(false);
      },
    });
  }

  /** Selectionne un dossier du portefeuille (AC-01). */
  selectionnerDossier(id: number): void {
    this.dossierSelectionne.set(this.dossiers().find((d) => d.id === id));
  }
}
