package com.comptapro.dto;

import java.util.List;

/**
 * Rapport du controle de conformite execute avant l'export FEC (AC-02).
 * Distingue les anomalies bloquantes (export impossible) des avertissements
 * (export possible).
 *
 * @param nbControles        nombre total de regles evaluees (8 BLQ + 5 AVT + 8 COH)
 * @param nbControlesPasses  nombre de regles sans aucune anomalie
 * @param nbBloquants        nombre d'anomalies bloquantes detectees
 * @param nbAvertissements   nombre d'avertissements detectes
 * @param nbCoherencePasses  nombre de controles de coherence passes (sur 8)
 * @param exportPossible     {@code true} si aucune anomalie bloquante (RG-008)
 * @param bloquants          detail des anomalies bloquantes (BLQ)
 * @param avertissements     detail des avertissements (AVT)
 * @param coherence          detail des anomalies de coherence globale (COH)
 * @param controles          catalogue des 21 controles avec leur resultat (AC-02)
 */
public record FecControleRapport(
        int nbControles,
        int nbControlesPasses,
        int nbBloquants,
        int nbAvertissements,
        int nbCoherencePasses,
        boolean exportPossible,
        List<Anomalie> bloquants,
        List<Anomalie> avertissements,
        List<Anomalie> coherence,
        List<ControleResultat> controles) {

    /**
     * Resultat d'un controle du catalogue pour le rapport tabulaire (AC-02).
     *
     * @param code        identifiant du controle (ex : BLQ-001)
     * @param type        BLOQUANT, AVERTISSEMENT ou COHERENCE
     * @param description libelle de la regle controlee
     * @param ok          {@code true} si aucune anomalie pour ce controle
     * @param anomalies   anomalies detectees pour ce controle (vide si OK)
     */
    public record ControleResultat(String code, String type, String description, boolean ok,
                                   List<Anomalie> anomalies) {}

    /**
     * Anomalie detectee par un controle de conformite.
     *
     * @param code           identifiant du controle (ex : BLQ-001, AVT-002)
     * @param message        message destine a l'expert-comptable
     * @param ligne          numero de ligne FEC concernee (null si non applicable)
     * @param ecritureId     identifiant de l'ecriture pour un lien direct (null si global)
     * @param numeroEcriture numero d'operation de l'ecriture (AC-03, null si global)
     */
    public record Anomalie(String code, String message, Integer ligne, Long ecritureId,
                           String numeroEcriture) {}
}
