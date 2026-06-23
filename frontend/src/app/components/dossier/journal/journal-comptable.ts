import { Component, Input, OnChanges, OnInit, SimpleChanges, inject } from '@angular/core';
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
export class JournalComptable implements OnInit, OnChanges {
  @Input({ required: true }) client!: Client;
  /** Numero d'ecriture a mettre en evidence (lien depuis le FEC, AC-03). */
  @Input() highlightNumero?: string;

  private journalService = inject(JournalService);

  ecritures: EcritureResponse[] = [];
  loading = true;
  showModal = false;
  toast = '';

  ngOnInit(): void {
    this.loadEcritures();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['highlightNumero'] && this.highlightNumero && !this.loading) {
      this.scrollToHighlight();
    }
  }

  private scrollToHighlight(): void {
    const numero = this.highlightNumero;
    if (!numero) return;
    const cible = this.ecritures.find((e) => e.numeroOperation === numero);
    if (!cible) return;
    setTimeout(() => {
      document.getElementById('ecr-' + cible.id)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }

  /** Recharge la liste des ecritures (apres un enregistrement externe). */
  reload(): void {
    this.loadEcritures();
  }

  private loadEcritures(): void {
    this.loading = true;
    this.journalService.getEcritures(this.client.id).subscribe({
      next: (list) => {
        this.ecritures = list;
        this.loading = false;
        if (this.highlightNumero) this.scrollToHighlight();
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
