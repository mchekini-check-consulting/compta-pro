import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type StatutDevis =
  | 'BROUILLON'
  | 'ENVOYE'
  | 'EN_ATTENTE_SIGNATURE'
  | 'SIGNE'
  | 'REFUSE'
  | 'EXPIRE';

/** Taux de TVA autorises par ligne (RG-005). */
export const TAUX_TVA: number[] = [0, 5.5, 10, 20];

export interface LigneDevisRequest {
  designation: string;
  detail?: string | null;
  quantite: number;
  prixUnitaireHT: number;
  tauxTva: number;
}

export interface CreateDevisRequest {
  clientId: number;
  clientAttention?: string | null;
  dateEmission?: string | null;
  dateDebutPrestation?: string | null;
  dateValidite?: string | null;
  acompteActif: boolean;
  acompteTaux?: number | null;
  mentionsLegales?: string | null;
  lignes: LigneDevisRequest[];
}

export interface LigneDevisResponse {
  id: number;
  designation: string;
  detail: string | null;
  quantite: number;
  prixUnitaireHT: number;
  tauxTva: number;
  totalHT: number;
}

export interface DevisResponse {
  id: number;
  clientId: number;
  numero: string;
  statut: StatutDevis;
  emetteur: {
    raisonSociale: string;
    adresse: string;
    siret: string;
    tvaIntra: string | null;
    email: string;
    telephone: string;
  };
  destinataire: {
    raisonSociale: string;
    attention: string | null;
    adresse: string | null;
    siret: string;
  };
  dateEmission: string;
  dateDebutPrestation: string | null;
  dateValidite: string;
  acompteActif: boolean;
  acompteTaux: number | null;
  acompteMontant: number;
  mentionsLegales: string;
  lignes: LigneDevisResponse[];
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
}

@Injectable({ providedIn: 'root' })
export class DevisService {
  private apiUrl = 'http://localhost:8080/api/devis';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json',
    });
  }

  /** Liste les devis d'un dossier. */
  list(clientId: number): Observable<DevisResponse[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<DevisResponse[]>(this.apiUrl, { headers: this.getHeaders(), params });
  }

  /** Apercu du prochain numero (AC-01). */
  nextNumero(): Observable<{ numeroOperation: string }> {
    return this.http.get<{ numeroOperation: string }>(`${this.apiUrl}/next-numero`, {
      headers: this.getHeaders(),
    });
  }

  /** Cree un devis (statut Brouillon). */
  create(request: CreateDevisRequest): Observable<DevisResponse> {
    return this.http.post<DevisResponse>(this.apiUrl, request, { headers: this.getHeaders() });
  }

  /** Change le statut d'un devis. */
  changerStatut(id: number, statut: StatutDevis): Observable<DevisResponse> {
    const params = new HttpParams().set('statut', statut);
    return this.http.post<DevisResponse>(`${this.apiUrl}/${id}/statut`, null, {
      headers: this.getHeaders(),
      params,
    });
  }

  /** Relance un devis expire (copie en brouillon). */
  relancer(id: number): Observable<DevisResponse> {
    return this.http.post<DevisResponse>(`${this.apiUrl}/${id}/relancer`, null, {
      headers: this.getHeaders(),
    });
  }
}
