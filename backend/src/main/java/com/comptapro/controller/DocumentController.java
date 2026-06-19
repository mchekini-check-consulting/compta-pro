package com.comptapro.controller;

import com.comptapro.dto.DocumentResponse;
import com.comptapro.model.DocumentType;
import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.DocumentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/documents")
@RequiredArgsConstructor
public class DocumentController {

    private final DocumentService documentService;

    @PostMapping("/upload")
    public ResponseEntity<DocumentResponse> uploadDocument(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @RequestParam("documentType") DocumentType type,
            @RequestParam("file") MultipartFile file) {
        DocumentResponse response = documentService.uploadDocument(userDetails.getAccountantId(), type, file);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/my-documents")
    public ResponseEntity<List<DocumentResponse>> getMyDocuments(
            @AuthenticationPrincipal AccountantUserDetails userDetails) {
        List<DocumentResponse> documents = documentService.getDocuments(userDetails.getAccountantId());
        return ResponseEntity.ok(documents);
    }

    @DeleteMapping("/{documentId}")
    public ResponseEntity<Map<String, Object>> deleteDocument(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long documentId) {
        documentService.deleteDocument(userDetails.getAccountantId(), documentId);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Document supprime"
        ));
    }

    @PostMapping("/submit")
    public ResponseEntity<Map<String, Object>> submitDossier(
            @AuthenticationPrincipal AccountantUserDetails userDetails) {
        documentService.submitDossier(userDetails.getAccountantId());
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Votre dossier a ete soumis. Vous serez notifie par email une fois la verification effectuee."
        ));
    }

    @GetMapping("/can-submit")
    public ResponseEntity<Map<String, Boolean>> canSubmitDossier(
            @AuthenticationPrincipal AccountantUserDetails userDetails) {
        boolean canSubmit = documentService.canSubmitDossier(userDetails.getAccountantId());
        return ResponseEntity.ok(Map.of("canSubmit", canSubmit));
    }
}
