import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { Client } from '../../../services/client';
import { FecService } from '../../../services/fec';

/**
 * Onglet "FEC" : apercu et telechargement du Fichier des Ecritures Comptables
 * au format normalise DGFiP (18 colonnes tabulees).
 */
@Component({
  selector: 'app-fec',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './fec.html',
  styleUrl: './fec.scss',
})
export class Fec implements OnInit {
  @Input({ required: true }) client!: Client;

  private fecService = inject(FecService);

  loading = true;
  error = '';
  filename = '';
  /** Nombre de lignes de mouvement (hors en-tete). */
  nbLignes = 0;
  /** Apercu : en-tete + premieres lignes. */
  apercu: string[] = [];

  private blob?: Blob;

  ngOnInit(): void {
    this.fecService.downloadFec(this.client.id).subscribe({
      next: (res) => this.onLoaded(res),
      error: () => {
        this.error = 'Impossible de generer le FEC.';
        this.loading = false;
      },
    });
  }

  private onLoaded(res: HttpResponse<Blob>): void {
    this.blob = res.body ?? new Blob();
    this.filename = this.extractFilename(res) ?? `${this.client.siren}-FEC.txt`;
    this.blob.text().then((text) => {
      const lines = text.split('\n').filter((l) => l.length > 0);
      this.nbLignes = Math.max(0, lines.length - 1); // hors en-tete
      this.apercu = lines.slice(0, 11); // en-tete + 10 lignes
      this.loading = false;
    });
  }

  download(): void {
    if (!this.blob) return;
    const url = URL.createObjectURL(this.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = this.filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  private extractFilename(res: HttpResponse<Blob>): string | null {
    const disp = res.headers.get('Content-Disposition');
    const match = disp?.match(/filename="?([^"]+)"?/);
    return match ? match[1] : null;
  }
}
