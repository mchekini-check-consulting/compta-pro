package com.comptapro.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/** Ligne de prestation soumise lors de la creation/mise a jour d'un devis. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class LigneDevisRequest {

    @NotBlank(message = "La designation est obligatoire")
    private String designation;

    /** Detail / sous-titre facultatif. */
    private String detail;

    @NotNull(message = "La quantite est obligatoire")
    @DecimalMin(value = "0.0", inclusive = false, message = "La quantite doit etre positive")
    private BigDecimal quantite;

    @NotNull(message = "Le prix unitaire HT est obligatoire")
    @DecimalMin(value = "0.0", message = "Le prix unitaire HT ne peut etre negatif")
    private BigDecimal prixUnitaireHT;

    @NotNull(message = "Le taux de TVA est obligatoire")
    private BigDecimal tauxTva;
}
