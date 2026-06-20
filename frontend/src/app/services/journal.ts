import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type EcritureStatut = 'BROUILLON' | 'VALIDEE';

export interface LigneEcritureRequest {
  numeroCompte: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
}

export interface CreateEcritureRequest {
  clientId: number;
  date: string; // ISO yyyy-MM-dd
  lignes: LigneEcritureRequest[];
}

export interface LigneEcritureResponse {
  id: number;
  numeroCompte: string;
  libelleCompte: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
  ordre: number;
}

export interface EcritureResponse {
  id: number;
  clientId: number;
  date: string;
  codeJournal: string;
  numeroOperation: string;
  statut: EcritureStatut;
  lignes: LigneEcritureResponse[];
  totalDebit: number;
  totalCredit: number;
}

export interface NextNumeroResponse {
  codeJournal: string;
  numeroOperation: string;
}

@Injectable({ providedIn: 'root' })
export class JournalService {
  private apiUrl = 'http://localhost:8080/api/journal';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json',
    });
  }

  getEcritures(clientId: number): Observable<EcritureResponse[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<EcritureResponse[]>(this.apiUrl, { headers: this.getHeaders(), params });
  }

  /** Apercu du numero d'operation pour le premier compte saisi (RG-003/RG-006). */
  getNextNumero(clientId: number, numeroCompte: string, dateIso?: string): Observable<NextNumeroResponse> {
    let params = new HttpParams().set('clientId', clientId).set('numeroCompte', numeroCompte);
    if (dateIso) {
      params = params.set('date', dateIso);
    }
    return this.http.get<NextNumeroResponse>(`${this.apiUrl}/next-numero`, {
      headers: this.getHeaders(),
      params,
    });
  }

  createBrouillon(request: CreateEcritureRequest): Observable<EcritureResponse> {
    return this.http.post<EcritureResponse>(this.apiUrl, request, { headers: this.getHeaders() });
  }
}
