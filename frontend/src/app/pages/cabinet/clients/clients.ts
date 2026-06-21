import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  ClientService,
  Client,
  RegimeFiscal,
  RegimeTVA,
  FormeJuridique,
  StatutDossier,
} from '../../../services/client';

import { DossierNav } from '../../../components/dossier/dossier-nav/dossier-nav';
import { DossierDrawer } from '../../../components/dossier/dossier-drawer/dossier-drawer';
import { TasksStore } from '../../../services/tasks.store';
import { avatarColor as avatarColorFn, initials as initialsFn, normalizeText as normalize } from '../../../components/dossier/dossier-format';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DossierNav, DossierDrawer],
  templateUrl: './clients.html',
  styleUrl: './clients.scss'
})
export class Clients implements OnInit {
  private tasksStore = inject(TasksStore);

  // === Liste / recherche (filtrage cote client) ===
  readonly allClients = signal<Client[]>([]);
  readonly isLoading = signal(true);
  readonly loadError = signal(false);

  readonly searchTerm = signal('');
  readonly selectedStatuts = signal<StatutDossier[]>([]);
  readonly dateDebut = signal('');
  readonly dateFin = signal('');

  /** Dossiers filtres puis tries (tâches en attente d'abord, puis alphabetique). RG-001. */
  readonly displayedClients = computed(() => {
    const term = normalize(this.searchTerm());
    const statuts = this.selectedStatuts();
    const debut = this.dateDebut();
    const fin = this.dateFin();

    const filtered = this.allClients().filter((c) => {
      // Recherche : raison sociale + SIREN + forme juridique (RG-003 / AC-04 / AC-05)
      if (term) {
        const haystack = normalize(
          `${c.raisonSociale} ${c.siren} ${this.getFormeJuridiqueLabel(c.formeJuridique)}`
        );
        if (!haystack.includes(term)) return false;
      }
      if (statuts.length && !statuts.includes(c.statut)) return false;
      if (debut && c.dateImmatriculation < debut) return false;
      if (fin && c.dateImmatriculation > fin) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      const pa = this.pendingForClient(a.id);
      const pb = this.pendingForClient(b.id);
      if (pa !== pb) return pb - pa; // tâches en attente en premier
      return a.raisonSociale.localeCompare(b.raisonSociale, 'fr');
    });
  });

  readonly total = computed(() => this.allClients().length);
  readonly filteredCount = computed(() => this.displayedClients().length);

  // === Modales (creation / consultation / edition) ===
  showCreateModal = false;
  createForm: FormGroup;
  isCreating = false;
  createError = '';

  showViewModal = false;
  selectedClient: Client | null = null;
  editForm: FormGroup;
  isEditMode = false;
  isUpdating = false;
  updateError = '';
  updateSuccess = false;
  showConfirmClose = false;
  hasChanges = false;

  regimesFiscaux: { value: RegimeFiscal; label: string }[] = [
    { value: 'IR', label: 'Impot sur le Revenu (IR)' },
    { value: 'IS', label: 'Impot sur les Societes (IS)' }
  ];

  regimesTVA: { value: RegimeTVA; label: string }[] = [
    { value: 'MENSUELLE', label: 'TVA mensuelle' },
    { value: 'TRIMESTRIELLE', label: 'TVA trimestrielle' },
    { value: 'ANNUELLE', label: 'TVA annuelle' }
  ];

  formesJuridiques: { value: FormeJuridique; label: string }[] = [
    { value: 'SARL', label: 'SARL' },
    { value: 'SAS', label: 'SAS' },
    { value: 'SASU', label: 'SASU' },
    { value: 'EURL', label: 'EURL' },
    { value: 'EI', label: 'EI' },
    { value: 'SA', label: 'SA' },
    { value: 'SCI', label: 'SCI' },
    { value: 'AUTRE', label: 'Autre' }
  ];

