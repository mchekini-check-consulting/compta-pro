import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, ClientService } from '../../../services/client';
import { RevisionCycle, RevisionStore } from '../../../services/revision.store';

@Component({
  selector: 'app-revision',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './revision.html',
  styleUrl: './revision.scss',
})
export class Revision implements OnInit {
  private clientService = inject(ClientService);
  private store = inject(RevisionStore);

  readonly clients = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly selectedClient = signal<Client | null>(null);
  /** Cycles du dossier selectionne (recopies depuis le store, hors detection de changement). */
  readonly cycles = signal<RevisionCycle[]>([]);
  readonly progress = signal(0);

  ngOnInit(): void {
    this.fetchClients();
  }

  fetchClients(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.clientService.getClients().subscribe({
      next: (list) => {
        this.clients.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set(true);
        this.loading.set(false);
      },
    });
  }

  onSelect(clientId: string): void {
    const id = Number(clientId);
    const client = this.clients().find((c) => c.id === id) ?? null;
    this.selectedClient.set(client);
    this.refresh();
  }

  togglePoint(cycleId: string, pointId: string): void {
    const client = this.selectedClient();
    if (!client) return;
    this.store.togglePoint(client.id, cycleId, pointId);
    this.refresh();
  }

  cycleProgress(cycle: RevisionCycle): number {
    return this.store.progressForCycle(cycle);
  }

  private refresh(): void {
    const client = this.selectedClient();
    if (!client) {
      this.cycles.set([]);
      this.progress.set(0);
      return;
    }
    // Copie defensive : on relit le store apres chaque mutation.
    this.cycles.set(this.store.cyclesFor(client.id).map((c) => ({ ...c, points: [...c.points] })));
    this.progress.set(this.store.progressFor(client.id));
  }
}
