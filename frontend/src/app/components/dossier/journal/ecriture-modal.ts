import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Client } from '../../../services/client';
import { CompteComptable, PlanComptableService } from '../../../services/plan-comptable';
import { EcritureResponse, JournalService, LigneEcritureRequest } from '../../../services/journal';
import {
  ComptesVentilation,
  TAUX_TVA,
  TypeOperation,
  clesPourType,
  genererVentilation,
  libelleCle,
} from '../../../services/tva-ventilation';
import { VentilationConfigStore } from '../../../services/ventilation-config.store';
import { ChampDef, Gabarit, genererGabarit } from '../../../services/gabarits';
import { GabaritLibrary } from '../gabarits/gabarit-library';
import { GabaritBuilder } from '../gabarits/gabarit-builder';

interface LigneModel {
  /** Texte saisi dans le champ compte (sert aussi a la recherche). */
  compteInput: string;
  numeroCompte: string;
  libelleCompte: string;
  libelle: string;
  debit: string;
  credit: string;
  showDropdown: boolean;
  /** Ligne issue de la ventilation automatique (badge "auto", regeneration). */
  auto?: boolean;
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
  imports: [CommonModule, FormsModule, GabaritLibrary, GabaritBuilder],
  templateUrl: './ecriture-modal.html',
  styleUrl: './ecriture-modal.scss',
})
export class EcritureModal implements OnInit {
  @Input({ required: true }) client!: Client;
  /** Mode embarque (onglet d'une modale parente) : pas d'overlay ni de confirmation interne. */
  @Input() embedded = false;
  @Output() saved = new EventEmitter<EcritureResponse>();
  @Output() closed = new EventEmitter<void>();

  private planService = inject(PlanComptableService);
  private journalService = inject(JournalService);
  private configStore = inject(VentilationConfigStore);

  // Referentiel des comptes (charge une fois) et recherche.
  comptes: CompteComptable[] = [];

  dateStr = '';
  numeroOperation = '';
  codeJournal = '';

  // AC-07 : au moins 2 lignes vides pre-affichees.
  lignes: LigneModel[] = [this.emptyLigne(), this.emptyLigne()];

  // === Saisie assistee TVA ===
  readonly typesOperation: { value: TypeOperation; label: string }[] = [
    { value: 'ACHAT', label: 'Achat fournisseur' },
    { value: 'VENTE', label: 'Vente client' },
    { value: 'IMMO', label: 'Acquisition immobilisation' },
  ];
  readonly tauxTvaOptions = TAUX_TVA;
  typeOp: TypeOperation = 'ACHAT';
  montantHt = '';
  tauxTva = 20;
  genere = false;
  // Mini-UI de configuration des comptes par dossier (AC-09).
  showConfig = false;
  configDraft!: ComptesVentilation;

  saving = false;
  submitError = '';
  showConfirmClose = false;

  // Libelle libre : on autorise lettres accentuees, chiffres, ponctuation
  // comptable (/ ' - , . etc.). On interdit seulement tab/retour-ligne
  // (delimiteurs du FEC) ; ces caracteres sont aussi assainis a l'export.
  private static readonly LIBELLE_RE = /^[^\t\r\n]+$/;
  private static readonly DATE_RE = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  private static readonly MONTANT_RE = /^-?\d+(\.\d{1,2})?$/;

  ngOnInit(): void {
    // AC-06 : date pre-remplie avec la date du jour (jj/mm/aaaa).
    if (!this.dateStr) this.dateStr = this.todayFr();
    this.planService.getComptes().subscribe({
      next: (list) => (this.comptes = list.filter((c) => c.statut === 'ACTIF')),
      error: () => (this.comptes = []),
    });
  }

