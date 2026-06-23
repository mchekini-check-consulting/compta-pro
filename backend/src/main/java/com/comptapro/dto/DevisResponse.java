package com.comptapro.dto;

import com.comptapro.model.Devis;
import com.comptapro.model.LigneDevis;
import com.comptapro.model.StatutDevis;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;

/**
 * Vue complete d'un devis avec totaux calcules (AC-07/AC-08). Les montants sont
 * arrondis a 2 decimales.
 */
public record DevisResponse(
        Long id,
        Long clientId,
        String numero,
        StatutDevis statut,
        Emetteur emetteur,
        Destinataire destinataire,
        LocalDate dateEmission,
        LocalDate dateDebutPrestation,
        LocalDate dateValidite,
        boolean acompteActif,
        BigDecimal acompteTaux,
        BigDecimal acompteMontant,
        String mentionsLegales,
        List<LigneResponse> lignes,
        BigDecimal totalHT,
        BigDecimal totalTVA,
        BigDecimal totalTTC) {

    public record Emetteur(String raisonSociale, String adresse, String siret,
                           String tvaIntra, String email, String telephone) {}

    public record Destinataire(String raisonSociale, String attention, String adresse, String siret) {}

    public record LigneResponse(Long id, String designation, String detail, BigDecimal quantite,
                                BigDecimal prixUnitaireHT, BigDecimal tauxTva, BigDecimal totalHT) {}

    public static DevisResponse fromEntity(Devis d) {
        BigDecimal totalHT = BigDecimal.ZERO;
        BigDecimal totalTVA = BigDecimal.ZERO;
        List<LigneResponse> lignes = new java.util.ArrayList<>();

        for (LigneDevis l : d.getLignes()) {
            BigDecimal ligneHT = l.getQuantite().multiply(l.getPrixUnitaireHT());
            BigDecimal ligneTVA = ligneHT.multiply(l.getTauxTva())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
            ligneHT = ligneHT.setScale(2, RoundingMode.HALF_UP);
            totalHT = totalHT.add(ligneHT);
            totalTVA = totalTVA.add(ligneTVA);
            lignes.add(new LigneResponse(l.getId(), l.getDesignation(), l.getDetail(),
                    l.getQuantite(), l.getPrixUnitaireHT(), l.getTauxTva(), ligneHT));
        }

        totalHT = totalHT.setScale(2, RoundingMode.HALF_UP);
        totalTVA = totalTVA.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalTTC = totalHT.add(totalTVA);

        // RG-003 : acompte calcule sur le TTC, arrondi a 2 decimales.
        BigDecimal acompteMontant = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);
        if (d.isAcompteActif() && d.getAcompteTaux() != null) {
            acompteMontant = totalTTC.multiply(d.getAcompteTaux())
                    .divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP);
        }

        return new DevisResponse(
                d.getId(), d.getClient() != null ? d.getClient().getId() : null,
                d.getNumero(), d.getStatut(),
                new Emetteur(d.getEmetteurRaisonSociale(), d.getEmetteurAdresse(),
                        d.getEmetteurSiret(), d.getEmetteurTvaIntra(),
                        d.getEmetteurEmail(), d.getEmetteurTelephone()),
                new Destinataire(d.getClientRaisonSociale(), d.getClientAttention(),
                        d.getClientAdresse(), d.getClientSiret()),
                d.getDateEmission(), d.getDateDebutPrestation(), d.getDateValidite(),
                d.isAcompteActif(), d.getAcompteTaux(), acompteMontant,
                d.getMentionsLegales(), lignes, totalHT, totalTVA, totalTTC);
    }
}
