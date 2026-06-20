package com.comptapro.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateEcritureRequest {

    @NotNull(message = "Le dossier est obligatoire")
    private Long clientId;

    @NotNull(message = "La date est obligatoire")
    private LocalDate date;

    @NotEmpty(message = "L'ecriture doit comporter au moins une ligne")
    @Valid
    private List<LigneEcritureRequest> lignes;
}