  statutsDossier: { value: StatutDossier; label: string }[] = [
    { value: 'ACTIF', label: 'Actif' },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'CLOTURE', label: 'Cloture' }
  ];

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder
  ) {
    this.createForm = this.createClientForm();
    this.editForm = this.createClientForm();
  }

  ngOnInit(): void {
    this.reloadClients();
  }

  private createClientForm(): FormGroup {
    return this.fb.group({
      raisonSociale: ['', [Validators.required]],
      siren: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      formeJuridique: ['', [Validators.required]],
      statut: ['', [Validators.required]],
      dateImmatriculation: ['', [Validators.required]],
      regimeFiscal: ['', [Validators.required]],
      regimeTVA: ['', [Validators.required]],
      dateDebutExercice: ['', [Validators.required]],
      dateFinExercice: ['', [Validators.required]]
    });
  }

  // === Chargement ===
  reloadClients(): void {
    this.isLoading.set(true);
    this.loadError.set(false);
    this.clientService.getClients().subscribe({
      next: (list) => {
        this.allClients.set(list);
        this.isLoading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.isLoading.set(false);
      },
    });
  }

  // === Recherche / filtres ===
  onSearchInput(value: string): void {
    this.searchTerm.set(value);
  }

  clearSearch(): void {
    this.searchTerm.set('');
  }

  toggleStatut(statut: StatutDossier): void {
    this.selectedStatuts.update((list) =>
      list.includes(statut) ? list.filter((s) => s !== statut) : [...list, statut]
    );
  }

  isStatutSelected(statut: StatutDossier): boolean {
    return this.selectedStatuts().includes(statut);
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm() || this.selectedStatuts().length || this.dateDebut() || this.dateFin());
  }

  resetFilters(): void {
    this.searchTerm.set('');
    this.selectedStatuts.set([]);
    this.dateDebut.set('');
    this.dateFin.set('');
  }

  // === Avatar (AC-02 / AC-03 / RG-002) ===
  pendingForClient(clientId: number): number {
    return this.tasksStore.pendingForClient(clientId);
  }

  initials(raisonSociale: string): string {
    return initialsFn(raisonSociale);
  }

  avatarColor(siren: string): string {
    return avatarColorFn(siren);
  }

  // === CREATE MODAL ===
  openCreateModal(): void {
    this.createForm.reset();
    this.createError = '';
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  onSirenInput(event: Event, form: FormGroup): void {
    const input = event.target as HTMLInputElement;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 9);
    form.get('siren')?.setValue(input.value);
  }

  isExerciceValid(form: FormGroup): boolean {
    const debut = form.get('dateDebutExercice')?.value;
    const fin = form.get('dateFinExercice')?.value;
    if (!debut || !fin) return true;

    const dateDebut = new Date(debut);
    const dateFin = new Date(fin);

    if (dateFin <= dateDebut) return false;

    const monthsDiff = (dateFin.getFullYear() - dateDebut.getFullYear()) * 12 +
                       (dateFin.getMonth() - dateDebut.getMonth());
    return monthsDiff <= 24;
  }

  isCreateFormValid(): boolean {
    return this.createForm.valid && this.isExerciceValid(this.createForm);
  }

  submitCreate(): void {
    if (!this.isCreateFormValid()) return;

    this.isCreating = true;
    this.createError = '';

    this.clientService.createClient(this.createForm.value).subscribe({
      next: () => {
        this.isCreating = false;
        this.closeCreateModal();
        this.reloadClients();
      },
      error: (error) => {
        this.isCreating = false;
        this.createError = error.error?.message || 'Une erreur est survenue';
      }
    });
  }

  // === VIEW/EDIT MODAL ===
  openViewModal(client: Client): void {
    this.selectedClient = client;
    this.isEditMode = false;
    this.updateError = '';
    this.updateSuccess = false;
    this.hasChanges = false;
    this.editForm.patchValue({
      raisonSociale: client.raisonSociale,
      siren: client.siren,
      formeJuridique: client.formeJuridique,
      statut: client.statut,
      dateImmatriculation: client.dateImmatriculation,
      regimeFiscal: client.regimeFiscal,
      regimeTVA: client.regimeTVA,
      dateDebutExercice: client.dateDebutExercice,
      dateFinExercice: client.dateFinExercice
    });
    this.showViewModal = true;
  }

  enableEditMode(): void {
    this.isEditMode = true;
    this.hasChanges = false;
  }

  onFieldChange(): void {
    if (this.isEditMode && this.selectedClient) {
      const current = this.editForm.value;
      this.hasChanges =
        current.raisonSociale !== this.selectedClient.raisonSociale ||
        current.siren !== this.selectedClient.siren ||
        current.formeJuridique !== this.selectedClient.formeJuridique ||
        current.statut !== this.selectedClient.statut ||
        current.dateImmatriculation !== this.selectedClient.dateImmatriculation ||
        current.regimeFiscal !== this.selectedClient.regimeFiscal ||
        current.regimeTVA !== this.selectedClient.regimeTVA ||
        current.dateDebutExercice !== this.selectedClient.dateDebutExercice ||
        current.dateFinExercice !== this.selectedClient.dateFinExercice;
    }
  }

  isEditFormValid(): boolean {
    return this.editForm.valid && this.isExerciceValid(this.editForm) && this.hasChanges;
  }

  submitUpdate(): void {
    if (!this.isEditFormValid() || !this.selectedClient) return;

    this.isUpdating = true;
    this.updateError = '';

    this.clientService.updateClient(this.selectedClient.id, this.editForm.value).subscribe({
      next: (updatedClient) => {
        this.isUpdating = false;
        this.updateSuccess = true;
        this.selectedClient = updatedClient;
        this.isEditMode = false;
        this.hasChanges = false;
        this.reloadClients();

        setTimeout(() => {
          this.updateSuccess = false;
        }, 3000);
      },
      error: (error) => {
        this.isUpdating = false;
        this.updateError = error.error?.message || 'Une erreur est survenue. Veuillez reessayer.';
      }
    });
  }

  closeViewModal(): void {
    if (this.isEditMode && this.hasChanges) {
      this.showConfirmClose = true;
    } else {
      this.showViewModal = false;
      this.selectedClient = null;
    }
  }

  confirmClose(): void {
    this.showConfirmClose = false;
    this.showViewModal = false;
    this.selectedClient = null;
    this.isEditMode = false;
    this.hasChanges = false;
  }

  cancelClose(): void {
    this.showConfirmClose = false;
  }

  getRegimeFiscalLabel(value: RegimeFiscal): string {
    return this.regimesFiscaux.find(r => r.value === value)?.label || value;
  }

  getRegimeTVALabel(value: RegimeTVA): string {
    return this.regimesTVA.find(r => r.value === value)?.label || value;
  }

  getFormeJuridiqueLabel(value: FormeJuridique): string {
    return this.formesJuridiques.find(f => f.value === value)?.label || value;
  }

  getStatutLabel(value: StatutDossier): string {
    return this.statutsDossier.find(s => s.value === value)?.label || value;
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
}
