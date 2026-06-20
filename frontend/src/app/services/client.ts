import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type RegimeFiscal = 'IR' | 'IS';
export type RegimeTVA = 'MENSUELLE' | 'TRIMESTRIELLE' | 'ANNUELLE';
export type FormeJuridique = 'SARL' | 'SAS' | 'SASU' | 'EURL' | 'EI' | 'SA' | 'SCI' | 'AUTRE';
export type StatutDossier = 'ACTIF' | 'EN_COURS' | 'CLOTURE';

export interface Client {
  id: number;
  raisonSociale: string;
  siren: string;
  formeJuridique: FormeJuridique;
  statut: StatutDossier;
  dateImmatriculation: string;
  regimeFiscal: RegimeFiscal;
  regimeTVA: RegimeTVA;
  dateDebutExercice: string;
  dateFinExercice: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateClientRequest {
  raisonSociale: string;
  siren: string;
  formeJuridique: FormeJuridique;
  statut: StatutDossier;
  dateImmatriculation: string;
  regimeFiscal: RegimeFiscal;
  regimeTVA: RegimeTVA;
  dateDebutExercice: string;
  dateFinExercice: string;
}

export interface UpdateClientRequest {
  raisonSociale: string;
  siren: string;
  formeJuridique: FormeJuridique;
  statut: StatutDossier;
  dateImmatriculation: string;
  regimeFiscal: RegimeFiscal;
  regimeTVA: RegimeTVA;
  dateDebutExercice: string;
  dateFinExercice: string;
}

export interface ClientSearchCriteria {
  raisonSociale?: string;
  siren?: string;
  formeJuridique?: FormeJuridique | '';
  statuts?: StatutDossier[];
  dateDebut?: string;
  dateFin?: string;
}

export interface ClientSearchResponse {
  count: number;
  total: number;
  clients: Client[];
}

@Injectable({
  providedIn: 'root',
})
export class ClientService {
  private apiUrl = 'http://localhost:8080/api/clients';

  constructor(private http: HttpClient, private authService: AuthService) {}

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }

  getClients(): Observable<Client[]> {
    return this.http.get<Client[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  searchClients(criteria: ClientSearchCriteria): Observable<ClientSearchResponse> {
    let params = new HttpParams();
    if (criteria.raisonSociale?.trim()) {
      params = params.set('raisonSociale', criteria.raisonSociale.trim());
    }
    if (criteria.siren?.trim()) {
      params = params.set('siren', criteria.siren.trim());
    }
    if (criteria.formeJuridique) {
      params = params.set('formeJuridique', criteria.formeJuridique);
    }
    if (criteria.statuts?.length) {
      criteria.statuts.forEach((s) => (params = params.append('statuts', s)));
    }
    if (criteria.dateDebut) {
      params = params.set('dateDebut', criteria.dateDebut);
    }
    if (criteria.dateFin) {
      params = params.set('dateFin', criteria.dateFin);
    }
    return this.http.get<ClientSearchResponse>(`${this.apiUrl}/search`, {
      headers: this.getHeaders(),
      params,
    });
  }

  getClient(id: number): Observable<Client> {
    return this.http.get<Client>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }

  createClient(request: CreateClientRequest): Observable<Client> {
    return this.http.post<Client>(this.apiUrl, request, { headers: this.getHeaders() });
  }

  updateClient(id: number, request: UpdateClientRequest): Observable<Client> {
    return this.http.put<Client>(`${this.apiUrl}/${id}`, request, { headers: this.getHeaders() });
  }

  deleteClient(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
