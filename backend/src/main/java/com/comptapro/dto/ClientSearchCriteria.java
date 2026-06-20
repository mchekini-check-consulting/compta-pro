package com.comptapro.dto;

import com.comptapro.model.FormeJuridique;
import com.comptapro.model.StatutDossier;
import lombok.Data;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;
import java.util.List;

/**
 * Criteres de recherche multi-critere des dossiers (tous optionnels et
 * cumulables). Lie depuis les query params de GET /api/clients/search.
 */
@Data
public class ClientSearchCriteria {

    /** Raison sociale (recherche partielle insensible a la casse). */
    private String raisonSociale;

    /** SIREN (recherche partielle par prefixe). */
    private String siren;

    /** Forme juridique exacte. */
    private FormeJuridique formeJuridique;

    /** Statuts retenus (multi-selection : statuts=ACTIF&statuts=EN_COURS). */
    private List<StatutDossier> statuts;

    /** Borne inferieure de la date d'immatriculation (incluse). */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateDebut;

    /** Borne superieure de la date d'immatriculation (incluse). */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate dateFin;
}
