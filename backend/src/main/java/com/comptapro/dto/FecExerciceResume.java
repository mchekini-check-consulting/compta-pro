package com.comptapro.dto;

import java.time.LocalDate;

/**
 * Exercice selectionnable pour l'export FEC (AC-01) : annee, dates et nombre
 * d'ecritures concernees.
 *
 * @param annee        annee de l'exercice
 * @param debut        date de debut de l'exercice
 * @param cloture      date de cloture de l'exercice
 * @param nbEcritures  nombre d'ecritures de l'exercice
 * @param nbLignes     nombre de lignes de mouvement de l'exercice
 * @param equilibre    {@code true} si Σ Debit = Σ Credit sur l'exercice (AC-01)
 */
public record FecExerciceResume(
        int annee,
        LocalDate debut,
        LocalDate cloture,
        long nbEcritures,
        long nbLignes,
        boolean equilibre) {}
