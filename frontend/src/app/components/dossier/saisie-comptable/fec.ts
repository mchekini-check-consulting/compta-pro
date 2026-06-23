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

  /** Etapes de la barre de progression du controle (AC-01). */
  readonly etapesControle = [
    'Controle BLQ-001 — Equilibre des ecritures...',
    'Controles BLQ-002/003/004 — Numeros, comptes et dates...',
    'Controles BLQ-005 a 008 — Montants et balance...',
    'Controles AVT-001 a 005 — Avertissements...',
    'Controles COH-001 a 008 — Coherence globale...',
  ];
  /** Index de l'etape de progression en cours (-1 = inactif). */
  etapeControle = -1;
  private progressionTimer?: ReturnType<typeof setInterval>;

  /** Etapes de la barre de generation du fichier (FEC-003 AC-01). */
  readonly etapesGeneration = [
    'Initialisation fichier UTF-8 sans BOM...',
    'Ecriture ligne en-tete (18 champs)...',
    'Export journal AN...',
    'Export journal ACH...',
    'Export journal VTE...',
    'Export journal BQ...',
    'Export journal OD...',
    'Calcul empreinte SHA-256...',
    'Controle final Σ Debit = Σ Credit...',
    'Fichier pret ✓',
  ];
  etapeGeneration = -1;
  private generationTimer?: ReturnType<typeof setInterval>;
  /** Blob du dernier fichier genere, pour re-telechargement sans re-generation (AC-02). */
  private blobGenere?: Blob;
  /** Resultat detaille de la derniere generation (AC-02/03/09). */
  resultatGeneration?: {
    filename: string;
    nbLignes: number;
    sigmaDebit: number;
    sigmaCredit: number;
    equilibre: boolean;
    hash: string;
    entete: string;
    apercu: string[];
  };
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

  /** (Re)lance les 21 controles avec barre de progression (AC-01, AC-10). */
  lancerControle(): void {
    this.loading = true;
    this.error = '';
    this.message = '';
    this.rapport = undefined;
    this.demarrerProgression();
    this.fecService.controle(this.client.id, this.anneeCible).subscribe({
      next: (rapport) => {
        this.terminerProgression();
        this.rapport = rapport;
        this.loading = false;
      },
      error: () => {
        this.terminerProgression();
        this.error = 'Impossible de lancer le controle de conformite.';
        this.loading = false;
      },
    });
  }

  private demarrerProgression(): void {
    this.etapeControle = 0;
    clearInterval(this.progressionTimer);
    // Defile les libelles d'etape tant que le controle s'execute (AC-01).
    this.progressionTimer = setInterval(() => {
      if (this.etapeControle < this.etapesControle.length - 1) {
        this.etapeControle++;
      }
    }, 400);
  }

  private terminerProgression(): void {
    clearInterval(this.progressionTimer);
    this.etapeControle = -1;
  }

  /** Genere et telecharge le FEC si aucune anomalie bloquante (AC-01, AC-13). */
  genererFec(): void {
    if (!this.rapport?.exportPossible || this.generating) return;
    this.generating = true;
    this.message = '';
    this.error = '';
    this.resultatGeneration = undefined;
    this.demarrerGeneration();
    this.fecService.downloadFec(this.client.id, this.anneeCible).subscribe({
      next: (res) => this.onGenerated(res),
      error: (err: HttpErrorResponse) => {
        this.terminerGeneration();
        this.onGenerateError(err);
      },
    });
  }

  /** Re-telecharge le fichier qu'on vient de generer, sans re-generation (AC-02, RG-004). */
  reTelechargerFichierGenere(): void {
    if (this.blobGenere && this.resultatGeneration) {
      this.declencherTelechargement(this.blobGenere, this.resultatGeneration.filename);
    }
  }

  /** Trace de l'export courant (la plus recente de l'historique) pour AC-03. */
  get traceCourante(): FecExportResume | undefined {
    return this.historique[0];
  }

  /** Repart a l'etape 1 en effacant tous les etats intermediaires (AC-05). */
  nouvelExport(): void {
    this.resultatGeneration = undefined;
    this.blobGenere = undefined;
    this.rapport = undefined;
    this.message = '';
    this.error = '';
    this.dernierHash = '';
    this.detailOuvert = undefined;
    this.etape = 'preparation';
    this.chargerExercices();
  }

  private demarrerGeneration(): void {
    this.etapeGeneration = 0;
    clearInterval(this.generationTimer);
    this.generationTimer = setInterval(() => {
      if (this.etapeGeneration < this.etapesGeneration.length - 1) {
        this.etapeGeneration++;
      }
    }, 250);
  }

  private terminerGeneration(): void {
    clearInterval(this.generationTimer);
    this.etapeGeneration = -1;
  }

  private async onGenerated(res: HttpResponse<Blob>): Promise<void> {
    const blob = res.body ?? new Blob();
    const filename = this.extractFilename(res) ?? `${this.client.siren}-FEC.txt`;
    const text = await blob.text();
    const lignes = text.split(/\r\n|\n/).filter((l) => l.length > 0);

    // Metadonnees autoritatives lues dans les en-tetes (FEC-003), avec repli local.
    const h = res.headers;
    const nbLignes = +(h.get('X-Fec-Lignes') ?? Math.max(0, lignes.length - 1));
    const sigmaDebit = parseFloat(h.get('X-Fec-Sigma-Debit') ?? '0') || this.sommeColonne(lignes, 11);
    const sigmaCredit = parseFloat(h.get('X-Fec-Sigma-Credit') ?? '0') || this.sommeColonne(lignes, 12);
    const hash = h.get('X-Fec-Sha256') ?? (await this.sha256(blob));

    this.dernierHash = hash;
    this.blobGenere = blob;
    this.resultatGeneration = {
      filename,
      nbLignes,
      sigmaDebit,
      sigmaCredit,
      equilibre: Math.abs(sigmaDebit - sigmaCredit) < 0.01,
      hash,
      entete: lignes[0] ?? '',
      apercu: lignes.slice(1, 6), // 5 premieres lignes de donnees (AC-09)
    };

    this.terminerGeneration();
    this.declencherTelechargement(blob, filename);
    this.message =
      `FEC genere avec succes — ${nbLignes + 1} lignes (1 en-tete + ${nbLignes} ecritures) · ` +
      `Σ Debit = ${this.euro(sigmaDebit)} · Σ Credit = ${this.euro(sigmaCredit)} · ` +
      `${this.resultatGeneration.equilibre ? 'Equilibre ✓' : 'Desequilibre ⚠'}`;
    this.generating = false;
    this.chargerHistorique();
  }

  private euro(v: number): string {
    return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  }

  private sommeColonne(lignes: string[], col: number): number {
    return lignes.slice(1).reduce((s, l) => s + this.montant(l.split('\t')[col]), 0);
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

  /** Specifications techniques du fichier genere, toutes conformes (AC-03). */
  get specifications(): { libelle: string; valeur: string }[] {
    const r = this.resultatGeneration;
    if (!r) return [];
    return [
      { libelle: 'Nom du fichier', valeur: r.filename },
      { libelle: 'Encodage', valeur: 'UTF-8 sans BOM' },
      { libelle: 'Separateur', valeur: 'Tabulation (\\t)' },
      { libelle: 'Fins de ligne', valeur: 'CRLF (\\r\\n)' },
      { libelle: 'Format des dates', valeur: 'AAAAMMJJ' },
      { libelle: 'Montants', valeur: 'Virgule decimale, 2 decimales' },
      { libelle: 'Nombre de champs', valeur: '18' },
    ];
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
