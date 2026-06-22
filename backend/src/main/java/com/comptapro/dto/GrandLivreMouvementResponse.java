package com.comptapro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/** Un mouvement (ligne d'ecriture) imputant un compte, avec solde cumule. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrandLivreMouvementResponse {
    private LocalDate date;
    private String codeJournal;
    private String numeroOperation;
    private String libelle;
    private BigDecimal debit;
    private BigDecimal credit;
    /** Solde cumule du compte apres ce mouvement (debit - credit). */
    private BigDecimal solde;
}
