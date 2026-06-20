package com.comptapro.service;

import org.springframework.stereotype.Component;

/**
 * Determine le code journal a partir du numero du premier compte saisi (RG-006/RG-007).
 * <p>
 * Table de correspondance :
 * <ul>
 *   <li>Classe 7 (Ventes) -> VE</li>
 *   <li>Classe 5 (Banque) -> BQ</li>
 *   <li>Classe 6, comptes 641 a 645 (Paie) -> PA</li>
 *   <li>Classe 6 (autres, Achats) -> AC</li>
 *   <li>Toute autre classe -> OD (operations diverses)</li>
 * </ul>
 */
@Component
public class JournalCodeResolver {

    public String resolve(String numeroCompte) {
        if (numeroCompte == null || numeroCompte.isBlank()) {
            return "OD";
        }
        char classe = numeroCompte.charAt(0);
        return switch (classe) {
            case '7' -> "VE";
            case '5' -> "BQ";
            case '6' -> isPaie(numeroCompte) ? "PA" : "AC";
            default -> "OD";
        };
    }

    /** Comptes de paie : 641 a 645 (charges de personnel). */
    private boolean isPaie(String numeroCompte) {
        if (numeroCompte.length() < 3) {
            return false;
        }
        String prefixe = numeroCompte.substring(0, 3);
        return prefixe.compareTo("641") >= 0 && prefixe.compareTo("645") <= 0;
    }
}
