import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, RegimeFiscal, RegimeTVA } from '../../../services/client';
import { DASH, formatDateFr, formatJourMois, formatSiren } from '../dossier-format';

/**
 * Contenu du drawer "Informations generales" (TREZ-40) : sections Identite,
 * Gestion cabinet et Contacts. Les champs absents du modele affichent "—".
 */
@Component({
  selector: 'app-dossier-infos',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dossier-infos.html',
  styleUrl: './dossier-infos.scss',
})
export class DossierInfos {
  @Input({ required: true }) client!: Client;

  readonly DASH = DASH;
  sirenCopie = false;

  private static readonly REGIME_FISCAL: Record<RegimeFiscal, string> = {
    IR: 'IR',
    IS: 'IS',
  };
  private static readonly REGIME_TVA: Record<RegimeTVA, string> = {
    MENSUELLE: 'Mensuelle',
    TRIMESTRIELLE: 'Trimestrielle',
    ANNUELLE: 'Annuelle',
  };

  formatSiren(siren?: string): string {
    return formatSiren(siren);
  }
  formatDate(iso?: string): string {
    return formatDateFr(iso);
  }
  clotureJourMois(): string {
    return formatJourMois(this.client.dateFinExercice);
  }
  regimeFiscalLabel(): string {
    return DossierInfos.REGIME_FISCAL[this.client.regimeFiscal] ?? DASH;
  }
  regimeTVALabel(): string {
    return DossierInfos.REGIME_TVA[this.client.regimeTVA] ?? DASH;
  }

  // AC-08 : prochaine cloture calculee + badge d'alerte si < 30 jours.
  private prochaineCloture(): Date | null {
    const fin = new Date(this.client.dateFinExercice);
    if (isNaN(fin.getTime())) return null;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    let next = new Date(todayMidnight.getFullYear(), fin.getMonth(), fin.getDate());
    if (next < todayMidnight) {
      next = new Date(todayMidnight.getFullYear() + 1, fin.getMonth(), fin.getDate());
    }
    return next;
  }

  prochaineClotureLabel(): string {
    const next = this.prochaineCloture();
    return next ? next.toLocaleDateString('fr-FR') : DASH;
  }

  prochaineClotureProche(): boolean {
    const next = this.prochaineCloture();
    if (!next) return false;
    const today = new Date();
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffJours = Math.round((next.getTime() - todayMidnight.getTime()) / 86_400_000);
    return diffJours >= 0 && diffJours <= 30;
  }

  // AC-06 : copie du SIREN dans le presse-papier + confirmation 2 s.
  copySiren(): void {
    navigator.clipboard?.writeText(this.client.siren).then(() => {
      this.sirenCopie = true;
      setTimeout(() => (this.sirenCopie = false), 2000);
    });
  }
}
