import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type CompteStatut = 'ACTIF' | 'SUPPRIME';

export interface CompteComptable {
  numeroCompte: string;
  intitule: string;
  classe: number;
  niveau: number;
  observation?: string;
  statut: CompteStatut;
}

@Injectable({ providedIn: 'root' })
export class PlanComptableService {
  private apiUrl = 'http://localhost:8080/api/plan-comptable';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json',
    });
  }

  /** Recupere l'ensemble du Plan Comptable General (referentiel ~351 comptes). */
  getComptes(): Observable<CompteComptable[]> {
    return this.http.get<CompteComptable[]>(this.apiUrl, { headers: this.getHeaders() });
  }
}
