package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Ligne de prestation d'un devis (AC-05).
 * <p>
 * Le total HT n'est pas stocke : il se deduit de {@code quantite x prixUnitaireHT}.
 * Le taux de TVA est porte par la ligne, jamais global (RG-005).
 */
@Entity
@Table(name = "lignes_devis")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LigneDevis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "devis_id", nullable = false)
    private Devis devis;

    /** Designation de la prestation (obligatoire). */
    @Column(nullable = false, length = 300)
    private String designation;

    /** Detail / sous-titre facultatif, affiche en gris sous la designation. */
    @Column(length = 500)
    private String detail;

    @Column(nullable = false, precision = 15, scale = 3)
    private BigDecimal quantite;

    @Column(name = "prix_unitaire_ht", nullable = false, precision = 15, scale = 2)
    private BigDecimal prixUnitaireHT;

    /** Taux de TVA en pourcentage (0, 5.5, 10 ou 20 — RG-005). */
    @Column(name = "taux_tva", nullable = false, precision = 5, scale = 2)
    private BigDecimal tauxTva;

    /** Ordre d'affichage de la ligne dans le devis. */
    @Column(nullable = false)
    private Integer ordre;
}
