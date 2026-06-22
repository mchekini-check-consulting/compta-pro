package com.comptapro.controller;

import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.FecService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;

/**
 * Export du Fichier des Ecritures Comptables (FEC) d'un dossier au format DGFiP.
 * Cloisonnement par cabinet via {@code accountantId} + appartenance du dossier.
 */
@RestController
@RequestMapping("/api/fec")
@RequiredArgsConstructor
public class FecController {

    private final FecService fecService;

    /** Telecharge le FEC du dossier (fichier texte tabule). */
    @GetMapping
    public ResponseEntity<byte[]> downloadFec(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId) {
        FecService.FecFile fichier = fecService.generate(userDetails.getAccountantId(), clientId);
        byte[] body = fichier.content().getBytes(StandardCharsets.UTF_8);

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fichier.filename() + "\"")
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .body(body);
    }
}
