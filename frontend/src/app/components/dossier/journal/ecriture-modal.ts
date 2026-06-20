import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client } from '../../../services/client';
import { CompteComptable, PlanComptableService } from '../../../services/plan-comptable';
import { EcritureResponse, JournalService, LigneEcritureRequest } from '../../../services/journal';

interface LigneModel {
  /** Texte saisi dans le champ compte (sert aussi a la recherche). */
  compteInput: string;
  numeroCompte: string;
  libelleCompte: string;
  libelle: string;
  debit: string;
  credit: string;
  showDropdown: boolean;
}

/**
 * Modale de saisie manuelle d'une ecriture comptable dans le journal (TREZ).
 * Couvre la recherche de compte (RG-008), la generation du code journal /
 * numero d'operation (RG-003/RG-006), les controles de saisie (RG-009 a RG-013)
 * et l'enregistrement en brouillon (RG-014/RG-015).
 */
@Component({
  selector: 'app-ecriture-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ecriture-modal.html',
  styleUrl: './ecriture-modal.scss',
})
export class EcritureModal implements OnInit {
  @Input({ required: true }) client!: Client;
  @Output() saved = new EventEmitter<EcritureResponse>();
  @Output() closed = new EventEmitter<void>();

  private planService = inject(PlanComptableService);
  private journalService = inject(JournalService);

  // Referentiel des comptes (charge une fois) et recherche.
  comptes: CompteComptable[] = [];

  dateStr = '';
  numeroOperation = '';
  codeJournal = '';

  lignes: LigneModel[] = [this.emptyLigne()];

  saving = false;
  submitError = '';
  showConfirmClose = false;

  private static readonly LIBELLE_RE = /^[\p{L}\p{N} ]+$/u;
  private static readonly DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  private static readonly MONTANT_RE = /^-?\d+(\.\d{1,2})?$/;

  ngOnInit(): void {
    this.planService.getComptes().subscribe({
      next: (list) => (this.comptes = list.filter((c) => c.statut === 'ACTIF')),
      error: () => (this.comptes = []),
    });
  }

  private emptyLigne(): LigneModel {
    return {
      compteInput: '',
      numeroCompte: '',
      libelleCompte: '',
      libelle: '',
      debit: '',
      credit: '',
      showDropdown: false,
    };
  }

  // === Recherche de compte (RG-008, insensible a la casse) ===
  filteredComptes(ligne: LigneModel): CompteComptable[] {
    const q = ligne.compteInput.trim().toLowerCase();
    const base = q
      ? this.comptes.filter(
          (c) => c.numeroCompte.toLowerCase().startsWith(q) || c.intitule.toLowerCase().includes(q),
        )
      : this.comptes;
    return base.slice(0, 50);
  }

  onCompteInput(ligne: LigneModel): void {
    ligne.showDropdown = true;
    // Tant qu'aucun compte n'est confirme, on invalide la selection courante.
    ligne.numeroCompte = '';
    ligne.libelleCompte = '';
  }

  toggleDropdown(ligne: LigneModel): void {
    ligne.showDropdown = !ligne.showDropdown;
  }

  selectCompte(ligne: LigneModel, compte: CompteComptable): void {
    ligne.numeroCompte = compte.numeroCompte;
    ligne.libelleCompte = compte.intitule;
    ligne.compteInput = compte.numeroCompte;
    ligne.showDropdown = false;
    this.maybeGenerateNumero(compte.numeroCompte);
  }

  closeDropdown(ligne: LigneModel): void {
    // Petit delai pour laisser le clic sur une option se declencher.
    setTimeout(() => (ligne.showDropdown = false), 150);
  }

  // === Code journal + numero d'operation (RG-003/RG-006, figes des la 1ere saisie) ===
  private maybeGenerateNumero(numeroCompte: string): void {
    if (this.numeroOperation) return; // RG-006 : fige
    const dateIso = this.dateError() === '' ? this.toIso(this.dateStr) : undefined;
    this.journalService.getNextNumero(this.client.id, numeroCompte, dateIso).subscribe({
      next: (res) => {
        this.codeJournal = res.codeJournal;
        this.numeroOperation = res.numeroOperation;
      },
    });
  }

  // === Debit / Credit mutuellement exclusifs (RG-010) ===
  hasDebit(ligne: LigneModel): boolean {
    return ligne.debit.trim() !== '';
  }
  hasCredit(ligne: LigneModel): boolean {
    return ligne.credit.trim() !== '';
  }

  // === Validation des montants (RG-011/RG-012) ===
  montantError(ligne: LigneModel): string {
    for (const raw of [ligne.debit, ligne.credit]) {
      const v = raw.trim();
      if (!v) continue;
      if (!EcritureModal.MONTANT_RE.test(v) || parseFloat(v) <= 0) {
        return 'Le montant doit etre une valeur positive';
      }
    }
    return '';
  }

