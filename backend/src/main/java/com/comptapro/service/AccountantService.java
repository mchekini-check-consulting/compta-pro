package com.comptapro.service;

import com.comptapro.dto.RegisterAccountantRequest;
import com.comptapro.dto.RegisterAccountantResponse;
import com.comptapro.exception.EmailAlreadyExistsException;
import com.comptapro.exception.PasswordMismatchException;
import com.comptapro.model.Accountant;
import com.comptapro.model.AccountStatus;
import com.comptapro.repository.AccountantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AccountantService {

    private final AccountantRepository accountantRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public RegisterAccountantResponse register(RegisterAccountantRequest request) {
        // Vérifier que les mots de passe correspondent
        if (!request.getPassword().equals(request.getConfirmPassword())) {
            throw new PasswordMismatchException("Les mots de passe ne correspondent pas");
        }

        // Vérifier si l'email existe déjà
        if (accountantRepository.existsByEmail(request.getEmail())) {
            throw new EmailAlreadyExistsException("Cette adresse email est déjà utilisée");
        }

        // Créer le compte
        Accountant accountant = Accountant.builder()
                .cabinetName(request.getCabinetName())
                .address(request.getAddress())
                .siren(request.getSiren())
                .registrationNumber(request.getRegistrationNumber())
                .email(request.getEmail())
                .phone(request.getPhone())
                .password(passwordEncoder.encode(request.getPassword()))
                .status(AccountStatus.PENDING_VERIFICATION)
                .verificationToken(UUID.randomUUID().toString())
                .build();

        Accountant savedAccountant = accountantRepository.save(accountant);

        log.info("Nouveau compte expert-comptable créé: {} ({})",
                savedAccountant.getCabinetName(), savedAccountant.getEmail());

        // TODO: Envoyer l'email de vérification
        sendVerificationEmail(savedAccountant);

        return RegisterAccountantResponse.builder()
                .success(true)
                .message("Votre compte a été créé. Veuillez vérifier votre email pour activer votre compte.")
                .accountantId(savedAccountant.getId())
                .build();
    }

    private void sendVerificationEmail(Accountant accountant) {
        // TODO: Implémenter l'envoi d'email avec Spring Mail
        log.info("Email de vérification envoyé à: {} avec le token: {}",
                accountant.getEmail(), accountant.getVerificationToken());
    }

    @Transactional
    public boolean verifyEmail(String token) {
        return accountantRepository.findByVerificationToken(token)
                .map(accountant -> {
                    accountant.setStatus(AccountStatus.ACTIVE);
                    accountant.setVerificationToken(null);
                    accountantRepository.save(accountant);
                    log.info("Compte vérifié: {}", accountant.getEmail());
                    return true;
                })
                .orElse(false);
    }

    public boolean emailExists(String email) {
        return accountantRepository.existsByEmail(email);
    }
}
