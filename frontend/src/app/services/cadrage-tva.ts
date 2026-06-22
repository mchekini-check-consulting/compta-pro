/**
 * Cadrage TVA / CA3 (regime reel normal) — fonctions pures.
 *
 * Calcule la TVA nette d'une periode a partir des ecritures (TVA collectee =
 * credits 44571, TVA deductible = debits 44566 + 44562), decompose par taux,
 * controle la coherence, detecte les anomalies d'imputation et propose les
 * lignes de l'ecriture de cloture. Aucune evolution backend : tout part de
 * JournalService.getEcritures.
 */
import { EcritureResponse, LigneEcritureRequest, LigneEcritureResponse } from './journal';
import { arrondi } from './tva-ventilation';

const CPT_COLLECTEE = '44571';
const CPT_DED_BIENS = '44566';
const CPT_DED_IMMO = '44562';
const CPT_DECAISSER = '44551';
const CPT_CREDIT = '44567';

export interface TauxLigne {
  taux: number;
  baseHT: number;
  montantTva: number;
}

export interface CadrageAnomalie {
  numeroOperation: string;
  message: string;
}

export interface CadrageTva {
  collectee: number;
  collecteeParTaux: TauxLigne[];
  deductible: number;
  deductibleParTaux: TauxLigne[];
  deductibleImmo: number;
  nette: number;
  statut: 'DECAISSER' | 'CREDIT';
  compteDestination: typeof CPT_DECAISSER | typeof CPT_CREDIT;
  coherenceOk: boolean;
  ecartCoherence: number;
  anomalies: CadrageAnomalie[];
  clotureExistante?: string;
}

const estCompteTva = (c: string) => c.startsWith('445');
const montant = (v: number | null) => v ?? 0;

/** Cumule {baseHT, montantTva} par taux dans une map. */
function ajouterTaux(map: Map<number, TauxLigne>, taux: number, base: number, tva: number): void {
  const cur = map.get(taux) ?? { taux, baseHT: 0, montantTva: 0 };
  cur.baseHT = arrondi(cur.baseHT + base);
  cur.montantTva = arrondi(cur.montantTva + tva);
  map.set(taux, cur);
}

/** Calcule le cadrage TVA d'une periode [debutIso, finIso] (bornes incluses). */
export function calculerCadrage(
  ecritures: EcritureResponse[],
  debutIso: string,
  finIso: string
): CadrageTva {
  const periode = ecritures.filter((e) => e.date >= debutIso && e.date <= finIso);

  let collectee = 0;
  let deductible = 0;
  let deductibleImmo = 0;
  let debits44571 = 0; // pour le controle de coherence
  const mapCollectee = new Map<number, TauxLigne>();
  const mapDeductible = new Map<number, TauxLigne>();
  const anomalies: CadrageAnomalie[] = [];
  let clotureExistante: string | undefined;

  for (const e of periode) {
    const lignes = e.lignes;

    // Cloture deja existante : ligne sur 44551 ou 44567 (AC-08 / RG-008).
    const estCloture = lignes.some((l) => l.numeroCompte === CPT_DECAISSER || l.numeroCompte === CPT_CREDIT);
    if (estCloture) clotureExistante = e.numeroOperation;

    // Bases hors comptes de TVA, par sens (pour deduire le taux).
    const baseCredit = arrondi(
      lignes.filter((l) => !estCompteTva(l.numeroCompte)).reduce((s, l) => s + montant(l.credit), 0)
    );
    const baseDebit = arrondi(
      lignes.filter((l) => !estCompteTva(l.numeroCompte)).reduce((s, l) => s + montant(l.debit), 0)
    );

    for (const l of lignes) {
      // TVA collectee (RG-001)
      if (l.numeroCompte === CPT_COLLECTEE) {
        collectee = arrondi(collectee + montant(l.credit));
        // L'extourne de cloture debite 44571 : on l'exclut du controle de coherence.
        if (!estCloture) debits44571 = arrondi(debits44571 + montant(l.debit));
        if (montant(l.credit) > 0 && baseCredit > 0) {
          const taux = Math.round((montant(l.credit) / baseCredit) * 100);
          ajouterTaux(mapCollectee, taux, baseCredit, montant(l.credit));
        }
      }
      // TVA deductible (RG-002)
      if (l.numeroCompte === CPT_DED_BIENS || l.numeroCompte === CPT_DED_IMMO) {
        deductible = arrondi(deductible + montant(l.debit));
        if (l.numeroCompte === CPT_DED_IMMO) deductibleImmo = arrondi(deductibleImmo + montant(l.debit));
        if (montant(l.debit) > 0 && baseDebit > 0) {
          const taux = Math.round((montant(l.debit) / baseDebit) * 100);
          ajouterTaux(mapDeductible, taux, baseDebit, montant(l.debit));
        }
        // Anomalie (AC-11) : TVA immo passee sur 44566 (base = compte de classe 2).
        if (l.numeroCompte === CPT_DED_BIENS && contientImmobilisation(lignes)) {
          anomalies.push({
            numeroOperation: e.numeroOperation,
            message: "TVA d'immobilisation détectée sur 44566 — vérifier l'imputation",
          });
        }
      }
    }
  }

  const nette = arrondi(collectee - deductible);
  const statut = nette >= 0 ? 'DECAISSER' : 'CREDIT';

  return {
    collectee,
    collecteeParTaux: trier(mapCollectee),
    deductible,
    deductibleParTaux: trier(mapDeductible),
    deductibleImmo,
    nette,
    statut,
    compteDestination: statut === 'DECAISSER' ? CPT_DECAISSER : CPT_CREDIT,
    coherenceOk: debits44571 === 0,
    ecartCoherence: debits44571,
    anomalies,
    clotureExistante,
  };
}

function contientImmobilisation(lignes: LigneEcritureResponse[]): boolean {
  return lignes.some((l) => l.numeroCompte.startsWith('2') && montant(l.debit) > 0);
}

function trier(map: Map<number, TauxLigne>): TauxLigne[] {
  return [...map.values()].sort((a, b) => b.taux - a.taux);
}

/** Lignes de l'ecriture de cloture TVA (AC-07). */
export function genererLignesCloture(c: CadrageTva): LigneEcritureRequest[] {
  const lignes: LigneEcritureRequest[] = [
    { numeroCompte: CPT_COLLECTEE, libelle: 'TVA collectée — extourne', debit: c.collectee, credit: null },
  ];
  const dedBiens = arrondi(c.deductible - c.deductibleImmo);
  if (dedBiens > 0) {
    lignes.push({ numeroCompte: CPT_DED_BIENS, libelle: 'TVA déductible — extourne', debit: null, credit: dedBiens });
  }
  if (c.deductibleImmo > 0) {
    lignes.push({ numeroCompte: CPT_DED_IMMO, libelle: 'TVA déductible immobilisations — extourne', debit: null, credit: c.deductibleImmo });
  }
  if (c.statut === 'DECAISSER') {
    lignes.push({ numeroCompte: CPT_DECAISSER, libelle: 'TVA à décaisser', debit: null, credit: c.nette });
  } else {
    lignes.push({ numeroCompte: CPT_CREDIT, libelle: 'Crédit de TVA à reporter', debit: Math.abs(c.nette), credit: null });
  }
  return lignes;
}
