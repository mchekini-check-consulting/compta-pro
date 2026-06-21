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

/** Supprime accents + bascule en minuscules (recherche insensible casse/accents). */
export function normalizeText(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Palette deterministe pour les avatars (fond ; texte toujours blanc). RG-002 / AC-03. */
const AVATAR_PALETTE = [
  '#0066ff', '#ea580c', '#059669', '#7c3aed', '#db2777',
  '#0891b2', '#ca8a04', '#dc2626', '#4f46e5', '#0d9488',
];

/** 1 a 2 initiales en majuscules, sans accents. */
export function initials(raisonSociale: string): string {
  const words = normalizeText(raisonSociale).split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  const letters = words.length === 1 ? words[0].slice(0, 2) : words[0][0] + words[1][0];
  return letters.toUpperCase();
}

/** Couleur de fond d'avatar, deterministe a partir du SIREN (toujours la meme). */
export function avatarColor(siren: string): string {
  let hash = 0;
  for (const ch of (siren || '')) hash = (hash + ch.charCodeAt(0)) % 100000;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}
