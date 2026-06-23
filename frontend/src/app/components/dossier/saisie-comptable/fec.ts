import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Client } from '../../../services/client';
import {
  FecControleRapport,
  FecExercice,
  FecExportResume,
  FecService,
  FecSynthese,
} from '../../../services/fec';

/**
 * Onglet "FEC" : controle de conformite prealable puis generation et
 * telechargement du Fichier des Ecritures Comptables au format DGFiP.
 */
@Component({
  selector: 'app-fec',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fec.html',
  styleUrl: './fec.scss',
})
export class Fec implements OnInit {
  @Input({ required: true }) client!: Client;
  /** Demande l'ouverture d'une ecriture dans le journal (AC-03). */
  @Output() ouvrirEcriture = new EventEmitter<string>();

  private fecService = inject(FecService);

  loading = true;
  error = '';
  /** Rapport du dernier controle de conformite. */
  rapport?: FecControleRapport;
  /** Generation/telechargement en cours. */
  generating = false;
  /** Message de succes apres generation (AC-13). */
  message = '';
  /** Historique des exports du dossier (FEC-004). */
  historique: FecExportResume[] = [];
  /** Filtre par exercice de l'historique (AC-07). */
  filtreExercice: number | 'tous' = 'tous';
  /** Export dont le detail est deplie (AC-06). */
  detailOuvert?: number;
  /** Empreinte SHA-256 du dernier fichier genere (AC-03). */
  dernierHash = '';
  /** Exercices selectionnables et exercice courant (AC-01). */
  exercices: FecExercice[] = [];
  exerciceSelectionne?: FecExercice;
  /** Etape du parcours FEC : preparation (FEC-001) puis controle (FEC-002+). */
  etape: 'preparation' | 'controle' = 'preparation';
  /** Synthese de collecte de l'exercice courant (FEC-001). */
  synthese?: FecSynthese;

  ngOnInit(): void {
    this.chargerExercices();
    this.chargerHistorique();
  }

  /** Charge la liste des exercices puis la synthese du plus recent (AC-01). */
  chargerExercices(): void {
    this.fecService.exercices(this.client.id).subscribe({
      next: (exs) => {
        this.exercices = exs;
        this.exerciceSelectionne = exs[0];
        this.chargerSynthese();
      },
      error: () => {
        this.error = 'Impossible de charger les exercices.';
        this.loading = false;
      },
    });
  }

  /** Change l'exercice cible et recharge la synthese (AC-01/AC-02). */
  selectionnerExercice(annee: number): void {
    this.exerciceSelectionne = this.exercices.find((e) => e.annee === annee);
    this.etape = 'preparation';
    this.chargerSynthese();
  }

  /** Collecte et consolide les ecritures de l'exercice (FEC-001, AC-02). */
  chargerSynthese(): void {
    this.loading = true;
    this.error = '';
    this.message = '';
    this.rapport = undefined;
    this.fecService.synthese(this.client.id, this.anneeCible).subscribe({
      next: (s) => {
        this.synthese = s;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de collecter les ecritures de l\'exercice.';
        this.loading = false;
      },
    });
  }

  /** Passe a l'etape de controle qualite (AC-10, bloque si desequilibre RG-004). */
  etapeSuivante(): void {
    if (!this.synthese || this.synthese.totalLignes === 0 || !this.synthese.equilibre) return;
    this.etape = 'controle';
    this.lancerControle();
  }

  /** Revient a l'ecran de preparation (FEC-001). */
  retourPreparation(): void {
    this.etape = 'preparation';
    this.rapport = undefined;
  }

  private get anneeCible(): number | undefined {
    return this.exerciceSelectionne?.annee;
  }

  /** Ouvre l'ecriture concernee par une anomalie dans le journal (AC-03). */
  voirEcriture(numero: string | null): void {
    if (numero) this.ouvrirEcriture.emit(numero);
  }

  /** Recharge l'historique des exports (AC-14). */
  chargerHistorique(): void {
    this.fecService.historique(this.client.id).subscribe({
      next: (h) => (this.historique = h),
      error: () => (this.historique = []),
    });
  }

  /** Re-telecharge un export archive (AC-14). */
  retelecharger(exportId: number): void {
    this.fecService.downloadArchive(exportId).subscribe({
      next: (res) => {
        const blob = res.body ?? new Blob();
        const filename = this.extractFilename(res) ?? `${this.client.siren}-FEC.txt`;
        this.declencherTelechargement(blob, filename);
      },
      error: () => (this.error = 'Impossible de re-telecharger cet export.'),
    });
  }

