import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Client, ClientService } from '../../../services/client';

@Component({
  selector: 'app-social',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './social.html',
  styleUrl: './social.scss',
})
export class Social implements OnInit {
  private clientService = inject(ClientService);

  readonly clients = signal<Client[]>([]);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  /** Dossiers avec au moins une mission sociale (RG-005 cote dossier). */
  readonly missions = computed(() =>
    this.clients().filter((c) => c.hasMissionSociale)
  );

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
}
