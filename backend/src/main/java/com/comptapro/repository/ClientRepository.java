package com.comptapro.repository;

import com.comptapro.model.Client;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ClientRepository extends JpaRepository<Client, Long>, JpaSpecificationExecutor<Client> {

    List<Client> findByAccountantIdOrderByCreatedAtDesc(Long accountantId);

    Optional<Client> findByIdAndAccountantId(Long id, Long accountantId);

    boolean existsBySirenAndAccountantId(String siren, Long accountantId);

    long countByAccountantId(Long accountantId);
}
