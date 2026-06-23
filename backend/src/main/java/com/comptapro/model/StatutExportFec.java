package com.comptapro.model;

/**
 * Statut d'un export FEC trace (FEC-004, AC-04/AC-11).
 * <ul>
 *   <li>{@link #SUCCES} : fichier genere sur un exercice cloture ;</li>
 *   <li>{@link #PARTIEL} : exercice non cloture, export autorise mais incomplet (AC-10) ;</li>
 *   <li>{@link #ECHEC} : erreur technique, aucun fichier produit (AC-11, RG-007).</li>
 * </ul>
 */
public enum StatutExportFec {
    SUCCES,
    PARTIEL,
    ECHEC
}
