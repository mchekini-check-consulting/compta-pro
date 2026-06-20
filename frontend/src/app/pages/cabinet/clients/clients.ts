import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import {
  ClientService,
  Client,
  RegimeFiscal,
  RegimeTVA,
  FormeJuridique,
  StatutDossier,
  ClientSearchCriteria,
} from '../../../services/client';

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.scss'
})
export class Clients implements OnInit {
  clients: Client[] = [];
  isLoading = true;

  // Recherche / filtres
  searchForm: FormGroup;
  selectedStatuts: StatutDossier[] = [];
  total = 0;
  filteredCount = 0;
  dateRangeError = '';
  private readonly filterChanged$ = new Subject<void>();
  private static readonly FILTERS_KEY = 'clients.filters';

  // Modal creation
  showCreateModal = false;
  createForm: FormGroup;
  isCreating = false;
  createError = '';

  // Modal view/edit
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
    this.searchForm = this.fb.group({
      raisonSociale: [''],
      siren: [''],
      formeJuridique: [''],
      dateDebut: [''],
      dateFin: ['']
    });
  }

  ngOnInit(): void {
    this.restoreFilters();
    // Recherche temps reel : on debounce a 300ms (mise a jour < 500ms, AC-11/RG-007)
    this.filterChanged$.pipe(debounceTime(300)).subscribe(() => this.performSearch());
    this.searchForm.valueChanges.subscribe(() => this.onFilterChange());
    this.performSearch();
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

  // === RECHERCHE / FILTRES ===
  private buildCriteria(): ClientSearchCriteria {
    const v = this.searchForm.value;
    return {
      raisonSociale: v.raisonSociale || undefined,
      siren: v.siren || undefined,
      formeJuridique: v.formeJuridique || undefined,
      statuts: this.selectedStatuts.length ? this.selectedStatuts : undefined,
      dateDebut: v.dateDebut || undefined,
      dateFin: v.dateFin || undefined
    };
  }

  performSearch(): void {
    // AC-09 : date de debut posterieure a la date de fin -> message, liste non mise a jour
    const { dateDebut, dateFin } = this.searchForm.value;
    if (dateDebut && dateFin && new Date(dateDebut) > new Date(dateFin)) {
      this.dateRangeError = 'La date de debut doit etre anterieure a la date de fin';
      return;
    }
    this.dateRangeError = '';

    this.clientService.searchClients(this.buildCriteria()).subscribe({
      next: (res) => {
        this.clients = res.clients;
        this.filteredCount = res.count;
        this.total = res.total;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
  }

  private onFilterChange(): void {
    this.persistFilters();
    this.filterChanged$.next();
  }

  toggleStatut(statut: StatutDossier): void {
    const index = this.selectedStatuts.indexOf(statut);
    if (index >= 0) {
      this.selectedStatuts.splice(index, 1);
    } else {
      this.selectedStatuts.push(statut);
    }
    this.onFilterChange();
  }

  isStatutSelected(statut: StatutDossier): boolean {
    return this.selectedStatuts.includes(statut);
  }

  hasActiveFilters(): boolean {
    const v = this.searchForm.value;
    return !!(v.raisonSociale || v.siren || v.formeJuridique || v.dateDebut || v.dateFin
      || this.selectedStatuts.length);
  }

  resetFilters(): void {
    this.selectedStatuts = [];
    this.dateRangeError = '';
    // reset sans emettre pour eviter une recherche intermediaire, puis une seule recherche
    this.searchForm.reset(
      { raisonSociale: '', siren: '', formeJuridique: '', dateDebut: '', dateFin: '' },
      { emitEvent: false }
    );
    this.persistFilters();
    this.performSearch();
  }

  private persistFilters(): void {
    const state = { form: this.searchForm.value, statuts: this.selectedStatuts };
    sessionStorage.setItem(Clients.FILTERS_KEY, JSON.stringify(state));
  }

  private restoreFilters(): void {
    const raw = sessionStorage.getItem(Clients.FILTERS_KEY);
    if (!raw) return;
    try {
      const state = JSON.parse(raw);
      if (state.form) {
        this.searchForm.patchValue(state.form, { emitEvent: false });
      }
      if (Array.isArray(state.statuts)) {
        this.selectedStatuts = state.statuts;
      }
    } catch {
      // etat corrompu : on ignore
    }
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
        // re-applique les filtres courants pour refleter le nouvel etat (tri + compteur)
        this.performSearch();
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

        // re-applique les filtres pour garder la liste coherente (tri, statut, etc.)
        this.performSearch();

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
