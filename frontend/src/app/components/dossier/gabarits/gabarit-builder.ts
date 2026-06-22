import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChampDef, ChampType, Gabarit, LigneDef, Sens } from '../../../services/gabarits';
import { GabaritStore } from '../../../services/gabarit.store';

/**
 * Constructeur complet de gabarit personnalise (AC-09) : champs variables typés,
 * lignes fixes avec formules, note d'alerte, portee dossier/cabinet (RG-007).
 */
@Component({
  selector: 'app-gabarit-builder',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gabarit-builder.html',
  styleUrl: './gabarit-builder.scss',
})
export class GabaritBuilder {
  @Input({ required: true }) clientId!: number;
  @Output() enregistre = new EventEmitter<Gabarit>();
  @Output() annuler = new EventEmitter<void>();

  private store = inject(GabaritStore);

  readonly icones = ['📄', '🏢', '💶', '🚗', '🧾', '📊', '🔧', '📅', '🏦', '⚖️'];
  readonly typesChamp: { value: ChampType; label: string }[] = [
    { value: 'montant', label: 'Montant' },
    { value: 'taux', label: 'Taux (%)' },
    { value: 'nombre', label: 'Nombre' },
  ];

  nom = '';
  icone = '📄';
  champs: ChampDef[] = [{ id: 'montant', label: 'Montant', type: 'montant', defaut: 0 }];
  lignes: { compte: string; libelle: string; sens: Sens; formule: string }[] = [
    { compte: '', libelle: '', sens: 'D', formule: 'montant' },
    { compte: '', libelle: '', sens: 'C', formule: 'montant' },
  ];
  alerteMessage = '';
  alerteCondition = '';
  portee: 'CABINET' | 'DOSSIER' = 'DOSSIER';

  // === Champs variables ===
  addChamp(): void {
    this.champs.push({ id: `champ${this.champs.length + 1}`, label: '', type: 'montant', defaut: 0 });
  }
  removeChamp(i: number): void {
    if (this.champs.length > 1) this.champs.splice(i, 1);
  }

  // === Lignes ===
  addLigne(): void {
    this.lignes.push({ compte: '', libelle: '', sens: 'D', formule: '' });
  }
  removeLigne(i: number): void {
    if (this.lignes.length > 1) this.lignes.splice(i, 1);
  }

  /** Variables disponibles dans les formules (aide). */
  variablesDisponibles(): string {
    return this.champs.map((c) => c.id).filter(Boolean).join(', ') + ', round()';
  }

  canSave(): boolean {
    if (!this.nom.trim()) return false;
    return this.lignes.some((l) => l.compte.trim() && l.formule.trim());
  }

  save(): void {
    if (!this.canSave()) return;
    const lignes: LigneDef[] = this.lignes
      .filter((l) => l.compte.trim() && l.formule.trim())
      .map((l) => ({ compte: l.compte.trim(), libelle: l.libelle.trim() || l.compte.trim(), sens: l.sens, formule: l.formule.trim() }));

    const gabarit: Gabarit = {
      id: this.store.nextId(),
      nom: this.nom.trim(),
      icone: this.icone,
      scope: this.portee === 'CABINET' ? 'CABINET' : this.clientId,
      resume: lignes.map((l) => l.compte).join(' · '),
      champs: this.champs
        .filter((c) => c.id.trim())
        .map((c) => ({ id: c.id.trim(), label: c.label.trim() || c.id.trim(), type: c.type, defaut: Number(c.defaut) || 0 })),
      lignes,
      alertes: this.alerteMessage.trim()
        ? [{ message: this.alerteMessage.trim(), condition: this.alerteCondition.trim() || undefined }]
        : [],
    };
    this.store.save(gabarit);
    this.enregistre.emit(gabarit);
  }
}
