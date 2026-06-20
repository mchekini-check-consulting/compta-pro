package com.comptapro.controller;

import com.comptapro.dto.CreateEcritureRequest;
import com.comptapro.dto.EcritureResponse;
import com.comptapro.dto.NextNumeroResponse;
import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.EcritureComptableService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

/**
 * Saisie et consultation des ecritures comptables (journal d'un dossier).
 * <p>
 * Seul l'expert-comptable authentifie accede a ses dossiers (RG-001) :
 * le cloisonnement est assure par {@code accountantId} + appartenance du dossier.
 */
@RestController
@RequestMapping("/api/journal")
@RequiredArgsConstructor
public class JournalController {

    private final EcritureComptableService ecritureService;

    /** Liste les ecritures d'un dossier. */
    @GetMapping
    public ResponseEntity<List<EcritureResponse>> getEcritures(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId) {
        return ResponseEntity.ok(
                ecritureService.getEcrituresByClient(userDetails.getAccountantId(), clientId));
    }

    /** Apercu du numero d'operation genere pour le premier compte saisi (RG-003). */
    @GetMapping("/next-numero")
    public ResponseEntity<NextNumeroResponse> previewNumero(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId,
            @RequestParam String numeroCompte,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return ResponseEntity.ok(
                ecritureService.previewNumero(userDetails.getAccountantId(), clientId, numeroCompte, date));
    }

    /** Enregistre une ecriture en statut Brouillon (RG-015). */
    @PostMapping
    public ResponseEntity<EcritureResponse> createBrouillon(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @Valid @RequestBody CreateEcritureRequest request) {
        EcritureResponse response =
                ecritureService.createBrouillon(userDetails.getAccountantId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
