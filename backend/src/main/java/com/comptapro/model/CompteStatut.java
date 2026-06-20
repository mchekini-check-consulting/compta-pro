package com.comptapro.model;

/**
 * Statut d'un compte du plan comptable au regard de la reforme ANC 2022-06.
 * Derive a l'import a partir de la colonne Observation (cf. AC-09 / AC-10).
 */
public enum CompteStatut {
    ACTIF,
    SUPPRIME
}
