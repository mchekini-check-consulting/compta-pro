package com.comptapro.service;

import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Fournit le libelle d'un journal a partir de son code (AC, VE, BQ, PA, OD).
 * Utilise pour la colonne JournalLib du FEC et l'affichage du grand livre.
 */
@Component
public class JournalLibelleResolver {

    private static final Map<String, String> LIBELLES = Map.of(
            "AC", "Achats",
            "VE", "Ventes",
            "BQ", "Banque",
            "PA", "Paie",
            "OD", "Operations diverses"
    );

    public String libelle(String codeJournal) {
        if (codeJournal == null) {
            return "";
        }
        return LIBELLES.getOrDefault(codeJournal, codeJournal);
    }
}