  private todayFr(): string {
    const d = new Date();
    const jj = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${jj}/${mm}/${d.getFullYear()}`;
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
      auto: false,
    };
  }

  // === Saisie assistee : ventilation automatique TVA ===

  /** Montant HT parse (0 si invalide). */
  private htValue(): number {
    const v = this.montantHt.trim().replace(',', '.');
    const n = parseFloat(v);
    return EcritureModal.MONTANT_RE.test(v) && n > 0 ? n : 0;
  }

  /** Applique des lignes generees (auto) en conservant les lignes manuelles (AC-07/AC-08). */
  private appliquerGenerees(
    generees: { numeroCompte: string; libelle: string; debit: number | null; credit: number | null }[]
  ): void {
    const auto = generees.map((g): LigneModel => {
      const ref = this.comptes.find((c) => c.numeroCompte === g.numeroCompte);
      return {
        compteInput: g.numeroCompte,
        numeroCompte: g.numeroCompte,
        libelleCompte: ref?.intitule ?? g.libelle,
        libelle: g.libelle,
        debit: g.debit != null ? g.debit.toFixed(2) : '',
        credit: g.credit != null ? g.credit.toFixed(2) : '',
        showDropdown: false,
        auto: true,
      };
    });
    const manuelles = this.lignes.filter((l) => !l.auto && this.isLigneRenseignee(l));
    this.lignes = [...auto, ...manuelles];
    this.genere = true;
    this.maybeGenerateNumero(auto[0]?.numeroCompte ?? '');
  }

  /** Genere les lignes a partir du type / HT / taux (AC-01 a AC-05). */
  genererAssiste(): void {
    const ht = this.htValue();
    if (ht <= 0) return;
    const comptes = this.configStore.get(this.client.id);
    this.appliquerGenerees(genererVentilation(this.typeOp, ht, this.tauxTva, comptes));
  }

  /** Regenere les lignes auto au changement de type / HT / taux (AC-07 / RG-006). */
  onAssisteChange(): void {
    if (this.genere && !this.gabaritActif) this.genererAssiste();
  }

  // === Bibliotheque de gabarits (TREZ — gabarits prédéfinis + personnalises) ===
  showLibrary = false;
  showBuilder = false;
  gabaritActif: Gabarit | null = null;
  gabaritValeurs: Record<string, number | string> = {};
  gabaritAlertes: string[] = [];

  ouvrirLibrary(): void {
    this.showLibrary = true;
  }
  fermerLibrary(): void {
    this.showLibrary = false;
  }
  onCreerGabarit(): void {
    this.showLibrary = false;
    this.showBuilder = true;
  }
  onBuilderEnregistre(): void {
    this.showBuilder = false;
    this.showLibrary = true; // retour a la bibliotheque
  }
  onBuilderAnnule(): void {
    this.showBuilder = false;
    this.showLibrary = true;
  }

  /** Selection d'un gabarit : initialise les champs et genere (AC-02). */
  onChoisirGabarit(g: Gabarit): void {
    this.gabaritActif = g;
    this.showLibrary = false;
    this.gabaritValeurs = {};
    for (const champ of g.champs) {
      this.gabaritValeurs[champ.id] = champ.defaut ?? (champ.type === 'choix' ? (champ.options?.[0]?.value ?? '') : 0);
    }
    this.genererDepuisGabarit();
  }

  /** Retour au mode TVA generique. */
  changerGabarit(): void {
    this.gabaritActif = null;
    this.gabaritAlertes = [];
  }

  champsGabarit(): ChampDef[] {
    return this.gabaritActif?.champs ?? [];
  }

  /** Genere les lignes du gabarit actif + alertes (AC-03 a AC-08, AC-12/13). */
  genererDepuisGabarit(): void {
    if (!this.gabaritActif) return;
    const res = genererGabarit(this.gabaritActif, this.gabaritValeurs);
    this.appliquerGenerees(res.lignes);
    this.gabaritAlertes = res.alertes;
  }

  onGabaritChampChange(): void {
    this.genererDepuisGabarit();
  }

  // === Mini-UI de configuration des comptes par dossier (AC-09) ===
  configCles(): (keyof ComptesVentilation)[] {
    return clesPourType(this.typeOp);
  }
  configLibelle(cle: keyof ComptesVentilation): string {
    return libelleCle(cle);
  }
  openConfig(): void {
    this.configDraft = this.configStore.get(this.client.id);
    this.showConfig = true;
  }
  saveConfig(): void {
    this.configStore.set(this.client.id, this.configDraft);
    this.showConfig = false;
    if (this.genere) this.genererAssiste();
  }
  cancelConfig(): void {
    this.showConfig = false;
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

  /**
   * Y a-t-il une saisie en cours (confirmation de fermeture, RG-017 / AC-05) ?
   * La date etant pre-remplie, on ne considere que le contenu des lignes.
   */
  hasInput(): boolean {
    return this.lignes.some((l) => this.isLigneRenseignee(l));
  }

  /** Tooltip du bouton Enregistrer desactive quand l'ecriture est desequilibree (AC-09). */
  ecartTooltip(): string {
    if (this.ecart() === 0) return '';
    return `Ecriture desequilibree — ecart de ${this.ecart().toFixed(2)} €`;
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
          // En mode embarque (onglet de la modale), le formulaire reste monte :
          // on le reinitialise pour une nouvelle ecriture et eviter un doublon.
          if (this.embedded) this.resetForm();
        },
        error: (err) => {
          this.saving = false;
          this.submitError = err.error?.message || 'Une erreur est survenue lors de l’enregistrement';
        },
      });
  }

  /** Reinitialise le formulaire apres enregistrement (la date du jour est conservee). */
  private resetForm(): void {
    this.lignes = [this.emptyLigne(), this.emptyLigne()];
    this.numeroOperation = '';
    this.codeJournal = '';
    this.montantHt = '';
    this.genere = false;
    this.submitError = '';
    this.gabaritActif = null;
    this.gabaritAlertes = [];
    this.gabaritValeurs = {};
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
