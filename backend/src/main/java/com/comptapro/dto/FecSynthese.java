package com.comptapro.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Synthese de collecte et de consolidation des ecritures d'un exercice avant
 * generation du FEC (FEC-001). Sert d'ecran de preparation : volumetrie par
 * journal, compteurs globaux, alertes et apercu.
 *
 * @param annee            annee de l'exercice
 * @param debut            date de debut de l'exercice
 * @param cloture          date de cloture de l'exercice
 * @param totalLignes      nombre total de lignes collectees (AC-05)
 * @param nbJournaux       nombre de journaux mouvementes (AC-05)
 * @param nbComptesDistincts nombre de comptes distincts (AC-05)
 * @param totalDebit       total Debit global
 * @param totalCredit      total Credit global
 * @param ecart            ecart global (Debit - Credit), 0 si equilibre
 * @param equilibre        {@code true} si Debit = Credit (RG-004)
 * @param anPresent        {@code true} si le journal AN contient des ecritures (AC-06)
 * @param nbComptesHorsPcg nombre de comptes hors PCG officiel (AC-08)
 * @param journaux         synthese par journal (AC-04)
 * @param entetes          18 noms de champs FEC dans l'ordre (AC-09)
 * @param apercu           10 premieres lignes au format FEC (AC-09)
 */
public record FecSynthese(
        int annee,
        LocalDate debut,
        LocalDate cloture,
        long totalLignes,
        int nbJournaux,
        long nbComptesDistincts,
        BigDecimal totalDebit,
        BigDecimal totalCredit,
        BigDecimal ecart,
        boolean equilibre,
        boolean anPresent,
        long nbComptesHorsPcg,
        List<JournalSynthese> journaux,
        List<String> entetes,
        List<List<String>> apercu) {

    /**
     * Volumetrie d'un journal mouvemente (AC-04).
     *
     * @param code        code journal (ACH, VTE, BQ, CAI, OD, AN, ...)
     * @param libelle     libelle du journal
     * @param nbLignes    nombre de lignes du journal
     * @param totalDebit  total Debit du journal
     * @param totalCredit total Credit du journal
     * @param equilibre   {@code true} si Debit = Credit sur le journal
     */
    public record JournalSynthese(String code, String libelle, long nbLignes,
                                  BigDecimal totalDebit, BigDecimal totalCredit, boolean equilibre) {}
}
