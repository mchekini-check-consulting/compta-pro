package com.comptapro.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Compte du Plan Comptable General (referentiel ANC 2022-06).
 * <p>
 * Le numero de compte est la cle primaire fonctionnelle (1 a 5 chiffres,
 * jamais de zero en tete). La table est un referentiel officiel partage
 * par tous les dossiers : elle n'est pas rattachee a un comptable.
 */
@Entity
@Table(name = "plan_comptable_general")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompteComptable {

    /** Numero PCG, cle primaire fonctionnelle (VARCHAR(6)). */
    @Id
    @Column(name = "numero_compte", length = 6, nullable = false)
    private String numeroCompte;

    /** Libelle officiel ANC, normalise UTF-8 a l'import (accents restitues). */
    @Column(nullable = false, length = 200)
    private String intitule;

    /** Premier chiffre du numero de compte : grande famille (1 a 8). */
    @Column(nullable = false)
    private Integer classe;

    /** Profondeur hierarchique dans l'arborescence du PCG (1 a 5). */
    @Column(nullable = false)
    private Integer niveau;

    /** Note de conformite reglementaire ANC 2022-06. NULL si non renseignee. */
    @Column(columnDefinition = "TEXT")
    private String observation;

    /** Statut au regard de la reforme : ACTIF par defaut, SUPPRIME si abroge. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompteStatut statut;
}
