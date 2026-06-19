package com.comptapro.repository;

import com.comptapro.model.Accountant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AccountantRepository extends JpaRepository<Accountant, Long> {

    boolean existsByEmail(String email);

    Optional<Accountant> findByEmail(String email);

    Optional<Accountant> findByVerificationToken(String token);
}