  libelleError(ligne: LigneModel): string {
    const v = ligne.libelle.trim();
    if (!v) return '';
    return EcritureModal.LIBELLE_RE.test(v) ? '' : 'Caracteres speciaux non autorises';
  }

  // === Date (RG-002) ===
  dateError(): string {
    const v = this.dateStr.trim();
    if (!v) return '';
    const m = EcritureModal.DATE_RE.exec(v);
    if (!m) return 'Format invalide — attendu : jj/mm/aaaa';
    const [, dd, mm, yyyy] = m;
    const day = +dd, month = +mm, year = +yyyy;
    const d = new Date(year, month - 1, day);
    if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
      return 'Format invalide — attendu : jj/mm/aaaa';
    }
    const debut = new Date(this.client.dateDebutExercice);
    const fin = new Date(this.client.dateFinExercice);
    if (d < this.atMidnight(debut) || d > this.atMidnight(fin)) {
      return 'La date doit appartenir a l’exercice en cours';
    }
    return '';
  }

  // === Totaux temps reel (RG-013) ===
  private parseMontant(raw: string): number {
    const v = raw.trim();
    if (!v || !EcritureModal.MONTANT_RE.test(v)) return 0;
    const n = parseFloat(v);
    return n > 0 ? n : 0;
  }

  totalDebit(): number {
    return this.lignes.reduce((s, l) => s + this.parseMontant(l.debit), 0);
  }
  totalCredit(): number {
    return this.lignes.reduce((s, l) => s + this.parseMontant(l.credit), 0);
  }
  ecart(): number {
    return Math.round((this.totalDebit() - this.totalCredit()) * 100) / 100;
  }
  isEquilibre(): boolean {
    return this.totalDebit() > 0 && this.ecart() === 0;
  }

  // === Lignes ===
  addLigne(): void {
    this.lignes.push(this.emptyLigne());
  }
  removeLigne(index: number): void {
    if (this.lignes.length > 1) this.lignes.splice(index, 1);
  }

  /** Une ligne est "remplie" des qu'un de ses champs porte une valeur. */
  private isLigneRenseignee(l: LigneModel): boolean {
    return !!(l.numeroCompte || l.compteInput.trim() || l.libelle.trim() || l.debit.trim() || l.credit.trim());
  }

  /** Une ligne est complete et valide (compte + libelle + exactement un montant positif). */
  private isLigneValide(l: LigneModel): boolean {
    if (!l.numeroCompte) return false;
    if (!l.libelle.trim() || this.libelleError(l)) return false;
    if (this.montantError(l)) return false;
    const d = this.hasDebit(l), c = this.hasCredit(l);
    return (d || c) && !(d && c);
  }

  private lignesRenseignees(): LigneModel[] {
    return this.lignes.filter((l) => this.isLigneRenseignee(l));
  }

  // === Etat du bouton "Enregistrer en brouillon" (RG-014) ===
  canSave(): boolean {
    if (this.saving) return false;
    if (!this.dateStr.trim() || this.dateError()) return false;
    const remplies = this.lignesRenseignees();
    if (remplies.length === 0) return false;
    if (!remplies.every((l) => this.isLigneValide(l))) return false;
    return this.isEquilibre();
  }

  /** Y a-t-il une saisie en cours (pour la confirmation de fermeture, RG-017) ? */
  private hasInput(): boolean {
    return !!this.dateStr.trim() || this.lignes.some((l) => this.isLigneRenseignee(l));
  }

  // === Enregistrement (RG-015) ===
  submit(): void {
    if (!this.canSave()) return;
    this.saving = true;
    this.submitError = '';

    const lignes: LigneEcritureRequest[] = this.lignesRenseignees().map((l) => ({
      numeroCompte: l.numeroCompte,
      libelle: l.libelle.trim(),
      debit: this.hasDebit(l) ? this.parseMontant(l.debit) : null,
      credit: this.hasCredit(l) ? this.parseMontant(l.credit) : null,
    }));

    this.journalService
      .createBrouillon({ clientId: this.client.id, date: this.toIso(this.dateStr), lignes })
      .subscribe({
        next: (res) => {
          this.saving = false;
          this.saved.emit(res);
        },
        error: (err) => {
          this.saving = false;
          this.submitError = err.error?.message || 'Une erreur est survenue lors de l’enregistrement';
        },
      });
  }

  // === Fermeture (RG-017) ===
  attemptClose(): void {
    if (this.hasInput()) {
      this.showConfirmClose = true;
    } else {
      this.closed.emit();
    }
  }
  confirmClose(): void {
    this.showConfirmClose = false;
    this.closed.emit();
  }
  cancelClose(): void {
    this.showConfirmClose = false;
  }

  // === Helpers ===
  private atMidnight(d: Date): Date {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  private toIso(dateStr: string): string {
    const m = EcritureModal.DATE_RE.exec(dateStr.trim());
    if (!m) return '';
    const [, dd, mm, yyyy] = m;
    return `${yyyy}-${mm}-${dd}`;
  }
}
