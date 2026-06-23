import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { JournalComptable } from '../journal/journal-comptable';
import { GrandLivre } from './grand-livre';
import { Fec } from './fec';
import { Devis } from '../devis/devis';

type Onglet = 'journal' | 'grand-livre' | 'fec' | 'devis';

/**
 * Saisie comptable d'un dossier presentee en onglets : Journal (saisie des
 * ecritures), Grand livre (mouvements par compte), FEC (export DGFiP) et Devis.
 */
@Component({
  selector: 'app-saisie-comptable',
  standalone: true,
  imports: [CommonModule, JournalComptable, GrandLivre, Fec, Devis],
  templateUrl: './saisie-comptable.html',
  styleUrl: './saisie-comptable.scss',
})
export class SaisieComptable {
  @Input({ required: true }) client!: Client;

  readonly onglets: { key: Onglet; label: string }[] = [
    { key: 'journal', label: 'Journal' },
    { key: 'grand-livre', label: 'Grand livre' },
    { key: 'fec', label: 'FEC' },
    { key: 'devis', label: 'Devis' },
  ];

  actif: Onglet = 'journal';
  /** Ecriture a mettre en evidence dans le journal (lien depuis le FEC, AC-03). */
  ecritureCible?: string;

  select(onglet: Onglet): void {
    this.actif = onglet;
  }

  /** Bascule sur le journal et cible l'ecriture concernee (AC-03). */
  ouvrirEcriture(numero: string): void {
    // Force une nouvelle reference pour redeclencher le surlignage si re-clic.
    this.ecritureCible = undefined;
    setTimeout(() => {
      this.ecritureCible = numero;
      this.actif = 'journal';
    });
  }
}
