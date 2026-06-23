package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Trace d'un export FEC genere pour un dossier (AC-14, RG-009).
 * <p>
 * Conserve les metadonnees du controle (lignes, bloquants, avertissements) et le
 * contenu du fichier afin de permettre un re-telechargement ulterieur.
 */
@Entity
@Table(name = "fec_exports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FecExport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Dossier exporte (cloisonnement par cabinet via le client). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "client_id", nullable = false)
    private Client client;

    /** Cabinet proprietaire, pour le cloisonnement des requetes. */
    @Column(name = "accountant_id", nullable = false)
    private Long accountantId;

    /** Utilisateur ayant lance l'export (identifiant de connexion). */
    @Column(nullable = false)
    private String utilisateur;

    /** Borne de debut de l'exercice exporte (peut etre nulle si non defini). */
    @Column(name = "exercice_debut")
    private LocalDate exerciceDebut;

    /** Borne de fin (cloture) de l'exercice exporte. */
    @Column(name = "exercice_fin")
    private LocalDate exerciceFin;

    /** Nombre de lignes de mouvement exportees (hors en-tete). */
    @Column(name = "nb_lignes", nullable = false)
    private int nbLignes;

    @Column(name = "nb_bloquants", nullable = false)
    private int nbBloquants;

    @Column(name = "nb_avertissements", nullable = false)
    private int nbAvertissements;

    /** Σ Debit total du fichier (AC-04). */
    @Column(name = "sigma_debit", precision = 15, scale = 2)
    private BigDecimal sigmaDebit;

    /** Σ Credit total du fichier (AC-04). */
    @Column(name = "sigma_credit", precision = 15, scale = 2)
    private BigDecimal sigmaCredit;

    /** Statut de l'export : Succes / Partiel / Echec (AC-04). */
    @Column(nullable = false, length = 10)
    @Enumerated(EnumType.STRING)
    private StatutExportFec statut;

    /** Empreinte SHA-256 du fichier pour controle d'integrite (AC-03, RG-005). */
    @Column(name = "hash_sha256", length = 64)
    private String hashSha256;

    /** Avertissements consignes au moment de l'export, un par ligne (AC-06). */
    @Lob
    @Column(name = "avertissements_texte", columnDefinition = "TEXT")
    private String avertissementsTexte;

    /** Validation manuelle avec l'outil CTRL-DGFIP (AC-09). */
    @Column(name = "valide_ctrl_dgfip", nullable = false)
    private boolean valideCtrlDgfip;

    @Column(name = "date_validation_ctrl")
    private LocalDateTime dateValidationCtrl;

    /** Nom de fichier reglementaire genere. */
    @Column(nullable = false)
    private String filename;

    /** Contenu integral du fichier, pour re-telechargement (AC-14). */
    @Lob
    @Column(nullable = false, columnDefinition = "TEXT")
    private String contenu;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
