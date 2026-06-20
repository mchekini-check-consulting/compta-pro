/** Helpers de formatage partages par les drawers de dossier (TREZ-40/41). */

/** Tiret long affiche pour un champ vide ou non renseigne (RG-005). */
export const DASH = '—';

export function orDash(value: string | null | undefined): string {
  return value && value.trim() ? value : DASH;
}

/** Formate un SIREN au format "832 145 789" (RG-003 TREZ-40). */
export function formatSiren(siren?: string | null): string {
  if (!siren) return DASH;
  const digits = siren.replace(/\D/g, '');
  return digits.length === 9 ? `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}` : siren;
}

/** Formate une date ISO en JJ/MM/AAAA, ou "—" si absente/invalide. */
export function formatDateFr(iso?: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  return isNaN(d.getTime()) ? DASH : d.toLocaleDateString('fr-FR');
}

/** Formate une date ISO en JJ/MM (cloture d'exercice). */
export function formatJourMois(iso?: string | null): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return DASH;
  const jj = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${jj}/${mm}`;
}
