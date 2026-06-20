package com.comptapro.model;

/**
 * Statut d'une ecriture comptable.
 * <p>
 * Une ecriture saisie est d'abord enregistree en {@link #BROUILLON} (RG-015),
 * validable ulterieurement ({@link #VALIDEE}).
 */
public enum EcritureStatut {
    BROUILLON,
    VALIDEE
}
