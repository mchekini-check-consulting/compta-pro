package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Devis emis pour un client d'un dossier (US-F-001).
 * <p>
 * Le numero suit le format {@code DEV-AAAA-NNNN}, sequentiel par cabinet et par
 * exercice (RG-001). Les blocs emetteur et destinataire sont figes (snapshot) a
 * la creation pour qu'un devis historique reste inchange si la fiche evolue.
 */
@Entity
@Table(name = "devis")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Devis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Dossier auquel le devis est rattache (cloisonnement par cabinet via le client). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    /** Cabinet proprietaire, pour le cloisonnement des requetes et la numerotation. */
    @Column(name = "accountant_id", nullable = false)
    private Long accountantId;

    /** Numero rendu au format DEV-AAAA-NNNN (RG-001). */
    @Column(nullable = false, length = 20, unique = true)
    private String numero;

    /** Annee de la sequence de numerotation. */
    @Column(name = "annee_sequence", nullable = false)
    private Integer anneeSequence;

    /** Rang dans la sequence cabinet+annee (partie NNNN du numero). */
    @Column(name = "numero_sequence", nullable = false)
    private Integer numeroSequence;

    @Column(nullable = false, length = 30)
    @Enumerated(EnumType.STRING)
    private StatutDevis statut;

    // --- Bloc emetteur (snapshot cabinet, AC-02) ---
    @Column(name = "emetteur_raison_sociale", length = 200)
    private String emetteurRaisonSociale;
    @Column(name = "emetteur_adresse", length = 300)
    private String emetteurAdresse;
    @Column(name = "emetteur_siret", length = 20)
    private String emetteurSiret;
    @Column(name = "emetteur_tva_intra", length = 20)
    private String emetteurTvaIntra;
    @Column(name = "emetteur_email", length = 150)
    private String emetteurEmail;
    @Column(name = "emetteur_telephone", length = 20)
    private String emetteurTelephone;

    // --- Bloc destinataire (snapshot client, AC-03) ---
    @Column(name = "client_raison_sociale", length = 200)
    private String clientRaisonSociale;
    @Column(name = "client_attention", length = 200)
    private String clientAttention;
    @Column(name = "client_adresse", length = 300)
    private String clientAdresse;
    @Column(name = "client_siret", length = 20)
    private String clientSiret;

    // --- Dates (AC-04) ---
    @Column(name = "date_emission", nullable = false)
    private LocalDate dateEmission;
    @Column(name = "date_debut_prestation")
    private LocalDate dateDebutPrestation;
    @Column(name = "date_validite", nullable = false)
    private LocalDate dateValidite;

    // --- Acompte (AC-08, RG-003) ---
    @Column(name = "acompte_actif", nullable = false)
    private boolean acompteActif;
    /** Taux d'acompte en pourcentage (ex : 30.00). */
    @Column(name = "acompte_taux", precision = 5, scale = 2)
    private BigDecimal acompteTaux;

    /** Mentions legales du devis (AC-09), pre-remplies et modifiables. */
    @Column(name = "mentions_legales", columnDefinition = "TEXT")
    private String mentionsLegales;

    @OneToMany(mappedBy = "devis", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC")
    @Builder.Default
    private List<LigneDevis> lignes = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = createdAt;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
