import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Client } from '../../../services/client';
import {
  CreateDevisRequest,
  DevisResponse,
  DevisService,
  StatutDevis,
  TAUX_TVA,
} from '../../../services/devis';
import { DevisDocument } from './devis-document';

/** Libelles et couleurs des badges de statut (RG-004 de la gestion des statuts). */
const STATUT_META: Record<StatutDevis, { label: string; classe: string }> = {
  BROUILLON: { label: 'Brouillon', classe: 'devis__badge--brouillon' },
  ENVOYE: { label: 'Envoye', classe: 'devis__badge--envoye' },
  EN_ATTENTE_SIGNATURE: { label: 'En attente de signature', classe: 'devis__badge--attente' },
  SIGNE: { label: 'Signe / Accepte', classe: 'devis__badge--signe' },
  REFUSE: { label: 'Refuse', classe: 'devis__badge--refuse' },
  EXPIRE: { label: 'Expire', classe: 'devis__badge--expire' },
};

/**
 * Onglet « Devis » : liste des devis du dossier et formulaire de creation avec
 * calcul des totaux en temps reel (US-F-001).
 */
@Component({
  selector: 'app-devis',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DevisDocument],
  templateUrl: './devis.html',
  styleUrl: './devis.scss',
})
export class Devis implements OnInit {
  @Input({ required: true }) client!: Client;

  private fb = inject(FormBuilder);
  private devisService = inject(DevisService);

  readonly tauxTva = TAUX_TVA;
  readonly statutMeta = STATUT_META;

  devisList = signal<DevisResponse[]>([]);
  loading = signal(true);
  /** Affiche le formulaire de creation. */
  enCreation = signal(false);
  numeroApercu = signal('');
  error = signal('');
  message = signal('');
  /** Devis affiche en mode document imprimable (null = liste). */
  apercu = signal<DevisResponse | null>(null);

  form!: FormGroup;

  ngOnInit(): void {
    this.charger();
  }

  charger(): void {
    this.loading.set(true);
    this.devisService.list(this.client.id).subscribe({
      next: (list) => {
        this.devisList.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Impossible de charger les devis.');
        this.loading.set(false);
      },
    });
  }

  get lignes(): FormArray {
    return this.form.get('lignes') as FormArray;
  }

  /** Ouvre le formulaire « Nouveau devis » (AC-01/AC-04). */
  nouveau(): void {
    const aujourdhui = new Date().toISOString().slice(0, 10);
    const validite = new Date();
    validite.setDate(validite.getDate() + 30);

    this.form = this.fb.group({
      clientAttention: [''],
      dateEmission: [aujourdhui, Validators.required],
      dateDebutPrestation: [''],
      dateValidite: [validite.toISOString().slice(0, 10), Validators.required],
      acompteActif: [false],
      acompteTaux: [30],
      mentionsLegales: [''],
      lignes: this.fb.array([this.ligneVide()]),
    });

    this.message.set('');
    this.error.set('');
    this.enCreation.set(true);
    this.devisService.nextNumero().subscribe({
      next: (r) => this.numeroApercu.set(r.numeroOperation),
      error: () => this.numeroApercu.set(''),
    });
  }

  annuler(): void {
    this.enCreation.set(false);
  }

  private ligneVide(): FormGroup {
    return this.fb.group({
      designation: ['', Validators.required],
      detail: [''],
      quantite: [1, [Validators.required, Validators.min(0.001)]],
      prixUnitaireHT: [0, [Validators.required, Validators.min(0)]],
      tauxTva: [20, Validators.required],
    });
  }

  ajouterLigne(): void {
    this.lignes.push(this.ligneVide());
  }

  supprimerLigne(index: number): void {
    if (this.lignes.length > 1) {
      this.lignes.removeAt(index);
    }
  }

  /** Total HT d'une ligne (Qte x PU HT) — AC-05. */
  ligneTotalHT(index: number): number {
    const l = this.lignes.at(index).value;
    return this.arrondi((l.quantite || 0) * (l.prixUnitaireHT || 0));
  }

  /** Totaux HT / TVA / TTC recalcules a la volee (AC-07). */
  get totalHT(): number {
    return this.arrondi(
      this.lignes.controls.reduce((s, c) => s + (c.value.quantite || 0) * (c.value.prixUnitaireHT || 0), 0),
    );
  }

  get totalTVA(): number {
    return this.arrondi(
      this.lignes.controls.reduce(
        (s, c) => s + ((c.value.quantite || 0) * (c.value.prixUnitaireHT || 0) * (c.value.tauxTva || 0)) / 100,
        0,
      ),
    );
  }

  get totalTTC(): number {
    return this.arrondi(this.totalHT + this.totalTVA);
  }

  /** Acompte sur le TTC (RG-003), seulement si active. */
  get acompteMontant(): number {
    if (!this.form?.value.acompteActif) return 0;
    return this.arrondi((this.totalTTC * (this.form.value.acompteTaux || 0)) / 100);
  }

  private arrondi(v: number): number {
    return Math.round(v * 100) / 100;
  }

  enregistrer(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;
    const request: CreateDevisRequest = {
      clientId: this.client.id,
      clientAttention: v.clientAttention || null,
      dateEmission: v.dateEmission,
      dateDebutPrestation: v.dateDebutPrestation || null,
      dateValidite: v.dateValidite,
      acompteActif: v.acompteActif,
      acompteTaux: v.acompteActif ? v.acompteTaux : null,
      mentionsLegales: v.mentionsLegales || null,
      lignes: (v.lignes as any[]).map((l) => ({
        designation: l.designation,
        detail: l.detail || null,
        quantite: l.quantite,
        prixUnitaireHT: l.prixUnitaireHT,
        tauxTva: l.tauxTva,
      })),
    };

    this.devisService.create(request).subscribe({
      next: (d) => {
        this.message.set(`Devis ${d.numero} cree.`);
        this.enCreation.set(false);
        this.charger();
      },
      error: () => this.error.set('Impossible de creer le devis.'),
    });
  }

  /** Change le statut depuis la liste (RG-001). */
  changerStatut(d: DevisResponse, statut: StatutDevis): void {
    this.devisService.changerStatut(d.id, statut).subscribe({
      next: () => this.charger(),
      error: () => this.error.set('Transition de statut impossible.'),
    });
  }

  /** Ouvre l'apercu document imprimable d'un devis (US Impression). */
  ouvrirApercu(d: DevisResponse): void {
    this.apercu.set(d);
  }

  fermerApercu(): void {
    this.apercu.set(null);
  }

  relancer(d: DevisResponse): void {
    this.devisService.relancer(d.id).subscribe({
      next: (n) => {
        this.message.set(`Devis relance : ${n.numero}.`);
        this.charger();
      },
      error: () => this.error.set('Relance impossible.'),
    });
  }
}
