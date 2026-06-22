import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { JournalComptable } from '../journal/journal-comptable';
import { GrandLivre } from './grand-livre';
import { Fec } from './fec';

type Onglet = 'journal' | 'grand-livre' | 'fec';

/**
 * Saisie comptable d'un dossier presentee en onglets : Journal (saisie des
 * ecritures), Grand livre (mouvements par compte) et FEC (export DGFiP).
 */
@Component({
  selector: 'app-saisie-comptable',
  standalone: true,
  imports: [CommonModule, JournalComptable, GrandLivre, Fec],
  templateUrl: './saisie-comptable.html',
  styleUrl: './saisie-comptable.scss',
})
export class SaisieComptable {
  @Input({ required: true }) client!: Client;

  readonly onglets: { key: Onglet; label: string }[] = [
    { key: 'journal', label: 'Journal' },
    { key: 'grand-livre', label: 'Grand livre' },
    { key: 'fec', label: 'FEC' },
  ];

  actif: Onglet = 'journal';

  select(onglet: Onglet): void {
    this.actif = onglet;
  }
}
