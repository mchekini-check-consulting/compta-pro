package com.comptapro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

/** Grand livre d'un dossier : tous les comptes mouvementes et le total general. */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GrandLivreResponse {
    private Long clientId;
    private List<GrandLivreCompteResponse> comptes;
    private BigDecimal totalDebit;
    private BigDecimal totalCredit;
}
