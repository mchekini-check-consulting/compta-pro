import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RegisterAccountantRequest {
  cabinetName: string;
  address: string;
  siren: string;
  registrationNumber: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface RegisterAccountantResponse {
  success: boolean;
  message: string;
  accountantId?: number;
}

export interface CheckEmailResponse {
  exists: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';

  constructor(private http: HttpClient) {}

  register(request: RegisterAccountantRequest): Observable<RegisterAccountantResponse> {
    return this.http.post<RegisterAccountantResponse>(`${this.apiUrl}/register`, request);
  }

  checkEmailExists(email: string): Observable<CheckEmailResponse> {
    return this.http.get<CheckEmailResponse>(`${this.apiUrl}/check-email`, {
      params: { email }
    });
  }

  verifyEmail(token: string): Observable<{ success: boolean; message: string }> {
    return this.http.get<{ success: boolean; message: string }>(`${this.apiUrl}/verify`, {
      params: { token }
    });
  }
}
