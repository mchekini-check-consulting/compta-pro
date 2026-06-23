package com.comptapro.model;

/**
 * Cycle de vie d'un devis (RG-001 de la gestion des statuts).
 * <p>
 * Brouillon → Envoye → En attente de signature → Signe / Refuse / Expire.
 */
public enum StatutDevis {
    BROUILLON,
    ENVOYE,
    EN_ATTENTE_SIGNATURE,
    SIGNE,
    REFUSE,
    EXPIRE
}
