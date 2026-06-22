package com.comptapro.controller;

import com.comptapro.dto.GrandLivreResponse;
import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.GrandLivreService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Consultation du grand livre d'un dossier (comptes mouvementes).
 * Cloisonnement par cabinet via {@code accountantId} + appartenance du dossier.
 */
@RestController
@RequestMapping("/api/grand-livre")
@RequiredArgsConstructor
public class GrandLivreController {

    private final GrandLivreService grandLivreService;

    @GetMapping
    public ResponseEntity<GrandLivreResponse> getGrandLivre(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId) {
        return ResponseEntity.ok(
                grandLivreService.getGrandLivre(userDetails.getAccountantId(), clientId));
    }
}
