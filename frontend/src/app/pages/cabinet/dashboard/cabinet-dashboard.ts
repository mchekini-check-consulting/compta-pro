import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Tache, TacheStatut, TasksStore } from '../../../services/tasks.store';

type Periode = 'tout' | 'semaine' | 'mois';
type Filtre = 'tout' | 'a-faire' | 'en-cours' | 'retard';

interface CollaborateurStat {
  nom: string;
  aFaire: number;
  enCours: number;
  enRetard: number;
  total: number;
}

/** Date locale d'une Date au format ISO yyyy-mm-dd (coherent avec le seed du store). */
function isoLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Tableau de bord manager : pilotage des taches du cabinet (compteurs globaux,
 * repartition par collaborateur, echeances a venir), avec filtre de periode et
 * rafraichissement automatique. Donnees issues du TasksStore (tous collaborateurs
 * confondus : l'utilisateur connecte est traite comme manager, RG-001).
 */
@Component({
  selector: 'app-cabinet-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './cabinet-dashboard.html',
  styleUrl: './cabinet-dashboard.scss',
})
export class CabinetDashboard implements OnInit, OnDestroy {
  private store = inject(TasksStore);

  /** Horodatage de reference, rafraichi toutes les 5 min (RG-003). */
  readonly nowMs = signal(Date.now());
  readonly periode = signal<Periode>('mois');
  readonly filtre = signal<Filtre>('tout');

  private timer?: ReturnType<typeof setInterval>;

  private readonly todayIso = computed(() => isoLocal(new Date(this.nowMs())));

  /** Bornes [debut, fin] de la periode selectionnee (AC-04). */
  private readonly bornes = computed<{ debut?: string; fin?: string }>(() => {
    const d = new Date(this.nowMs());
    if (this.periode() === 'mois') {
      const debut = new Date(d.getFullYear(), d.getMonth(), 1);
      const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0);
      return { debut: isoLocal(debut), fin: isoLocal(fin) };
    }
    if (this.periode() === 'semaine') {
      const lundiOffset = (d.getDay() + 6) % 7; // 0 = lundi
      const lundi = new Date(d);
      lundi.setDate(d.getDate() - lundiOffset);
      const dimanche = new Date(lundi);
      dimanche.setDate(lundi.getDate() + 6);
      return { debut: isoLocal(lundi), fin: isoLocal(dimanche) };
    }
    return {};
  });

  /** Taches dans la periode (par echeance). Base de tous les calculs (AC-04). */
  readonly tachesPeriode = computed(() => {
    const { debut, fin } = this.bornes();
    return this.store.taches().filter((t) => {
      if (debut && t.echeance < debut) return false;
      if (fin && t.echeance > fin) return false;
      return true;
    });
  });

  // === Compteurs (AC-01) ===
  readonly total = computed(() => this.tachesPeriode().length);
  readonly aFaire = computed(() => this.tachesPeriode().filter((t) => t.statut === 'A_FAIRE').length);
  readonly enCours = computed(() => this.tachesPeriode().filter((t) => t.statut === 'EN_COURS').length);
  readonly enRetard = computed(
    () => this.tachesPeriode().filter((t) => this.store.isEnRetard(t, this.todayIso())).length
  );

  /** Liste filtree par le compteur actif (tri echeance croissante). */
  readonly tachesFiltrees = computed(() => {
    const f = this.filtre();
    const today = this.todayIso();
    let list = this.tachesPeriode();
    if (f === 'a-faire') list = list.filter((t) => t.statut === 'A_FAIRE');
    else if (f === 'en-cours') list = list.filter((t) => t.statut === 'EN_COURS');
    else if (f === 'retard') list = list.filter((t) => this.store.isEnRetard(t, today));
    return [...list].sort((a, b) => a.echeance.localeCompare(b.echeance));
  });

  // === Par collaborateur (AC-02), trie par en retard decroissant ===
  readonly parCollaborateur = computed<CollaborateurStat[]>(() => {
    const today = this.todayIso();
    const map = new Map<string, CollaborateurStat>();
    for (const t of this.tachesPeriode()) {
      let s = map.get(t.collaborateur);
      if (!s) {
        s = { nom: t.collaborateur, aFaire: 0, enCours: 0, enRetard: 0, total: 0 };
        map.set(t.collaborateur, s);
      }
      s.total++;
      if (t.statut === 'A_FAIRE') s.aFaire++;
      if (t.statut === 'EN_COURS') s.enCours++;
      if (this.store.isEnRetard(t, today)) s.enRetard++;
    }
    return [...map.values()].sort((a, b) => b.enRetard - a.enRetard || a.nom.localeCompare(b.nom));
  });

  // === Echeances a venir 7 jours (AC-03), tri date croissante ===
  readonly echeances7j = computed(() => {
    const today = this.todayIso();
    const limite = new Date(this.nowMs());
    limite.setDate(limite.getDate() + 7);
    const limiteIso = isoLocal(limite);
    return this.store
      .taches()
      .filter((t) => t.statut !== 'FAIT' && t.echeance >= today && t.echeance <= limiteIso)
      .sort((a, b) => a.echeance.localeCompare(b.echeance));
  });

  ngOnInit(): void {
    this.store.loadFromBackend();
    // RG-003 : rafraichissement automatique toutes les 5 minutes.
    this.timer = setInterval(() => {
      this.nowMs.set(Date.now());
      this.store.loadFromBackend(true);
    }, 5 * 60 * 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  // === Interactions ===
  setPeriode(p: Periode): void {
    this.periode.set(p);
  }

  /** Clic sur un compteur : (dé)active le filtre correspondant (AC-01). */
  setFiltre(f: Filtre): void {
    this.filtre.set(this.filtre() === f ? 'tout' : f);
  }

  estEnRetard(t: Tache): boolean {
    return this.store.isEnRetard(t, this.todayIso());
  }

  statutLabel(s: TacheStatut): string {
    return { A_FAIRE: 'A faire', EN_COURS: 'En cours', FAIT: 'Fait' }[s];
  }

  formatDate(iso: string): string {
    return iso ? new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR') : '';
  }
}
