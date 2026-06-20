import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { EcritureResponse, JournalService } from '../../../services/journal';
import { EcritureModal } from './ecriture-modal';

/**
 * Vue "Journal comptable" d'un dossier, affichee dans le drawer Comptabilite (TREZ-39/41).
 * Liste les ecritures existantes et permet d'en saisir une nouvelle.
 */
@Component({
  selector: 'app-journal-comptable',
  standalone: true,
  imports: [CommonModule, EcritureModal],
  templateUrl: './journal-comptable.html',
  styleUrl: './journal-comptable.scss',
})
export class JournalComptable implements OnInit {
  @Input({ required: true }) client!: Client;

  private journalService = inject(JournalService);

  ecritures: EcritureResponse[] = [];
  loading = true;
  showModal = false;
  toast = '';

  ngOnInit(): void {
    this.loadEcritures();
  }

  private loadEcritures(): void {
    this.loading = true;
    this.journalService.getEcritures(this.client.id).subscribe({
      next: (list) => {
        this.ecritures = list;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  openModal(): void {
    this.showModal = true;
  }

  onSaved(ecriture: EcritureResponse): void {
    this.showModal = false;
    this.ecritures = [ecriture, ...this.ecritures];
    this.showToast('Ecriture enregistree en brouillon');
  }

  onClosed(): void {
    this.showModal = false;
  }

  private showToast(message: string): void {
    this.toast = message;
    setTimeout(() => (this.toast = ''), 3000);
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('fr-FR');
  }
}
