import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, RegimeFiscal, RegimeTVA } from '../../../services/client';
import { DASH, formatDateFr } from '../dossier-format';
import { SaisieComptable } from '../saisie-comptable/saisie-comptable';

/**
 * Contenu du drawer "Comptabilite" (TREZ-41) : donnees de base comptables et
 * missions en cours (consultation), suivi de la saisie comptable en onglets
 * (Journal / Grand livre / FEC).
 */
@Component({
  selector: 'app-dossier-compta',
  standalone: true,
  imports: [CommonModule, SaisieComptable],
  templateUrl: './dossier-compta.html',
  styleUrl: './dossier-compta.scss',
})
export class DossierCompta {
  @Input({ required: true }) client!: Client;

  readonly DASH = DASH;

  private static readonly REGIME_FISCAL: Record<RegimeFiscal, string> = { IR: 'IR', IS: 'IS' };
  private static readonly PERIODICITE_TVA: Record<RegimeTVA, string> = {
    MENSUELLE: 'Mensuelle',
    TRIMESTRIELLE: 'Trimestrielle',
    ANNUELLE: 'Annuelle',
  };

  regimeFiscalLabel(): string {
    return DossierCompta.REGIME_FISCAL[this.client.regimeFiscal] ?? DASH;
  }
  periodiciteTVALabel(): string {
    return DossierCompta.PERIODICITE_TVA[this.client.regimeTVA] ?? DASH;
  }
  clotureExercice(): string {
    return formatDateFr(this.client.dateFinExercice);
  }
}
