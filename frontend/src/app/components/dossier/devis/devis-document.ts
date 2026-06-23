import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DevisResponse, StatutDevis } from '../../../services/devis';

const STATUT_LABEL: Record<StatutDevis, string> = {
  BROUILLON: 'Brouillon',
  ENVOYE: 'Envoye',
  EN_ATTENTE_SIGNATURE: 'En attente de signature',
  SIGNE: 'Signe / Accepte',
  REFUSE: 'Refuse',
  EXPIRE: 'Expire',
};

/**
 * Rendu « papier » d'un devis, imprimable et exportable en PDF (US Impression).
 * <p>
 * Le bouton imprimante declenche {@code window.print()} ; les regles CSS @page
 * (A4, 14 mm) et {@code .app-chrome} masque sont definies globalement.
 */
@Component({
  selector: 'app-devis-document',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './devis-document.html',
  styleUrl: './devis-document.scss',
})
export class DevisDocument {
  @Input({ required: true }) devis!: DevisResponse;
  /** Affiche le tampon « PAYE » en filigrane (AC-04, facture reglee). */
  @Input() showPaidStamp = false;
  @Output() readonly fermer = new EventEmitter<void>();

  readonly statutLabel = STATUT_LABEL;

  /** Mention legale manuscrite imposee dans le bloc signature (AC-10 US-F-001). */
  readonly mentionSignature = 'Recu avant execution des travaux';

  get mentionsLignes(): string[] {
    return (this.devis.mentionsLegales ?? '').split('\n').filter((l) => l.trim().length > 0);
  }

  /**
   * Lance l'impression en pre-configurant le titre du document afin que le nom
   * de fichier PDF par defaut soit [Numero]_[NomClient].pdf (AC-03, RG-003).
   */
  imprimer(): void {
    const ancienTitre = document.title;
    document.title = this.nomFichier();
    window.print();
    document.title = ancienTitre;
  }

  /** Nom de fichier sans accents ni espaces ni caracteres speciaux (RG-003). */
  private nomFichier(): string {
    const client = this.sansAccents(this.devis.destinataire.raisonSociale ?? 'Client')
      .replace(/[^a-zA-Z0-9]/g, '');
    const numero = this.devis.numero.replace(/[^a-zA-Z0-9-]/g, '');
    return `${numero}_${client}`;
  }

  private sansAccents(valeur: string): string {
    return valeur.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }
}
