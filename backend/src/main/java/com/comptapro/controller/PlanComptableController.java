package com.comptapro.controller;

import com.comptapro.dto.CompteComptableResponse;
import com.comptapro.repository.CompteComptableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Consultation du referentiel Plan Comptable General.
 */
@RestController
@RequestMapping("/api/plan-comptable")
@RequiredArgsConstructor
public class PlanComptableController {

    private final CompteComptableRepository repository;

    /**
     * Liste les comptes du PCG, eventuellement filtres par classe (1 a 8).
     */
    @GetMapping
    public ResponseEntity<List<CompteComptableResponse>> getComptes(
            @RequestParam(required = false) Integer classe) {
        List<CompteComptableResponse> comptes = (classe != null
                ? repository.findByClasseOrderByNumeroCompteAsc(classe)
                : repository.findAllByOrderByNumeroCompteAsc())
                .stream()
                .map(CompteComptableResponse::fromEntity)
                .toList();
        return ResponseEntity.ok(comptes);
    }

    /**
     * Recupere un compte par son numero.
     */
    @GetMapping("/{numeroCompte}")
    public ResponseEntity<CompteComptableResponse> getCompte(@PathVariable String numeroCompte) {
        return repository.findById(numeroCompte)
                .map(CompteComptableResponse::fromEntity)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
