package com.comptapro.dto;

import com.comptapro.model.EcritureComptable;
import com.comptapro.model.EcritureStatut;
import com.comptapro.model.LigneEcriture;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EcritureResponse {

    private Long id;
    private Long clientId;
    private LocalDate date;
    private String codeJournal;
    private String numeroOperation;
    private EcritureStatut statut;
    private List<LigneEcritureResponse> lignes;
    private BigDecimal totalDebit;
    private BigDecimal totalCredit;

    public static EcritureResponse fromEntity(EcritureComptable ecriture) {
        BigDecimal totalDebit = ecriture.getLignes().stream()
                .map(LigneEcriture::getDebit)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = ecriture.getLignes().stream()
                .map(LigneEcriture::getCredit)
                .filter(java.util.Objects::nonNull)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return EcritureResponse.builder()
                .id(ecriture.getId())
                .clientId(ecriture.getClient().getId())
                .date(ecriture.getDateEcriture())
                .codeJournal(ecriture.getCodeJournal())
                .numeroOperation(ecriture.getNumeroOperation())
                .statut(ecriture.getStatut())
                .lignes(ecriture.getLignes().stream().map(LigneEcritureResponse::fromEntity).toList())
                .totalDebit(totalDebit)
                .totalCredit(totalCredit)
                .build();
    }
}
