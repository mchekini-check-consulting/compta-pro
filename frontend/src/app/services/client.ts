import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type RegimeFiscal = 'IR' | 'IS';
export type RegimeTVA = 'MENSUELLE' | 'TRIMESTRIELLE' | 'ANNUELLE';

export interface Client {
  id: number;
  raisonSociale: string;
  siren: string;
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
  regimeFiscal: RegimeFiscal;
  regimeTVA: RegimeTVA;
  dateDebutExercice: string;
  dateFinExercice: string;
}

export interface UpdateClientRequest {
  raisonSociale: string;
  siren: string;
  regimeFiscal: RegimeFiscal;
  regimeTVA: RegimeTVA;
  dateDebutExercice: string;
  dateFinExercice: string;
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
