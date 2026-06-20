package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Ligne d'une ecriture comptable : un compte impute au debit OU au credit.
 * <p>
 * Une ligne ne peut pas porter un debit ET un credit simultanement (RG-010) ;
 * les montants sont positifs, en euros (RG-011/RG-012).
 */
@Entity
@Table(name = "lignes_ecriture")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LigneEcriture {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ecriture_id", nullable = false)
    private EcritureComptable ecriture;

    /** Numero du compte impute (reference au Plan Comptable General). */
    @Column(nullable = false, length = 6)
    private String numeroCompte;

    /** Intitule du compte au moment de la saisie (denormalise pour l'affichage). */
    @Column(nullable = false, length = 200)
    private String libelleCompte;

    /** Libelle de la ligne (RG-009 : obligatoire, alphanumerique). */
    @Column(nullable = false, length = 200)
    private String libelle;

    /** Montant au debit (NULL si la ligne est creditrice). */
    @Column(precision = 15, scale = 2)
    private BigDecimal debit;

    /** Montant au credit (NULL si la ligne est debitrice). */
    @Column(precision = 15, scale = 2)
    private BigDecimal credit;

    /** Ordre d'affichage de la ligne dans l'ecriture. */
    @Column(nullable = false)
    private Integer ordre;
}
