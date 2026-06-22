/**
 * Bibliotheque de gabarits d'ecritures (predefinis + personnalises).
 *
 * Un gabarit decrit les champs a saisir et genere les lignes d'ecriture
 * equilibrees + d'eventuelles alertes reglementaires (non bloquantes). Les 6
 * gabarits predefinis sont codes (regles exactes) ; les gabarits personnalises
 * utilisent un evaluateur de formules. Reutilise `arrondi` de tva-ventilation.
 */
import { arrondi } from './tva-ventilation';

export type Sens = 'D' | 'C';
export type ChampType = 'montant' | 'taux' | 'nombre' | 'choix';

export interface ChampOption {
  value: string;
  label: string;
}

export interface ChampDef {
  id: string;
  label: string;
  type: ChampType;
  options?: ChampOption[];
  defaut?: number | string;
}

export interface LigneDef {
  compte: string;
  libelle: string;
  sens: Sens;
  /** Formule (sur les ids des champs) evaluee pour obtenir le montant. */
  formule: string;
}

export interface AlerteDef {
  message: string;
  /** Condition (expression) ; vide => alerte toujours affichee. */
  condition?: string;
}

export type GabaritScope = 'PREDEFINI' | 'CABINET' | number;

export interface Gabarit {
  id: string;
  nom: string;
  icone: string;
  scope: GabaritScope;
  champs: ChampDef[];
  /** Resume des comptes impliques (affiche sur la carte). */
  resume: string;
  // Gabarit personnalise : donnees ; gabarit predefini : `generate`.
  lignes?: LigneDef[];
  alertes?: AlerteDef[];
  generate?: (v: Record<string, number | string>) => GenResult;
}

export interface LigneGeneree {
  numeroCompte: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
}

export interface GenResult {
  lignes: LigneGeneree[];
  alertes: string[];
}

/** Plafond URSSAF repas 2026 par couvert (RG-001). */
export const PLAFOND_REPAS = 20.7;

// Libelles par defaut (sans caracteres speciaux : le validateur de libelle
// n'autorise que lettres/chiffres/espaces).
const L: Record<string, string> = {
  '625': 'Deplacements missions et receptions',
  '44566': 'TVA deductible',
  '401': 'Fournisseurs',
  '421': 'Personnel remunerations dues',
  '6061': 'Carburant',
  '641': 'Remunerations du personnel',
  '645': 'Charges sociales patronales',
  '431': 'Securite sociale',
  '681': 'Dotations aux amortissements',
  '2813': 'Amortissements materiel informatique',
  '607': 'Achats de marchandises',
};

function n(v: number | string | undefined): number {
  const x = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : v ?? 0;
  return isNaN(x as number) ? 0 : (x as number);
}

function ligne(compte: string, sens: Sens, montant: number): LigneGeneree {
  return {
    numeroCompte: compte,
    libelle: L[compte] ?? compte,
    debit: sens === 'D' ? montant : null,
    credit: sens === 'C' ? montant : null,
  };
}

