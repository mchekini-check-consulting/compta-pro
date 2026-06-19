import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ClientService, Client, RegimeFiscal, RegimeTVA } from '../../../services/client';

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

  constructor(
    private clientService: ClientService,
    private fb: FormBuilder
  ) {
    this.createForm = this.createClientForm();
    this.editForm = this.createClientForm();
  }

  ngOnInit(): void {
    this.loadClients();
  }

  private createClientForm(): FormGroup {
    return this.fb.group({
      raisonSociale: ['', [Validators.required]],
      siren: ['', [Validators.required, Validators.pattern(/^[0-9]{9}$/)]],
      regimeFiscal: ['', [Validators.required]],
      regimeTVA: ['', [Validators.required]],
      dateDebutExercice: ['', [Validators.required]],
      dateFinExercice: ['', [Validators.required]]
    });
  }

  loadClients(): void {
    this.isLoading = true;
    this.clientService.getClients().subscribe({
      next: (clients) => {
        this.clients = clients;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
    });
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
      next: (client) => {
        this.isCreating = false;
        this.clients.unshift(client);
        this.closeCreateModal();
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

        // Update in list
        const index = this.clients.findIndex(c => c.id === updatedClient.id);
        if (index !== -1) {
          this.clients[index] = updatedClient;
        }

        // Auto-hide success message after 3 seconds
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

  formatDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }
}
