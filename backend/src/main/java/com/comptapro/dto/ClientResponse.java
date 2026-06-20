package com.comptapro.dto;

import com.comptapro.model.Client;
import com.comptapro.model.FormeJuridique;
import com.comptapro.model.RegimeFiscal;
import com.comptapro.model.RegimeTVA;
import com.comptapro.model.StatutDossier;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientResponse {

    private Long id;
    private String raisonSociale;
    private String siren;
    private FormeJuridique formeJuridique;
    private StatutDossier statut;
    private LocalDate dateImmatriculation;
    private RegimeFiscal regimeFiscal;
    private RegimeTVA regimeTVA;
    private LocalDate dateDebutExercice;
    private LocalDate dateFinExercice;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static ClientResponse fromEntity(Client client) {
        return ClientResponse.builder()
                .id(client.getId())
                .raisonSociale(client.getRaisonSociale())
                .siren(client.getSiren())
                .formeJuridique(client.getFormeJuridique())
                .statut(client.getStatut())
                .dateImmatriculation(client.getDateImmatriculation())
                .regimeFiscal(client.getRegimeFiscal())
                .regimeTVA(client.getRegimeTVA())
                .dateDebutExercice(client.getDateDebutExercice())
                .dateFinExercice(client.getDateFinExercice())
                .createdAt(client.getCreatedAt())
                .updatedAt(client.getUpdatedAt())
                .build();
    }
}
