import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TacheStatut, TasksStore } from '../../../services/tasks.store';

type StatutFiltre = TacheStatut | 'ALL';

@Component({
  selector: 'app-taches',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './taches.html',
  styleUrl: './taches.scss',
})
export class Taches {
  private store = inject(TasksStore);

  readonly taches = this.store.taches;
  readonly pendingCount = this.store.pendingCount;

  /** Filtre de statut actif (chips). */
  readonly filtre = signal<StatutFiltre>('ALL');

  readonly visibleTaches = computed(() => {
    const f = this.filtre();
    const list = this.taches();
    return f === 'ALL' ? list : list.filter((t) => t.statut === f);
  });

  readonly filtres: { value: StatutFiltre; label: string }[] = [
    { value: 'ALL', label: 'Toutes' },
    { value: 'A_FAIRE', label: 'A faire' },
    { value: 'EN_COURS', label: 'En cours' },
    { value: 'FAIT', label: 'Fait' },
  ];

  setFiltre(f: StatutFiltre): void {
    this.filtre.set(f);
  }

  cycleStatut(id: number): void {
    this.store.cycleStatut(id);
  }

  marquerFait(id: number): void {
    this.store.setStatut(id, 'FAIT');
  }

  statutLabel(statut: TacheStatut): string {
    return { A_FAIRE: 'A faire', EN_COURS: 'En cours', FAIT: 'Fait' }[statut];
  }

  prioriteLabel(priorite: string): string {
    return { BASSE: 'Basse', NORMALE: 'Normale', HAUTE: 'Haute' }[priorite] ?? priorite;
  }
}
