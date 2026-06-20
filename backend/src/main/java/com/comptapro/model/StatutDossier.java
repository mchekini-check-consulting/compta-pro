package com.comptapro.model;

/**
 * Statut d'un dossier client (AC-06/07).
 * <ul>
 *   <li>ACTIF — dossier en cours de suivi (badge vert) ;</li>
 *   <li>EN_COURS — dossier en cours d'ouverture/traitement (badge orange) ;</li>
 *   <li>CLOTURE — dossier cloture (badge gris).</li>
 * </ul>
 */
public enum StatutDossier {
    ACTIF,
    EN_COURS,
    CLOTURE
}
