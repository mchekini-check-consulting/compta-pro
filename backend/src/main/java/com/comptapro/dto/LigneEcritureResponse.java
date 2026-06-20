package com.comptapro.dto;

import com.comptapro.model.LigneEcriture;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LigneEcritureResponse {

    private Long id;
    private String numeroCompte;
    private String libelleCompte;
    private String libelle;
    private BigDecimal debit;
    private BigDecimal credit;
    private Integer ordre;

    public static LigneEcritureResponse fromEntity(LigneEcriture ligne) {
        return LigneEcritureResponse.builder()
                .id(ligne.getId())
                .numeroCompte(ligne.getNumeroCompte())
                .libelleCompte(ligne.getLibelleCompte())
                .libelle(ligne.getLibelle())
                .debit(ligne.getDebit())
                .credit(ligne.getCredit())
                .ordre(ligne.getOrdre())
                .build();
    }
}
