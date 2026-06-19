import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

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

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  accountantId?: number;
  cabinetName?: string;
  email?: string;
  accountStatus?: 'PENDING_VERIFICATION' | 'ACTIVE' | 'SUSPENDED';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/auth';
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'auth_user';

  constructor(private http: HttpClient, private router: Router) {}

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

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, request).pipe(
      tap(response => {
        if (response.success && response.token) {
          this.setToken(response.token);
          this.setUser({
            accountantId: response.accountantId!,
            cabinetName: response.cabinetName!,
            email: response.email!,
            accountStatus: response.accountStatus!
          });
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.router.navigate(['/']);
  }

  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  getUser(): { accountantId: number; cabinetName: string; email: string; accountStatus: string } | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  setUser(user: { accountantId: number; cabinetName: string; email: string; accountStatus: string }): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  isPendingVerification(): boolean {
    const user = this.getUser();
    return user?.accountStatus === 'PENDING_VERIFICATION';
  }
}
