package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Ecriture comptable saisie dans un journal (TREZ — saisie manuelle).
 * <p>
 * Chaque ecriture appartient a un seul journal (RG-005) et a un dossier client.
 * Le code journal est determine par la classe du premier compte saisi (RG-006)
 * et le numero d'operation est genere au format JJ-AAAA-NNNNN (RG-003), la
 * sequence etant independante par journal et par exercice (RG-004).
 */
@Entity
@Table(name = "ecritures_comptables")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EcritureComptable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Dossier auquel l'ecriture est rattachee (cloisonnement par cabinet via le client). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    /** Date de l'ecriture, comprise dans l'exercice ouvert du dossier (RG-002). */
    @Column(nullable = false)
    private LocalDate dateEcriture;

    /** Code journal (VE, AC, BQ, PA, OD) deduit de la classe du premier compte (RG-006/RG-007). */
    @Column(nullable = false, length = 2)
    private String codeJournal;

    /** Numero d'operation complet, format JJ-AAAA-NNNNN (RG-003). */
    @Column(nullable = false, length = 20)
    private String numeroOperation;

    /** Annee de la sequence (RG-004 : la sequence repart a 00001 chaque 1er janvier). */
    @Column(nullable = false)
    private Integer anneeSequence;

    /** Rang dans la sequence journal+exercice (partie NNNNN du numero). */
    @Column(nullable = false)
    private Integer numeroSequence;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EcritureStatut statut;

    @OneToMany(mappedBy = "ecriture", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("ordre ASC")
    @Builder.Default
    private List<LigneEcriture> lignes = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;

    /** Rattache une ligne a l'ecriture en maintenant la relation bidirectionnelle. */
    public void addLigne(LigneEcriture ligne) {
        ligne.setEcriture(this);
        this.lignes.add(ligne);
    }

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
