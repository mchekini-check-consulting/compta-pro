package com.comptapro.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Donnees de creation/mise a jour d'un devis (US-F-001). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateDevisRequest {

    @NotNull(message = "Le dossier est obligatoire")
    private Long clientId;

    /** Contact destinataire « a l'attention de » (facultatif, AC-03). */
    private String clientAttention;

    /** Date d'emission ; aujourd'hui par defaut si absente (AC-04). */
    private LocalDate dateEmission;

    /** Debut de prestation (libre, AC-04). */
    private LocalDate dateDebutPrestation;

    /** Validite ; emission + 30 jours par defaut si absente (AC-04, RG-002). */
    private LocalDate dateValidite;

    /** Active la ligne d'acompte (AC-08). */
    private boolean acompteActif;

    /** Taux d'acompte en pourcentage (ex : 30.00), requis si acompte actif. */
    private BigDecimal acompteTaux;

    /** Mentions legales ; valeurs par defaut si absentes (AC-09). */
    private String mentionsLegales;

    @NotEmpty(message = "Le devis doit comporter au moins une ligne")
    @Valid
    private List<LigneDevisRequest> lignes;
}
