package com.comptapro.dto;

import com.comptapro.model.FormeJuridique;
import com.comptapro.model.RegimeFiscal;
import com.comptapro.model.RegimeTVA;
import com.comptapro.model.StatutDossier;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateClientRequest {

    @NotBlank(message = "La raison sociale est obligatoire")
    private String raisonSociale;

    @NotBlank(message = "Le SIREN est obligatoire")
    @Pattern(regexp = "^[0-9]{9}$", message = "Le SIREN doit contenir exactement 9 chiffres")
    private String siren;

    @NotNull(message = "La forme juridique est obligatoire")
    private FormeJuridique formeJuridique;

    @NotNull(message = "Le statut du dossier est obligatoire")
    private StatutDossier statut;

    @NotNull(message = "La date d'immatriculation est obligatoire")
    private LocalDate dateImmatriculation;

    @NotNull(message = "Le regime fiscal est obligatoire")
    private RegimeFiscal regimeFiscal;

    @NotNull(message = "Le regime TVA est obligatoire")
    private RegimeTVA regimeTVA;

    @NotNull(message = "La date de debut d'exercice est obligatoire")
    private LocalDate dateDebutExercice;

    @NotNull(message = "La date de fin d'exercice est obligatoire")
    private LocalDate dateFinExercice;
}
