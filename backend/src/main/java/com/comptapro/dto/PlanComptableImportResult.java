package com.comptapro.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Synthese d'un import du plan comptable : nombre de lignes lues, importees,
 * rejetees, et detail des erreurs par ligne (journalisees, cf. AC-03).
 */
@Data
@Builder
public class PlanComptableImportResult {

    /** Nombre de lignes de donnees lues dans le CSV (hors en-tete). */
    private int lignesLues;

    /** Nombre d'enregistrements effectivement inseres en base. */
    private int importes;

    /** Nombre de lignes rejetees (champs manquants, incoherence classe/numero...). */
    private int rejetes;

    /** Detail des rejets : une entree par ligne ecartee. */
    private List<String> erreurs;
}
