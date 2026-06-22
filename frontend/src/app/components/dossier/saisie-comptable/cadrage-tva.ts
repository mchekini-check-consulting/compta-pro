import { Component, EventEmitter, Input, OnInit, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { EcritureResponse, JournalService, LigneEcritureRequest } from '../../../services/journal';
import { CadrageTva, calculerCadrage, genererLignesCloture } from '../../../services/cadrage-tva';

interface Periode {
  label: string;
  debut: string; // ISO yyyy-mm-dd
  fin: string;
}

const MOIS = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
function dernierJour(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate();
}

/**
 * Onglet "Cadrage TVA / CA3" (regime reel normal) : calcule la TVA nette de la
 * periode a partir des ecritures, decompose par taux, controle la coherence et
 * propose la generation de l'ecriture de cloture.
 */
@Component({
  selector: 'app-cadrage-tva',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cadrage-tva.html',
  styleUrl: './cadrage-tva.scss',
})
export class CadrageTvaComponent implements OnInit {
  @Input({ required: true }) client!: Client;
  @Output() genererCloture = new EventEmitter<{ lignes: LigneEcritureRequest[]; date: string }>();

  private journalService = inject(JournalService);

  readonly periodes = signal<Periode[]>([]);
  readonly periodeIndex = signal(0);
  readonly loading = signal(true);
  readonly cadrage = signal<CadrageTva | null>(null);

  private ecritures: EcritureResponse[] = [];

  ngOnInit(): void {
    this.periodes.set(this.construirePeriodes());
    this.periodeIndex.set(this.indexParDefaut());
    this.reload();
  }

  /** Recharge les ecritures et recalcule le cadrage. */
  reload(): void {
    this.loading.set(true);
    this.journalService.getEcritures(this.client.id).subscribe({
      next: (list) => {
        this.ecritures = list;
        this.calculer();
        this.loading.set(false);
      },
      error: () => {
        this.cadrage.set(null);
        this.loading.set(false);
      },
    });
  }

  onPeriodeChange(index: string): void {
    this.periodeIndex.set(Number(index));
    this.calculer();
  }

  private calculer(): void {
    const p = this.periodes()[this.periodeIndex()];
    if (!p) {
      this.cadrage.set(null);
      return;
    }
    this.cadrage.set(calculerCadrage(this.ecritures, p.debut, p.fin));
  }

  // === Generation de l'ecriture de cloture (AC-07/08) ===
  onGenererCloture(): void {
    const c = this.cadrage();
    const p = this.periodes()[this.periodeIndex()];
    if (!c || c.clotureExistante) return;
    this.genererCloture.emit({ lignes: genererLignesCloture(c), date: this.dateFr(p.fin) });
  }

  // === Periodes selon le regime TVA (AC-09 / RG-005) ===
  private construirePeriodes(): Periode[] {
    const debut = this.client.dateDebutExercice;
    const fin = this.client.dateFinExercice;
    if (!debut || !fin) return [];
    const [dy, dm] = debut.split('-').map(Number);
    const [fy, fm] = fin.split('-').map(Number);

    if (this.client.regimeTVA === 'ANNUELLE') {
      return [{ label: `Exercice ${dy}`, debut, fin }];
    }

    // Liste des mois de l'exercice.
    const mois: { y: number; m: number }[] = [];
    let y = dy, m = dm - 1;
    while (y < fy || (y === fy && m <= fm - 1)) {
      mois.push({ y, m });
      m++;
      if (m > 11) { m = 0; y++; }
    }

    if (this.client.regimeTVA === 'TRIMESTRIELLE') {
      const parTrim = new Map<string, { y: number; m: number }[]>();
      for (const mm of mois) {
        const t = Math.floor(mm.m / 3) + 1;
        const key = `T${t} ${mm.y}`;
        (parTrim.get(key) ?? parTrim.set(key, []).get(key)!).push(mm);
      }
      return [...parTrim.entries()].map(([label, ms]) => {
        const first = ms[0], last = ms[ms.length - 1];
        return { label, debut: iso(first.y, first.m, 1), fin: iso(last.y, last.m, dernierJour(last.y, last.m)) };
      });
    }

    // Mensuelle
    return mois.map((mm) => ({
      label: `${MOIS[mm.m]} ${mm.y}`,
      debut: iso(mm.y, mm.m, 1),
      fin: iso(mm.y, mm.m, dernierJour(mm.y, mm.m)),
    }));
  }

  /** Periode contenant la date du jour, sinon la premiere. */
  private indexParDefaut(): number {
    const today = iso(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());
    const list = this.periodes();
    const idx = list.findIndex((p) => today >= p.debut && today <= p.fin);
    return idx >= 0 ? idx : 0;
  }

  private dateFr(isoStr: string): string {
    const [y, m, d] = isoStr.split('-');
    return `${d}/${m}/${y}`;
  }

  abs(n: number): number {
    return Math.abs(n);
  }
}
