package com.comptapro.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LigneEcritureRequest {

    @NotBlank(message = "Le compte est obligatoire")
    private String numeroCompte;

    @NotBlank(message = "Le libelle de la ligne est obligatoire")
    private String libelle;

    /** Montant au debit (null ou 0 si la ligne est creditrice). */
    private BigDecimal debit;

    /** Montant au credit (null ou 0 si la ligne est debitrice). */
    private BigDecimal credit;
}
