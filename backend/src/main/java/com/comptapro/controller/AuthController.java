package com.comptapro.controller;

import com.comptapro.dto.LoginRequest;
import com.comptapro.dto.LoginResponse;
import com.comptapro.dto.RegisterAccountantRequest;
import com.comptapro.dto.RegisterAccountantResponse;
import com.comptapro.model.Accountant;
import com.comptapro.model.AccountStatus;
import com.comptapro.repository.AccountantRepository;
import com.comptapro.security.JwtService;
import com.comptapro.service.AccountantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AccountantService accountantService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;
    private final AccountantRepository accountantRepository;

    @PostMapping("/register")
    public ResponseEntity<RegisterAccountantResponse> register(
            @Valid @RequestBody RegisterAccountantRequest request) {
        RegisterAccountantResponse response = accountantService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/verify")
    public ResponseEntity<Map<String, Object>> verifyEmail(@RequestParam String token) {
        boolean verified = accountantService.verifyEmail(token);

        if (verified) {
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Votre compte a été vérifié avec succès. Vous pouvez maintenant vous connecter."
            ));
        } else {
            return ResponseEntity.badRequest().body(Map.of(
                "success", false,
                "message", "Token de vérification invalide ou expiré."
            ));
        }
    }

    @GetMapping("/check-email")
    public ResponseEntity<Map<String, Boolean>> checkEmailExists(@RequestParam String email) {
        boolean exists = accountantService.emailExists(email);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );

            UserDetails userDetails = userDetailsService.loadUserByUsername(request.getEmail());
            String token = jwtService.generateToken(userDetails);

            Accountant accountant = accountantRepository.findByEmail(request.getEmail())
                .orElseThrow();

            // Vérifier si le compte est suspendu
            if (accountant.getStatus() == AccountStatus.SUSPENDED) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(
                    LoginResponse.builder()
                        .success(false)
                        .message("Votre compte a été suspendu. Veuillez contacter le support.")
                        .build()
                );
            }

            return ResponseEntity.ok(
                LoginResponse.builder()
                    .success(true)
                    .message("Connexion réussie")
                    .token(token)
                    .accountantId(accountant.getId())
                    .cabinetName(accountant.getCabinetName())
                    .email(accountant.getEmail())
                    .accountStatus(accountant.getStatus())
                    .build()
            );

        } catch (BadCredentialsException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(
                LoginResponse.builder()
                    .success(false)
                    .message("Email ou mot de passe incorrect")
                    .build()
            );
        }
    }
}