// === 6 gabarits predefinis ===
export const GABARITS_PREDEFINIS: Gabarit[] = [
  {
    id: 'repas',
    nom: 'Repas client',
    icone: '🍽️',
    scope: 'PREDEFINI',
    resume: '625 · 44566 · 401',
    champs: [
      { id: 'ttc', label: 'Montant TTC (€)', type: 'montant' },
      { id: 'taux', label: 'Taux TVA', type: 'taux', defaut: 10 },
      { id: 'nbCouverts', label: 'Nombre de couverts', type: 'nombre', defaut: 1 },
    ],
    generate: (v) => {
      const ttc = n(v['ttc']);
      const taux = n(v['taux']);
      const nbCouverts = Math.max(1, n(v['nbCouverts']));
      const ht = arrondi(ttc / (1 + taux / 100));
      const tva = arrondi(ttc - ht);
      const lignes = [ligne('625', 'D', ht)];
      if (taux > 0) lignes.push(ligne('44566', 'D', tva));
      lignes.push(ligne('401', 'C', ttc));
      const alertes: string[] = [];
      if (ttc / nbCouverts > PLAFOND_REPAS) {
        alertes.push(`⚠ Plafond URSSAF depasse (${PLAFOND_REPAS.toFixed(2)} € par repas)`);
      }
      return { lignes, alertes };
    },
  },
  {
    id: 'note-frais',
    nom: 'Note de frais',
    icone: '🧾',
    scope: 'PREDEFINI',
    resume: '625 · 421 (aucune TVA)',
    champs: [{ id: 'montant', label: 'Montant rembourse net (€)', type: 'montant' }],
    generate: (v) => {
      const m = arrondi(n(v['montant']));
      return { lignes: [ligne('625', 'D', m), ligne('421', 'C', m)], alertes: [] };
    },
  },
  {
    id: 'carburant',
    nom: 'Carburant / vehicule',
    icone: '⛽',
    scope: 'PREDEFINI',
    resume: '6061 · 44566 · 401',
    champs: [
      { id: 'ttc', label: 'Montant TTC (€)', type: 'montant' },
      {
        id: 'vehicule',
        label: 'Type de vehicule',
        type: 'choix',
        defaut: 'VU',
        options: [
          { value: 'VU', label: 'VU — utilitaire (TVA 100%)' },
          { value: 'VP', label: 'VP — tourisme (TVA 0%)' },
        ],
      },
    ],
    generate: (v) => {
      const ttc = arrondi(n(v['ttc']));
      if (v['vehicule'] === 'VP') {
        // TVA non recuperable : TTC en charge (RG-003).
        return { lignes: [ligne('6061', 'D', ttc), ligne('401', 'C', ttc)], alertes: [] };
      }
      // VU : TVA 100% recuperable a 20% (RG-004).
      const ht = arrondi(ttc / 1.2);
      const tva = arrondi(ttc - ht);
      return {
        lignes: [ligne('6061', 'D', ht), ligne('44566', 'D', tva), ligne('401', 'C', ttc)],
        alertes: [],
      };
    },
  },
  {
    id: 'salaires',
    nom: 'Salaires et charges',
    icone: '👥',
    scope: 'PREDEFINI',
    resume: '641 · 645 · 421 · 431',
    champs: [{ id: 'brut', label: 'Salaire brut (€)', type: 'montant' }],
    generate: (v) => {
      const brut = arrondi(n(v['brut']));
      const patronales = arrondi(brut * 0.45);
      const net = arrondi(brut * 0.78);
      const totalDebit = arrondi(brut + patronales);
      const secu = arrondi(totalDebit - net); // equilibrage exact
      return {
        lignes: [
          ligne('641', 'D', brut),
          ligne('645', 'D', patronales),
          ligne('421', 'C', net),
          ligne('431', 'C', secu),
        ],
        alertes: ['⚠ Montants calcules par approximation — ajuster selon le bulletin de paie reel'],
      };
    },
  },
  {
    id: 'amortissement',
    nom: 'Dotation amortissement',
    icone: '📉',
    scope: 'PREDEFINI',
    resume: '681 · 2813 (mensuel)',
    champs: [
      { id: 'valeur', label: "Valeur d'origine (€)", type: 'montant' },
      {
        id: 'duree',
        label: 'Duree (ans)',
        type: 'choix',
        defaut: '5',
        options: [
          { value: '3', label: '3 ans' },
          { value: '5', label: '5 ans' },
          { value: '10', label: '10 ans' },
          { value: '20', label: '20 ans' },
        ],
      },
    ],
    generate: (v) => {
      const valeur = n(v['valeur']);
      const duree = Math.max(1, n(v['duree']));
      const mensualite = arrondi(valeur / duree / 12);
      return { lignes: [ligne('681', 'D', mensualite), ligne('2813', 'C', mensualite)], alertes: [] };
    },
  },
  {
    id: 'avoir',
    nom: 'Avoir fournisseur',
    icone: '↩️',
    scope: 'PREDEFINI',
    resume: '401 · 44566 · 607 (miroir)',
    champs: [
      { id: 'ht', label: 'Montant avoir HT (€)', type: 'montant' },
      { id: 'taux', label: 'Taux TVA', type: 'taux', defaut: 20 },
    ],
    generate: (v) => {
      const ht = arrondi(n(v['ht']));
      const taux = n(v['taux']);
      const tva = arrondi(ht * (taux / 100));
      const ttc = arrondi(ht + tva);
      // Miroir de l'achat : sens inverses (RG-006).
      const lignes = [ligne('401', 'D', ttc)];
      if (taux > 0) lignes.push(ligne('44566', 'C', tva));
      lignes.push(ligne('607', 'C', ht));
      return {
        lignes,
        alertes: ['⚠ Faire reference au N° de facture d origine dans le libelle'],
      };
    },
  },
];

