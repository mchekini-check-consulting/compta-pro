import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { DASH } from '../dossier-format';

/**
 * Contenu du drawer "Social / Paie" (TREZ-41). Sans mission sociale rattachee
 * (RG-006 TREZ-39 / AC-09), affiche un message dedie ; sinon les sections
 * Donnees de base et Bulletins (champs absents du modele -> "—").
 */
@Component({
  selector: 'app-dossier-social',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dossier-social.html',
  styleUrl: './dossier-social.scss',
})
export class DossierSocial {
  @Input({ required: true }) client!: Client;

  readonly DASH = DASH;

  hasMissionSociale(): boolean {
    return !!this.client.hasMissionSociale;
  }
}
