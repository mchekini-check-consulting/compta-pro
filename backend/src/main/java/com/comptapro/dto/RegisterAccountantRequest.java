package com.comptapro.dto;

import jakarta.validation.constraints.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegisterAccountantRequest {

    @NotBlank(message = "Le nom du cabinet est obligatoire")
    private String cabinetName;

    @NotBlank(message = "L'adresse est obligatoire")
    private String address;

    @NotBlank(message = "Le SIREN est obligatoire")
    @Pattern(regexp = "^[0-9]{9}$", message = "SIREN invalide — 9 chiffres requis")
    private String siren;

    @NotBlank(message = "Le numéro d'immatriculation est obligatoire")
    private String registrationNumber;

    @NotBlank(message = "L'email est obligatoire")
    @Email(message = "Format email invalide")
    private String email;

    @NotBlank(message = "Le numéro de téléphone est obligatoire")
    @Pattern(regexp = "^0[0-9]{9}$", message = "Numéro de téléphone invalide — format attendu : 0XXXXXXXXX")
    private String phone;

    @NotBlank(message = "Le mot de passe est obligatoire")
    @Pattern(
        regexp = "^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*()_+\\-=\\[\\]{};':\"\\\\|,.<>\\/?]).{8,}$",
        message = "Le mot de passe ne respecte pas les critères de sécurité"
    )
    private String password;

    @NotBlank(message = "La confirmation du mot de passe est obligatoire")
    private String confirmPassword;
}
