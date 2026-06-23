import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from './auth';

/** Anomalie remontee par le controle de conformite FEC. */
export interface FecAnomalie {
  code: string;
  message: string;
  ligne: number | null;
  ecritureId: number | null;
  numeroEcriture: string | null;
}

/** Exercice selectionnable pour l'export FEC (AC-01). */
export interface FecExercice {
  annee: number;
  debut: string;
  cloture: string;
  nbEcritures: number;
  nbLignes: number;
  equilibre: boolean;
}

/** Synthese d'un journal mouvemente (FEC-001, AC-04). */
export interface FecJournalSynthese {
  code: string;
  libelle: string;
  nbLignes: number;
  totalDebit: number;
  totalCredit: number;
  equilibre: boolean;
}

/** Synthese de collecte d'un exercice avant generation (FEC-001). */
export interface FecSynthese {
  annee: number;
  debut: string;
  cloture: string;
  totalLignes: number;
  nbJournaux: number;
  nbComptesDistincts: number;
  totalDebit: number;
  totalCredit: number;
  ecart: number;
  equilibre: boolean;
  anPresent: boolean;
  nbComptesHorsPcg: number;
  journaux: FecJournalSynthese[];
  entetes: string[];
  apercu: string[][];
}

/** Resultat d'un controle du catalogue (AC-02). */
export interface FecControleResultat {
  code: string;
  type: 'BLOQUANT' | 'AVERTISSEMENT' | 'COHERENCE';
  description: string;
  ok: boolean;
  anomalies: FecAnomalie[];
}

/** Rapport du controle qualite des 21 regles DGFiP (FEC-002). */
export interface FecControleRapport {
  nbControles: number;
  nbControlesPasses: number;
  nbBloquants: number;
  nbAvertissements: number;
  nbCoherencePasses: number;
  exportPossible: boolean;
  bloquants: FecAnomalie[];
  avertissements: FecAnomalie[];
  coherence: FecAnomalie[];
  controles: FecControleResultat[];
}

export type StatutExportFec = 'SUCCES' | 'PARTIEL' | 'ECHEC';

/** Resume d'un export FEC dans l'historique du dossier (FEC-004). */
export interface FecExportResume {
  id: number;
  date: string;
  utilisateur: string;
  exerciceDebut: string | null;
  exerciceFin: string | null;
  annee: number | null;
  nbLignes: number;
  nbBloquants: number;
  nbAvertissements: number;
  sigmaDebit: number | null;
  sigmaCredit: number | null;
  statut: StatutExportFec;
  hashSha256: string | null;
  valideCtrlDgfip: boolean;
  dateValidationCtrl: string | null;
  avertissements: string[];
  filename: string;
}

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

  /** Exercices selectionnables du dossier (AC-01). */
  exercices(clientId: number): Observable<FecExercice[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<FecExercice[]>(`${this.apiUrl}/exercices`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /** Synthese de collecte d'un exercice (FEC-001). */
  synthese(clientId: number, annee?: number): Observable<FecSynthese> {
    let params = new HttpParams().set('clientId', clientId);
    if (annee != null) params = params.set('annee', annee);
    return this.http.get<FecSynthese>(`${this.apiUrl}/synthese`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /** Lance le controle de conformite sans generer le fichier. */
  controle(clientId: number, annee?: number): Observable<FecControleRapport> {
    let params = new HttpParams().set('clientId', clientId);
    if (annee != null) params = params.set('annee', annee);
    return this.http.get<FecControleRapport>(`${this.apiUrl}/controle`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /** Recupere le FEC en tant que fichier (Blob) avec sa reponse complete. */
  downloadFec(clientId: number, annee?: number): Observable<HttpResponse<Blob>> {
    let params = new HttpParams().set('clientId', clientId);
    if (annee != null) params = params.set('annee', annee);
    return this.http.get(this.apiUrl, {
      headers: this.getHeaders(),
      params,
      responseType: 'blob',
      observe: 'response',
    });
  }

  /** Historique des exports du dossier (AC-14). */
  historique(clientId: number): Observable<FecExportResume[]> {
    const params = new HttpParams().set('clientId', clientId);
    return this.http.get<FecExportResume[]>(`${this.apiUrl}/historique`, {
      headers: this.getHeaders(),
      params,
    });
  }

  /** Re-telechargement d'un export archive a l'identique (AC-05). */
  downloadArchive(exportId: number): Observable<HttpResponse<Blob>> {
    return this.http.get(`${this.apiUrl}/historique/${exportId}`, {
      headers: this.getHeaders(),
      responseType: 'blob',
      observe: 'response',
    });
  }

  /** Marque un export comme valide avec l'outil CTRL-DGFIP (AC-09). */
  validerCtrl(exportId: number): Observable<FecExportResume> {
    return this.http.post<FecExportResume>(
      `${this.apiUrl}/historique/${exportId}/valider-ctrl`,
      null,
      { headers: this.getHeaders() },
    );
  }
}
