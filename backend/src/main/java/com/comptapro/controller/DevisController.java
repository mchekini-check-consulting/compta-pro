package com.comptapro.controller;

import com.comptapro.dto.CreateDevisRequest;
import com.comptapro.dto.DevisResponse;
import com.comptapro.dto.NextNumeroResponse;
import com.comptapro.model.StatutDevis;
import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.DevisService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Gestion des devis d'un dossier (US-F-001 et cycle de vie des statuts).
 * <p>
 * Cloisonnement par cabinet : {@code accountantId} + appartenance du dossier.
 */
@RestController
@RequestMapping("/api/devis")
@RequiredArgsConstructor
public class DevisController {

    private final DevisService devisService;

    /** Liste les devis d'un dossier. */
    @GetMapping
    public ResponseEntity<List<DevisResponse>> getDevis(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId) {
        return ResponseEntity.ok(devisService.getDevisByClient(userDetails.getAccountantId(), clientId));
    }

    /** Apercu du prochain numero pour le formulaire « Nouveau devis » (AC-01). */
    @GetMapping("/next-numero")
    public ResponseEntity<NextNumeroResponse> previewNumero(
            @AuthenticationPrincipal AccountantUserDetails userDetails) {
        return ResponseEntity.ok(devisService.previewNumero(userDetails.getAccountantId()));
    }

    /** Detail d'un devis. */
    @GetMapping("/{id}")
    public ResponseEntity<DevisResponse> getOne(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id) {
        return ResponseEntity.ok(devisService.getDevis(userDetails.getAccountantId(), id));
    }

    /** Cree un devis en statut Brouillon (RG-004). */
    @PostMapping
    public ResponseEntity<DevisResponse> create(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @Valid @RequestBody CreateDevisRequest request) {
        DevisResponse response = devisService.create(userDetails.getAccountantId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /** Met a jour un devis non signe (RG-002). */
    @PutMapping("/{id}")
    public ResponseEntity<DevisResponse> update(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody CreateDevisRequest request) {
        return ResponseEntity.ok(devisService.update(userDetails.getAccountantId(), id, request));
    }

    /** Change le statut d'un devis (RG-001). */
    @PostMapping("/{id}/statut")
    public ResponseEntity<DevisResponse> changerStatut(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id,
            @RequestParam StatutDevis statut) {
        return ResponseEntity.ok(devisService.changerStatut(userDetails.getAccountantId(), id, statut));
    }

    /** Relance un devis expire en creant une copie en brouillon (RG-003). */
    @PostMapping("/{id}/relancer")
    public ResponseEntity<DevisResponse> relancer(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id) {
        DevisResponse response = devisService.relancer(userDetails.getAccountantId(), id);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
