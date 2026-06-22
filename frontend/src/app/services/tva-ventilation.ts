/**
 * Moteur de ventilation automatique TVA (saisie assistee).
 *
 * A partir d'un type d'operation, d'un montant HT et d'un taux de TVA, genere
 * les lignes d'ecriture equilibrees (charge/produit, TVA, fournisseur/client)
 * avec les bons sens debit/credit. Fonctions pures, deterministes et testables.
 */

export type TypeOperation = 'ACHAT' | 'VENTE' | 'IMMO';

/** Taux de TVA supportes (RG-010). */
export const TAUX_TVA = [20, 10, 5.5, 2.1, 0];

export interface ComptesVentilation {
  // Achat fournisseur
  achatCharge: string; // 607
  achatTva: string; // 44566
  achatFournisseur: string; // 401
  // Vente client
  venteClient: string; // 411
  venteProduit: string; // 706
  venteTva: string; // 44571
  // Acquisition immobilisation
  immoCompte: string; // 2183
  immoTva: string; // 44562
  immoFournisseur: string; // 404
}

/** Comptes par defaut (RG-001/RG-002), surchargeables par dossier (RG-007). */
export const COMPTES_DEFAUT: ComptesVentilation = {
  achatCharge: '607',
  achatTva: '44566',
  achatFournisseur: '401',
  venteClient: '411',
  venteProduit: '706',
  venteTva: '44571',
  immoCompte: '2183',
  immoTva: '44562',
  immoFournisseur: '404',
};

// Libelles par defaut (sans caracteres speciaux : le validateur de libelle
// n'autorise que lettres/chiffres/espaces).
const LIBELLES: Record<string, string> = {
  achatCharge: 'Achats de marchandises',
  achatTva: 'TVA deductible biens services',
  achatFournisseur: 'Fournisseurs',
  venteClient: 'Clients',
  venteProduit: 'Prestations de services',
  venteTva: 'TVA collectee',
  immoCompte: 'Materiel informatique',
  immoTva: 'TVA deductible sur immobilisations',
  immoFournisseur: 'Fournisseurs d immobilisations',
};

export interface LigneGeneree {
  numeroCompte: string;
  libelle: string;
  debit: number | null;
  credit: number | null;
}

/** Arrondi bancaire a 2 decimales (RG-003). */
export function arrondi(montant: number): number {
  return Math.round(montant * 100) / 100;
}

/**
 * Genere les lignes d'une ecriture a partir du type, du montant HT et du taux.
 * TVA 0% -> aucune ligne TVA, ecriture a 2 lignes (RG-004).
 */
export function genererVentilation(
  type: TypeOperation,
  ht: number,
  taux: number,
  comptes: ComptesVentilation
): LigneGeneree[] {
  const tva = arrondi(ht * (taux / 100));
  const ttc = arrondi(ht + tva);
  const avecTva = taux > 0;

  const ligne = (cle: keyof ComptesVentilation, debit: number | null, credit: number | null): LigneGeneree => ({
    numeroCompte: comptes[cle],
    libelle: LIBELLES[cle],
    debit,
    credit,
  });

  switch (type) {
    case 'ACHAT': {
      const lignes = [ligne('achatCharge', ht, null)];
      if (avecTva) lignes.push(ligne('achatTva', tva, null));
      lignes.push(ligne('achatFournisseur', null, ttc));
      return lignes;
    }
    case 'VENTE': {
      const lignes = [ligne('venteClient', ttc, null), ligne('venteProduit', null, ht)];
      if (avecTva) lignes.push(ligne('venteTva', null, tva));
      return lignes;
    }
    case 'IMMO': {
      const lignes = [ligne('immoCompte', ht, null)];
      if (avecTva) lignes.push(ligne('immoTva', tva, null));
      lignes.push(ligne('immoFournisseur', null, ttc));
      return lignes;
    }
  }
}

/** Comptes utilises par un type d'operation (pour la mini-UI de configuration). */
export function clesPourType(type: TypeOperation): (keyof ComptesVentilation)[] {
  switch (type) {
    case 'ACHAT':
      return ['achatCharge', 'achatTva', 'achatFournisseur'];
    case 'VENTE':
      return ['venteClient', 'venteProduit', 'venteTva'];
    case 'IMMO':
      return ['immoCompte', 'immoTva', 'immoFournisseur'];
  }
}

/** Libelle convivial d'une cle de compte (pour la mini-UI). */
export function libelleCle(cle: keyof ComptesVentilation): string {
  return LIBELLES[cle];
}
