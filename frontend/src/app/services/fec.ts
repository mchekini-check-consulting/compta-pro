import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

@Injectable({ providedIn: 'root' })
export class FecService {
  private apiUrl = 'http://localhost:8080/api/fec';
  private http = inject(HttpClient);
  private authService = inject(AuthService);

  private getHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
    });
  }

  /** Recupere le FEC en tant que fichier (Blob) avec sa reponse complete. */
  downloadFec(clientId: number): Observable<HttpResponse<Blob>> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get(this.apiUrl, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }
}