  /** (Re)lance le controle de conformite (AC-02, AC-05). */
  lancerControle(): void {
    this.loading = true;
    this.error = '';
    this.message = '';
    this.fecService.controle(this.client.id, this.anneeCible).subscribe({
      next: (rapport) => {
        this.rapport = rapport;
        this.loading = false;
      },
      error: () => {
        this.error = 'Impossible de lancer le controle de conformite.';
        this.loading = false;
      },
    });
  }

  /** Genere et telecharge le FEC si aucune anomalie bloquante (AC-13). */
  genererFec(): void {
    if (!this.rapport?.exportPossible || this.generating) return;
    this.generating = true;
    this.message = '';
    this.error = '';
    this.fecService.downloadFec(this.client.id, this.anneeCible).subscribe({
      next: (res) => this.onGenerated(res),
      error: (err: HttpErrorResponse) => this.onGenerateError(err),
    });
  }

  private async onGenerated(res: HttpResponse<Blob>): Promise<void> {
    const blob = res.body ?? new Blob();
    const filename = this.extractFilename(res) ?? `${this.client.siren}-FEC.txt`;
    const text = await blob.text();
    const lignes = text.split(/\r\n|\n/).filter((l) => l.length > 0);
    const nbLignes = Math.max(0, lignes.length - 1);

    // Σ Debit / Credit a partir des colonnes 12 et 13 (AC-01).
    let sigmaDebit = 0;
    let sigmaCredit = 0;
    for (const l of lignes.slice(1)) {
      const cols = l.split('\t');
      sigmaDebit += this.montant(cols[11]);
      sigmaCredit += this.montant(cols[12]);
    }

    // Empreinte SHA-256 du fichier telecharge (AC-03).
    this.dernierHash = await this.sha256(blob);

    this.declencherTelechargement(blob, filename);
    this.message =
      `FEC genere et telecharge — ${nbLignes} ligne(s) exportee(s) · ` +
      `Σ Debit = Σ Credit = ${sigmaDebit.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
    this.generating = false;
    this.chargerHistorique();
  }

  private montant(champ: string | undefined): number {
    if (!champ) return 0;
    return parseFloat(champ.replace(',', '.')) || 0;
  }

  private async sha256(blob: Blob): Promise<string> {
    const buffer = await blob.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /** Historique filtre par exercice (AC-07). */
  get historiqueFiltre(): FecExportResume[] {
    if (this.filtreExercice === 'tous') return this.historique;
    return this.historique.filter((h) => h.annee === this.filtreExercice);
  }

  /** Annees presentes dans l'historique, pour le filtre (AC-07). */
  get anneesHistorique(): number[] {
    return [...new Set(this.historique.map((h) => h.annee).filter((a): a is number => a != null))].sort(
      (a, b) => b - a,
    );
  }

  basculerDetail(id: number): void {
    this.detailOuvert = this.detailOuvert === id ? undefined : id;
  }

  /** Marque un export comme valide CTRL-DGFIP (AC-09). */
  validerCtrl(h: FecExportResume): void {
    this.fecService.validerCtrl(h.id).subscribe({
      next: () => this.chargerHistorique(),
      error: () => (this.error = 'Validation CTRL-DGFIP impossible.'),
    });
  }

  /** Exercice selectionne non encore cloture => export partiel (AC-10). */
  get exercicePartiel(): boolean {
    if (!this.exerciceSelectionne) return false;
    return new Date(this.exerciceSelectionne.cloture) > new Date();
  }

  private onGenerateError(err: HttpErrorResponse): void {
    this.generating = false;
    // 409 : une anomalie bloquante est apparue depuis le dernier controle.
    if (err.status === 409) {
      this.error = 'Export bloque : des anomalies bloquantes subsistent. Controle actualise.';
      this.lancerControle();
      return;
    }
    this.error = 'Impossible de generer le FEC.';
  }

  private declencherTelechargement(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private extractFilename(res: HttpResponse<Blob>): string | null {
    const disp = res.headers.get('Content-Disposition');
    const match = disp?.match(/filename="?([^"]+)"?/);
    return match ? match[1] : null;
  }
}
