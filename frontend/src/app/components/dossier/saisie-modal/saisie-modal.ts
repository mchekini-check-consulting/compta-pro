import {
  Component,
  EventEmitter,
  HostListener,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, RegimeFiscal, RegimeTVA } from '../../../services/client';
import { EcritureResponse } from '../../../services/journal';
import { FecService } from '../../../services/fec';
import { avatarColor, formatSiren, initials } from '../dossier-format';
import { EcritureModal } from '../journal/ecriture-modal';
import { JournalComptable } from '../journal/journal-comptable';
import { GrandLivre } from '../saisie-comptable/grand-livre';
import { Balance } from '../saisie-comptable/balance';

type Onglet = 'nouvelle' | 'journal' | 'grand-livre' | 'balance';

/**
 * Fenetre modale unifiee de saisie comptable d'un dossier (US-2).
 *
 * En-tete : identite du client + 4 icones d'acces rapide (Journal, Grand livre,
 * Balance -> changement d'onglet ; Export FEC -> telechargement). Corps en 4
 * onglets, "Nouvelle ecriture" actif par defaut (RG-001). Les onglets restent
 * montes pour conserver leur etat (RG-005) et la saisie en cours (AC-05).
 */
@Component({
  selector: 'app-saisie-modal',
  standalone: true,
  imports: [CommonModule, EcritureModal, JournalComptable, GrandLivre, Balance],
  templateUrl: './saisie-modal.html',
  styleUrl: './saisie-modal.scss',
})
export class SaisieModal {
  @Input({ required: true }) client!: Client;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('ecr') ecr?: EcritureModal;
  @ViewChild(JournalComptable) journal?: JournalComptable;
  @ViewChild(GrandLivre) grandLivre?: GrandLivre;
  @ViewChild(Balance) balance?: Balance;

  private fecService = inject(FecService);

  readonly actif = signal<Onglet>('nouvelle');
  readonly showConfirmAbandon = signal(false);
  readonly savedToast = signal('');
  fecDownloading = false;

  readonly onglets: { key: Onglet; label: string }[] = [
    { key: 'nouvelle', label: 'Nouvelle ecriture' },
    { key: 'journal', label: 'Journal' },
    { key: 'grand-livre', label: 'Grand livre' },
    { key: 'balance', label: 'Balance' },
  ];

  private static readonly REGIME_FISCAL: Record<RegimeFiscal, string> = { IR: 'IR', IS: 'IS' };
  private static readonly REGIME_TVA: Record<RegimeTVA, string> = {
    MENSUELLE: 'TVA mensuelle',
    TRIMESTRIELLE: 'TVA trimestrielle',
    ANNUELLE: 'TVA annuelle',
  };

  // === En-tete ===
  initials(): string {
    return initials(this.client.raisonSociale);
  }
  avatarColor(): string {
    return avatarColor(this.client.siren);
  }
  sirenFmt(): string {
    return formatSiren(this.client.siren);
  }
  regimeFiscalLabel(): string {
    return SaisieModal.REGIME_FISCAL[this.client.regimeFiscal] ?? this.client.regimeFiscal;
  }
  regimeTVALabel(): string {
    return SaisieModal.REGIME_TVA[this.client.regimeTVA] ?? this.client.regimeTVA;
  }

  // === Onglets ===
  select(onglet: Onglet): void {
    this.actif.set(onglet);
  }

  onSaved(_: EcritureResponse): void {
    this.savedToast.set('Ecriture enregistree en brouillon');
    // Transpose l'ecriture directement sur le Journal, le Grand livre et la Balance.
    this.journal?.reload();
    this.grandLivre?.reload();
    this.balance?.reload();
    this.actif.set('journal');
    setTimeout(() => this.savedToast.set(''), 3000);
  }

  // === Export FEC (icone d'en-tete) ===
  downloadFec(): void {
    if (this.fecDownloading) return;
    this.fecDownloading = true;
    this.fecService.downloadFec(this.client.id).subscribe({
      next: (res) => {
        const blob = res.body ?? new Blob();
        const disp = res.headers.get('Content-Disposition');
        const match = disp?.match(/filename="?([^"]+)"?/);
        const filename = match ? match[1] : `${this.client.siren}-FEC.txt`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        this.fecDownloading = false;
      },
      error: () => (this.fecDownloading = false),
    });
  }

  // === Fermeture (AC-04 / AC-05 / RG-003) ===
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.attemptClose();
  }

  attemptClose(): void {
    if (this.ecr?.hasInput()) {
      this.showConfirmAbandon.set(true);
    } else {
      this.closed.emit();
    }
  }

  confirmAbandon(): void {
    this.showConfirmAbandon.set(false);
    this.closed.emit();
  }

  cancelAbandon(): void {
    this.showConfirmAbandon.set(false);
  }
}
