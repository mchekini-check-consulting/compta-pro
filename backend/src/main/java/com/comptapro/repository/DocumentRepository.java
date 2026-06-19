package com.comptapro.repository;

import com.comptapro.model.Document;
import com.comptapro.model.DocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface DocumentRepository extends JpaRepository<Document, Long> {

    List<Document> findByAccountantId(Long accountantId);

    Optional<Document> findByAccountantIdAndType(Long accountantId, DocumentType type);

    boolean existsByAccountantIdAndType(Long accountantId, DocumentType type);

    long countByAccountantId(Long accountantId);
}
