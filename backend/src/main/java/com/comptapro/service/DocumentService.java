package com.comptapro.service;

import com.comptapro.dto.DocumentResponse;
import com.comptapro.exception.InvalidFileException;
import com.comptapro.model.*;
import com.comptapro.repository.AccountantRepository;
import com.comptapro.repository.DocumentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentService {

    private final DocumentRepository documentRepository;
    private final AccountantRepository accountantRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDir;

    private static final long MAX_FILE_SIZE = 300 * 1024 * 1024; // 300 Mo
    private static final List<String> ALLOWED_TYPES_CNI_KBIS = Arrays.asList(
            "application/pdf", "image/jpeg", "image/png"
    );
    private static final List<String> ALLOWED_TYPES_STATUTS = Arrays.asList(
            "application/pdf"
    );

    @Transactional
    public DocumentResponse uploadDocument(Long accountantId, DocumentType type, MultipartFile file) {
        // Valider le fichier
        validateFile(file, type);

        Accountant accountant = accountantRepository.findById(accountantId)
                .orElseThrow(() -> new RuntimeException("Compte non trouve"));

        // Supprimer l'ancien document si existant
        documentRepository.findByAccountantIdAndType(accountantId, type)
                .ifPresent(doc -> {
                    deleteFile(doc.getFilePath());
                    documentRepository.delete(doc);
                });

        // Sauvegarder le fichier
        String filePath = saveFile(file, accountantId, type);

        // Creer l'entite Document
        Document document = Document.builder()
                .accountant(accountant)
                .type(type)
                .fileName(file.getOriginalFilename())
                .filePath(filePath)
                .fileSize(file.getSize())
                .contentType(file.getContentType())
                .status(DocumentStatus.PENDING_VERIFICATION)
                .build();

        Document savedDoc = documentRepository.save(document);
        log.info("Document {} uploade pour le cabinet {}", type, accountant.getCabinetName());

        return toDocumentResponse(savedDoc);
    }

    public List<DocumentResponse> getDocuments(Long accountantId) {
        return documentRepository.findByAccountantId(accountantId)
                .stream()
                .map(this::toDocumentResponse)
                .collect(Collectors.toList());
    }

    public boolean canSubmitDossier(Long accountantId) {
        long count = documentRepository.countByAccountantId(accountantId);
        return count >= 3; // CNI, KBIS, STATUTS
    }

    @Transactional
    public void submitDossier(Long accountantId) {
        if (!canSubmitDossier(accountantId)) {
            throw new RuntimeException("Tous les documents doivent etre importes avant de soumettre le dossier");
        }

        Accountant accountant = accountantRepository.findById(accountantId)
                .orElseThrow(() -> new RuntimeException("Compte non trouve"));

        // Le compte reste en PENDING_VERIFICATION jusqu'a validation manuelle
        log.info("Dossier soumis pour verification: {}", accountant.getCabinetName());

        // TODO: Envoyer email de confirmation
    }

    @Transactional
    public void deleteDocument(Long accountantId, Long documentId) {
        Document document = documentRepository.findById(documentId)
                .filter(doc -> doc.getAccountant().getId().equals(accountantId))
                .orElseThrow(() -> new RuntimeException("Document non trouve"));

        deleteFile(document.getFilePath());
        documentRepository.delete(document);
        log.info("Document {} supprime", documentId);
    }

    private void validateFile(MultipartFile file, DocumentType type) {
        if (file.isEmpty()) {
            throw new InvalidFileException("Le fichier est vide");
        }

        if (file.getSize() > MAX_FILE_SIZE) {
            throw new InvalidFileException("Fichier trop volumineux — taille maximale : 300 Mo");
        }

        String contentType = file.getContentType();
        List<String> allowedTypes = (type == DocumentType.STATUTS)
                ? ALLOWED_TYPES_STATUTS
                : ALLOWED_TYPES_CNI_KBIS;

        if (contentType == null || !allowedTypes.contains(contentType)) {
            if (type == DocumentType.STATUTS) {
                throw new InvalidFileException("Format non supporte — format accepte : PDF");
            } else {
                throw new InvalidFileException("Format non supporte — formats acceptes : PDF, JPG, PNG");
            }
        }
    }

    private String saveFile(MultipartFile file, Long accountantId, DocumentType type) {
        try {
            Path uploadPath = Paths.get(uploadDir, accountantId.toString());
            Files.createDirectories(uploadPath);

            String originalFileName = file.getOriginalFilename();
            String extension = originalFileName != null && originalFileName.contains(".")
                    ? originalFileName.substring(originalFileName.lastIndexOf("."))
                    : "";
            String newFileName = type.name() + "_" + UUID.randomUUID() + extension;

            Path filePath = uploadPath.resolve(newFileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            return filePath.toString();
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors de l'upload du fichier", e);
        }
    }

    private void deleteFile(String filePath) {
        try {
            Files.deleteIfExists(Paths.get(filePath));
        } catch (IOException e) {
            log.error("Erreur lors de la suppression du fichier: {}", filePath, e);
        }
    }

    private DocumentResponse toDocumentResponse(Document document) {
        return DocumentResponse.builder()
                .id(document.getId())
                .type(document.getType())
                .fileName(document.getFileName())
                .fileSize(document.getFileSize())
                .contentType(document.getContentType())
                .status(document.getStatus())
                .rejectionReason(document.getRejectionReason())
                .uploadedAt(document.getUploadedAt())
                .verifiedAt(document.getVerifiedAt())
                .build();
    }
}
