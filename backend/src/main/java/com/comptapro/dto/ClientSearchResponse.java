package com.comptapro.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Resultat d'une recherche de dossiers : la liste filtree, le nombre de
 * resultats correspondants et le nombre total de dossiers du cabinet
 * (pour le compteur « X dossiers sur Y », AC-14 / RG-008).
 */
@Data
@Builder
public class ClientSearchResponse {

    /** Nombre de dossiers correspondant aux criteres. */
    private long count;

    /** Nombre total de dossiers du cabinet (sans filtre). */
    private long total;

    /** Dossiers filtres, tries par raison sociale (AC-02 / RG-011). */
    private List<ClientResponse> clients;
}
