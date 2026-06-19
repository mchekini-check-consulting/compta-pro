package com.comptapro.controller;

import com.comptapro.dto.RegisterAccountantRequest;
import com.comptapro.dto.RegisterAccountantResponse;
import com.comptapro.service.AccountantService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AccountantService accountantService;

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
}
