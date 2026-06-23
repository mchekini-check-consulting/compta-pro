package com.comptapro.repository;

import com.comptapro.model.Devis;
import com.comptapro.model.StatutDevis;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/** Acces aux devis, cloisonne par cabinet. */
public interface DevisRepository extends JpaRepository<Devis, Long> {

    /** Devis d'un dossier, du plus recent au plus ancien. */
    List<Devis> findByClientIdAndAccountantIdOrderByCreatedAtDesc(Long clientId, Long accountantId);

    /** Un devis precis, valide pour le cabinet appelant. */
    Optional<Devis> findByIdAndAccountantId(Long id, Long accountantId);

    /**
     * Dernier rang de sequence utilise pour un cabinet et une annee donnes
     * (RG-001). Renvoie 0 si aucun devis n'existe encore.
     */
    @Query("""
            SELECT COALESCE(MAX(d.numeroSequence), 0)
            FROM Devis d
            WHERE d.accountantId = :accountantId
              AND d.anneeSequence = :annee
            """)
    int findMaxSequence(@Param("accountantId") Long accountantId, @Param("annee") Integer annee);

    /**
     * Devis non encore signes/refuses dont la validite est depassee (AC-03 :
     * candidats a l'expiration automatique).
     */
    @Query("""
            SELECT d FROM Devis d
            WHERE d.statut IN :statuts
              AND d.dateValidite < :date
            """)
    List<Devis> findExpirables(@Param("statuts") List<StatutDevis> statuts,
                               @Param("date") LocalDate date);
}
