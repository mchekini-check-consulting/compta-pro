import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentService, DocumentType, DocumentInfo } from '../../../services/document';

interface DocumentSlot {
  type: DocumentType;
  label: string;
  description: string;
  file: File | null;
  uploadedDoc: DocumentInfo | null;
  isUploading: boolean;
  error: string;
}

@Component({
  selector: 'app-document-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './document-upload.html',
  styleUrl: './document-upload.scss'
})
export class DocumentUpload implements OnInit {
  documents: DocumentSlot[] = [
    {
      type: 'CNI',
      label: 'Carte Nationale d\'Identite',
      description: 'Recto/verso de votre CNI en cours de validite',
      file: null,
      uploadedDoc: null,
      isUploading: false,
      error: ''
    },
    {
      type: 'KBIS',
      label: 'Extrait KBIS',
      description: 'Extrait KBIS de moins de 3 mois',
      file: null,
      uploadedDoc: null,
      isUploading: false,
      error: ''
    },
    {
      type: 'STATUTS',
      label: 'Statuts de la societe',
      description: 'Statuts constitutifs de votre cabinet',
      file: null,
      uploadedDoc: null,
      isUploading: false,
      error: ''
    }
  ];

  isSubmitting = false;
  submitError = '';
  submitSuccess = false;

  private readonly MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 Mo
  private readonly ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];

  constructor(private documentService: DocumentService) {}

  ngOnInit(): void {
    this.loadExistingDocuments();
  }

  loadExistingDocuments(): void {
    this.documentService.getMyDocuments().subscribe({
      next: (docs) => {
        docs.forEach(doc => {
          const slot = this.documents.find(d => d.type === doc.type);
          if (slot) {
            slot.uploadedDoc = doc;
          }
        });
      },
      error: () => {}
    });
  }

  onFileSelected(event: Event, slot: DocumentSlot): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];
    slot.error = '';

    // Validate file type
    if (!this.ALLOWED_TYPES.includes(file.type)) {
      slot.error = 'Format non supporte. Utilisez PDF, JPG ou PNG.';
      return;
    }

    // Validate file size
    if (file.size > this.MAX_FILE_SIZE) {
      slot.error = 'Le fichier depasse la taille maximale de 300 Mo.';
      return;
    }

    slot.file = file;
    this.uploadDocument(slot);
  }

  uploadDocument(slot: DocumentSlot): void {
    if (!slot.file) return;

    slot.isUploading = true;
    slot.error = '';

    this.documentService.uploadDocument(slot.file, slot.type).subscribe({
      next: (response) => {
        slot.isUploading = false;
        slot.uploadedDoc = response;
        slot.file = null;
      },
      error: (error) => {
        slot.isUploading = false;
        slot.error = error.error?.message || 'Erreur lors du telechargement.';
      }
    });
  }

  canSubmit(): boolean {
    return this.documents.every(d => d.uploadedDoc !== null) && !this.isSubmitting;
  }

  submitDossier(): void {
    if (!this.canSubmit()) return;

    this.isSubmitting = true;
    this.submitError = '';

    this.documentService.submitDossier().subscribe({
      next: (response) => {
        this.isSubmitting = false;
        if (response.success) {
          this.submitSuccess = true;
        } else {
          this.submitError = response.message;
        }
      },
      error: (error) => {
        this.isSubmitting = false;
        this.submitError = error.error?.message || 'Erreur lors de la soumission.';
      }
    });
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'PENDING_VERIFICATION': return 'En attente';
      case 'VERIFIED': return 'Verifie';
      case 'REJECTED': return 'Rejete';
      default: return status;
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'PENDING_VERIFICATION': return 'pending';
      case 'VERIFIED': return 'verified';
      case 'REJECTED': return 'rejected';
      default: return '';
    }
  }
}
