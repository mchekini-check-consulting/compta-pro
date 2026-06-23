package com.comptapro.controller;

import com.comptapro.dto.FecControleRapport;
import com.comptapro.dto.FecExerciceResume;
import com.comptapro.dto.FecExportResume;
import com.comptapro.dto.FecSynthese;
import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.FecService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Export du Fichier des Ecritures Comptables (FEC) d'un dossier au format DGFiP.
 * Cloisonnement par cabinet via {@code accountantId} + appartenance du dossier.
 */
@RestController
@RequestMapping("/api/fec")
@RequiredArgsConstructor
public class FecController {

    private final FecService fecService;

    /** Exercices selectionnables pour l'export (AC-01). */
    @GetMapping("/exercices")
    public ResponseEntity<List<FecExerciceResume>> exercices(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId) {
        return ResponseEntity.ok(fecService.exercices(userDetails.getAccountantId(), clientId));
    }

    /** Synthese de collecte et de consolidation d'un exercice (FEC-001). */
    @GetMapping("/synthese")
    public ResponseEntity<FecSynthese> synthese(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId,
            @RequestParam(required = false) Integer annee) {
        return ResponseEntity.ok(fecService.synthese(userDetails.getAccountantId(), clientId, annee));
    }

    /** Controle de conformite prealable a l'export (AC-02). */
    @GetMapping("/controle")
    public ResponseEntity<FecControleRapport> controle(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId,
            @RequestParam(required = false) Integer annee) {
        return ResponseEntity.ok(fecService.controle(userDetails.getAccountantId(), clientId, annee));
    }

    /**
     * Telecharge le FEC du dossier (fichier texte tabule). Renvoie 409 avec le
     * rapport de controle si une anomalie bloquante empeche l'export (RG-008).
     */
    @GetMapping
    public ResponseEntity<byte[]> downloadFec(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId,
            @RequestParam(required = false) Integer annee) {
        FecService.FecFile fichier = fecService.generate(
                userDetails.getAccountantId(), userDetails.getUsername(), clientId, annee);
        return fichierResponse(fichier);
    }

    /** Historique des exports du dossier (AC-14). */
    @GetMapping("/historique")
    public ResponseEntity<List<FecExportResume>> historique(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam Long clientId) {
        return ResponseEntity.ok(fecService.historique(userDetails.getAccountantId(), clientId));
    }

    /** Re-telechargement d'un export archive a l'identique (AC-05). */
    @GetMapping("/historique/{exportId}")
    public ResponseEntity<byte[]> downloadArchive(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long exportId) {
        return fichierResponse(
                fecService.telechargerArchive(userDetails.getAccountantId(), exportId));
    }

    /** Marque un export comme valide avec l'outil CTRL-DGFIP (AC-09). */
    @PostMapping("/historique/{exportId}/valider-ctrl")
    public ResponseEntity<FecExportResume> validerCtrl(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long exportId) {
        return ResponseEntity.ok(
                fecService.validerCtrlDgfip(userDetails.getAccountantId(), exportId));
    }

    private ResponseEntity<byte[]> fichierResponse(FecService.FecFile fichier) {
        byte[] body = fichier.content().getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fichier.filename() + "\"")
                // Metadonnees d'integrite exposees au frontend (FEC-003 AC-02/03/08).
                .header("X-Fec-Sha256", fichier.hashSha256())
                .header("X-Fec-Sigma-Debit", String.valueOf(fichier.sigmaDebit()))
                .header("X-Fec-Sigma-Credit", String.valueOf(fichier.sigmaCredit()))
                .header("X-Fec-Lignes", String.valueOf(fichier.nbLignes()))
                .contentType(new MediaType("text", "plain", StandardCharsets.UTF_8))
                .body(body);
    }

    /** Echec technique de generation : 500 (AC-10). */
    @ExceptionHandler(IllegalStateException.class)
    public ResponseEntity<String> handleErreurGeneration(IllegalStateException ex) {
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("Erreur interne lors de la generation du FEC — contacter le support");
    }

    /** Export bloque par une anomalie bloquante : 409 + rapport de controle. */
    @ExceptionHandler(FecService.FecBloquantException.class)
    public ResponseEntity<FecControleRapport> handleBloquant(FecService.FecBloquantException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(ex.getRapport());
    }
}
