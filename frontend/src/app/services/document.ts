import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

export type DocumentType = 'CNI' | 'KBIS' | 'STATUTS';

export interface DocumentUploadResponse {
  id: number;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
}

export interface DocumentInfo {
  id: number;
  type: DocumentType;
  fileName: string;
  fileSize: number;
  contentType: string;
  status: 'PENDING_VERIFICATION' | 'VERIFIED' | 'REJECTED';
  rejectionReason?: string;
  uploadedAt: string;
  verifiedAt?: string;
}

@Injectable({
  providedIn: 'root',
})
export class DocumentService {
  private apiUrl = 'http://localhost:8080/api/documents';

  constructor(private http: HttpClient, private authService: AuthService) {}

  uploadDocument(file: File, documentType: DocumentType): Observable<DocumentUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('documentType', documentType);

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    return this.http.post<DocumentUploadResponse>(`${this.apiUrl}/upload`, formData, { headers });
  }

  getMyDocuments(): Observable<DocumentInfo[]> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    return this.http.get<DocumentInfo[]>(`${this.apiUrl}/my-documents`, { headers });
  }

  submitDossier(): Observable<{ success: boolean; message: string }> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
    });

    return this.http.post<{ success: boolean; message: string }>(`${this.apiUrl}/submit`, {}, { headers });
  }
}