// === Evaluateur de formules (gabarits personnalises) ===
// Descente recursive : nombres, identifiants, + - * /, comparaisons, parentheses,
// unaire -, fonction round(). Aucun eval().
export function evalFormule(expr: string, vars: Record<string, number>): number {
  let i = 0;
  const s = expr;

  const skip = () => { while (i < s.length && s[i] === ' ') i++; };

  function parseExpr(): number { return parseCompare(); }

  function parseCompare(): number {
    let left = parseAdd();
    skip();
    const ops = ['>=', '<=', '==', '>', '<'];
    for (const op of ops) {
      if (s.startsWith(op, i)) {
        i += op.length;
        const right = parseAdd();
        switch (op) {
          case '>=': return left >= right ? 1 : 0;
          case '<=': return left <= right ? 1 : 0;
          case '==': return left === right ? 1 : 0;
          case '>': return left > right ? 1 : 0;
          case '<': return left < right ? 1 : 0;
        }
      }
    }
    return left;
  }

  function parseAdd(): number {
    let v = parseMul();
    skip();
    while (i < s.length && (s[i] === '+' || s[i] === '-')) {
      const op = s[i++];
      const r = parseMul();
      v = op === '+' ? v + r : v - r;
      skip();
    }
    return v;
  }

  function parseMul(): number {
    let v = parseUnary();
    skip();
    while (i < s.length && (s[i] === '*' || s[i] === '/')) {
      const op = s[i++];
      const r = parseUnary();
      v = op === '*' ? v * r : v / r;
      skip();
    }
    return v;
  }

  function parseUnary(): number {
    skip();
    if (s[i] === '-') { i++; return -parseUnary(); }
    if (s[i] === '+') { i++; return parseUnary(); }
    return parsePrimary();
  }

  function parsePrimary(): number {
    skip();
    if (s[i] === '(') {
      i++;
      const v = parseExpr();
      skip();
      if (s[i] === ')') i++;
      return v;
    }
    // nombre
    const numMatch = /^\d+(\.\d+)?/.exec(s.slice(i));
    if (numMatch) {
      i += numMatch[0].length;
      return parseFloat(numMatch[0]);
    }
    // identifiant ou fonction
    const idMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(s.slice(i));
    if (idMatch) {
      const name = idMatch[0];
      i += name.length;
      skip();
      if (s[i] === '(') {
        i++;
        const arg = parseExpr();
        skip();
        if (s[i] === ')') i++;
        if (name === 'round') return arrondi(arg);
        return arg;
      }
      return vars[name] ?? 0;
    }
    return 0;
  }

  const result = parseExpr();
  return isNaN(result) ? 0 : result;
}

/** Genere les lignes + alertes d'un gabarit (predefini ou personnalise). */
export function genererGabarit(gabarit: Gabarit, valeurs: Record<string, number | string>): GenResult {
  if (gabarit.generate) return gabarit.generate(valeurs);

  // Gabarit personnalise : evalue les formules sur les champs numeriques.
  const vars: Record<string, number> = {};
  for (const champ of gabarit.champs) {
    if (champ.type !== 'choix') vars[champ.id] = n(valeurs[champ.id] as number | string);
  }
  const lignes: LigneGeneree[] = (gabarit.lignes ?? []).map((ld) => {
    const montant = arrondi(evalFormule(ld.formule || '0', vars));
    return {
      numeroCompte: ld.compte,
      libelle: ld.libelle,
      debit: ld.sens === 'D' ? montant : null,
      credit: ld.sens === 'C' ? montant : null,
    };
  });
  const alertes: string[] = [];
  for (const a of gabarit.alertes ?? []) {
    if (!a.condition || a.condition.trim() === '' || evalFormule(a.condition, vars) !== 0) {
      alertes.push(a.message);
    }
  }
  return { lignes, alertes };
}
