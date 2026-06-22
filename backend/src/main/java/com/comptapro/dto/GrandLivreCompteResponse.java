package com.comptapro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/** Un compte du grand livre : ses mouvements et ses totaux. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrandLivreCompteResponse {
    private String numeroCompte;
    private String libelleCompte;
    private List<GrandLivreMouvementResponse> mouvements;
    private BigDecimal totalDebit;
    private BigDecimal totalCredit;
    /** Solde du compte : totalDebit - totalCredit (positif = debiteur). */
    private BigDecimal solde;
}
