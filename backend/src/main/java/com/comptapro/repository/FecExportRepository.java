package com.comptapro.repository;

import com.comptapro.model.FecExport;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Acces aux traces d'export FEC (AC-14), cloisonne par cabinet. */
public interface FecExportRepository extends JpaRepository<FecExport, Long> {

    /** Historique d'un dossier, du plus recent au plus ancien. */
    List<FecExport> findByClientIdAndAccountantIdOrderByCreatedAtDesc(Long clientId, Long accountantId);

    /** Un export precis, valide pour le cabinet appelant. */
    Optional<FecExport> findByIdAndAccountantId(Long id, Long accountantId);
}
