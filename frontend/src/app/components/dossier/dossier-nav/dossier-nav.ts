import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client } from '../../../services/client';
import { DossierDrawerService, DossierSection } from '../dossier-drawer.service';

interface SectionConfig {
  key: DossierSection;
  /** Libelle accessible (aria-label) ET infobulle par defaut (AC-04 / AC-10). */
  label: string;
  icon: string;
}

/**
 * Les 3 icones de navigation affichees sur chaque ligne de dossier (TREZ-39).
 *
 * L'etat du drawer (ouvert / actif) est delegue a DossierDrawerService pour
 * garantir qu'un seul drawer est ouvert a la fois, tous dossiers confondus.
 */
@Component({
  selector: 'app-dossier-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dossier-nav.html',
  styleUrl: './dossier-nav.scss',
})
export class DossierNav {
  @Input({ required: true }) client!: Client;

  private drawer = inject(DossierDrawerService);

  readonly sections: SectionConfig[] = [
    { key: 'infos', label: 'Informations generales', icon: 'building' },
    { key: 'compta', label: 'Comptabilite', icon: 'calculator' },
    { key: 'social', label: 'Social / Paie', icon: 'users' },
  ];

  /** RG-006 / AC-13 : Social / Paie desactivee si aucune mission sociale rattachee. */
  isDisabled(section: DossierSection): boolean {
    return section === 'social' && !this.client.hasMissionSociale;
  }

  /** AC-13 : l'infobulle d'une icone desactivee explique pourquoi. */
  tooltip(section: SectionConfig): string {
    return this.isDisabled(section.key) ? 'Aucune mission sociale rattachee' : section.label;
  }

  isActive(section: DossierSection): boolean {
    return this.drawer.isActive(this.client.id, section);
  }

  /**
   * Clic / Entree / Espace sur une icone. On stoppe la propagation pour ne pas
   * declencher l'ouverture de la fiche complete (clic sur la ligne).
   */
  onActivate(event: Event, section: DossierSection): void {
    event.stopPropagation();
    if (this.isDisabled(section)) return;
    this.drawer.toggle(this.client, section);
  }
}
