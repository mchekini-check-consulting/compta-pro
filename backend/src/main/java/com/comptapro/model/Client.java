package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "clients")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Client {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String raisonSociale;

    @Column(nullable = false, length = 9)
    private String siren;

    // Champs nullable au niveau BDD pour ne pas casser la migration ddl-auto=update
    // sur d'eventuelles lignes existantes ; obligatoires au niveau API (DTO).
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private FormeJuridique formeJuridique;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StatutDossier statut;

    /** Date d'immatriculation au RCS (filtre "Date de creation", RG-005). */
    private LocalDate dateImmatriculation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegimeFiscal regimeFiscal;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private RegimeTVA regimeTVA;

    @Column(nullable = false)
    private LocalDate dateDebutExercice;

    @Column(nullable = false)
    private LocalDate dateFinExercice;

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accountant_id", nullable = false)
    private Accountant accountant;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
