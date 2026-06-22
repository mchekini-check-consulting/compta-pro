import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export interface GrandLivreMouvement {
  date: string;
  codeJournal: string;
  numeroOperation: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
  solde: number;
}

export interface GrandLivreCompte {
  numeroCompte: string;
  libelleCompte: string;
  mouvements: GrandLivreMouvement[];
  totalDebit: number;
  totalCredit: number;
  solde: number;
}

export interface GrandLivreResponse {
  clientId: number;
  comptes: GrandLivreCompte[];
  totalDebit: number;
  totalCredit: number;
}

@Injectable({ providedIn: 'root' })
export class GrandLivreService {
  private apiUrl = 'http://localhost:8080/api/grand-livre';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json',
    });
  }

  getGrandLivre(clientId: number): Observable<GrandLivreResponse> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<GrandLivreResponse>(this.apiUrl, { headers: this.getHeaders(), params });
  }
}
