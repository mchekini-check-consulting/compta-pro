package com.comptapro.repository;

import com.comptapro.model.CompteComptable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CompteComptableRepository extends JpaRepository<CompteComptable, String> {

    List<CompteComptable> findAllByOrderByNumeroCompteAsc();

    List<CompteComptable> findByClasseOrderByNumeroCompteAsc(Integer classe);
}
