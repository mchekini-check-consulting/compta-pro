package com.comptapro.dto;

import com.comptapro.model.CompteComptable;
import com.comptapro.model.CompteStatut;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompteComptableResponse {

    private String numeroCompte;
    private String intitule;
    private Integer classe;
    private Integer niveau;
    private String observation;
    private CompteStatut statut;

    public static CompteComptableResponse fromEntity(CompteComptable compte) {
        return CompteComptableResponse.builder()
                .numeroCompte(compte.getNumeroCompte())
                .intitule(compte.getIntitule())
                .classe(compte.getClasse())
                .niveau(compte.getNiveau())
                .observation(compte.getObservation())
                .statut(compte.getStatut())
                .build();
    }
}
