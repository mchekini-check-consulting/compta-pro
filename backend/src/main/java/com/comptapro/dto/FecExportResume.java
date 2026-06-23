package com.comptapro.dto;

import com.comptapro.model.FecExport;
import com.comptapro.model.StatutExportFec;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Resume d'un export FEC pour l'historique du dossier (FEC-004), sans le contenu
 * du fichier mais avec ses metadonnees de tracabilite.
 */
public record FecExportResume(
        Long id,
        LocalDateTime date,
        String utilisateur,
        LocalDate exerciceDebut,
        LocalDate exerciceFin,
        Integer annee,
        int nbLignes,
        int nbBloquants,
        int nbAvertissements,
        BigDecimal sigmaDebit,
        BigDecimal sigmaCredit,
        StatutExportFec statut,
        String hashSha256,
        boolean valideCtrlDgfip,
        LocalDateTime dateValidationCtrl,
        List<String> avertissements,
        String filename) {

    public static FecExportResume from(FecExport e) {
        Integer annee = e.getExerciceFin() != null ? e.getExerciceFin().getYear() : null;
        List<String> avertissements = (e.getAvertissementsTexte() == null
                || e.getAvertissementsTexte().isBlank())
                ? List.of()
                : List.of(e.getAvertissementsTexte().split("\n"));
        return new FecExportResume(e.getId(), e.getCreatedAt(), e.getUtilisateur(),
                e.getExerciceDebut(), e.getExerciceFin(), annee, e.getNbLignes(),
                e.getNbBloquants(), e.getNbAvertissements(), e.getSigmaDebit(), e.getSigmaCredit(),
                e.getStatut(), e.getHashSha256(), e.isValideCtrlDgfip(), e.getDateValidationCtrl(),
                avertissements, e.getFilename());
    }
}
