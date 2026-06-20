import { Component, HostListener, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DossierDrawerService, DossierSection } from '../dossier-drawer.service';
import { DossierInfos } from '../dossier-infos/dossier-infos';
import { DossierCompta } from '../dossier-compta/dossier-compta';
import { DossierSocial } from '../dossier-social/dossier-social';

/**
 * Drawer unique des sections de dossier (TREZ-39), rendu une seule fois au
 * niveau de la page. Le contenu detaille de chaque section est livre par
 * TREZ-40 (infos) et TREZ-41 (compta / social).
 */
@Component({
  selector: 'app-dossier-drawer',
  standalone: true,
  imports: [CommonModule, DossierInfos, DossierCompta, DossierSocial],
  templateUrl: './dossier-drawer.html',
  styleUrl: './dossier-drawer.scss',
})
export class DossierDrawer {
  private drawer = inject(DossierDrawerService);

  readonly state = this.drawer.state;
  readonly loading = this.drawer.loading;
  readonly detail = this.drawer.detail;
  readonly loadError = this.drawer.loadError;

  private readonly labels: Record<DossierSection, string> = {
    infos: 'Informations generales',
    compta: 'Comptabilite',
    social: 'Social / Paie',
  };

  readonly title = computed(() => {
    const s = this.state();
    return s ? this.labels[s.section] : '';
  });

  close(): void {
    this.drawer.close();
  }

  retry(): void {
    this.drawer.retry();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.close();
  }
}
