package com.comptapro.repository;

import com.comptapro.model.EcritureComptable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EcritureComptableRepository extends JpaRepository<EcritureComptable, Long> {

    List<EcritureComptable> findByClientIdOrderByDateEcritureDescIdDesc(Long clientId);

    /**
     * Dernier rang de sequence utilise pour un dossier, un journal et une annee
     * donnes (RG-004). Renvoie 0 si aucune ecriture n'existe encore.
     */
    @Query("""
            SELECT COALESCE(MAX(e.numeroSequence), 0)
            FROM EcritureComptable e
            WHERE e.client.id = :clientId
              AND e.codeJournal = :codeJournal
              AND e.anneeSequence = :annee
            """)
    int findMaxSequence(@Param("clientId") Long clientId,
                        @Param("codeJournal") String codeJournal,
                        @Param("annee") Integer annee);
}
