package com.comptapro.service;

import com.comptapro.dto.PlanComptableImportResult;
import com.comptapro.exception.PlanComptableImportException;
import com.comptapro.model.CompteComptable;
import com.comptapro.model.CompteStatut;
import com.comptapro.repository.CompteComptableRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * Import du Plan Comptable General (CSV ANC 2022-06) en base.
 * <p>
 * Implemente les criteres d'acceptation AC-01 a AC-10 :
 * <ul>
 *   <li>AC-01 : 351 enregistrements attendus, sans doublon ;</li>
 *   <li>AC-02 : doublon de numero de compte -> exception + rollback de l'import ;</li>
 *   <li>AC-03 : champ obligatoire manquant -> ligne rejetee, journalisee, import poursuivi ;</li>
 *   <li>AC-04 : classe != premier chiffre du numero -> rejet « Incoherence classe/numero » ;</li>
 *   <li>AC-05 : libelles re-accentues (cf. {@link LibelleNormalizer}) ;</li>
 *   <li>AC-06 : observation vide -> NULL ;</li>
 *   <li>AC-07 : niveau strictement compris entre 1 et 5 ;</li>
 *   <li>AC-08 : classes admises de 1 a 8 ;</li>
 *   <li>AC-09 / AC-10 : statut SUPPRIME/ACTIF derive de l'observation.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class PlanComptableImportService {

    private static final Logger log = LoggerFactory.getLogger(PlanComptableImportService.class);

    private static final String SEPARATEUR = ";";
    /** Numero PCG : 1 a 6 chiffres, jamais de zero en tete. */
    private static final Pattern NUMERO_VALIDE = Pattern.compile("[1-9]\\d{0,5}");

    private final CompteComptableRepository repository;
    private final LibelleNormalizer normalizer;

    /** Fichier de journalisation des lignes rejetees (AC-03). */
    @Value("${plancomptable.import.error-log:plan-comptable-import-errors.log}")
    private String errorLogPath;

    /**
     * Importe le plan comptable depuis un flux CSV.
     * <p>
     * L'operation est transactionnelle : un doublon de numero de compte (AC-02)
     * leve une {@link PlanComptableImportException} qui annule l'ensemble de
     * l'import. Les lignes invalides (champ manquant, incoherence classe/numero,
     * niveau ou classe hors plage) sont, elles, ecartees individuellement,
     * journalisees, et n'interrompent pas l'import (AC-03).
     *
     * @param reader source CSV (avec ligne d'en-tete)
     * @return synthese de l'import
     */
    @Transactional
    public PlanComptableImportResult importFromCsv(Reader reader) {
        List<CompteComptable> aInserer = new ArrayList<>();
        List<String> erreurs = new ArrayList<>();
        Set<String> numerosVus = new HashSet<>();
        int lignesLues = 0;

        try (BufferedReader br = new BufferedReader(reader)) {
            String ligne;
            int numLigne = 0;
            boolean enTete = true;
            while ((ligne = br.readLine()) != null) {
                numLigne++;
                if (enTete) {
                    enTete = false;
                    continue;
                }
                if (ligne.isBlank()) {
                    continue;
                }
                lignesLues++;

                String[] champs = ligne.split(SEPARATEUR, -1);
                if (champs.length < 4) {
                    erreurs.add(rejet(numLigne, ligne, "format invalide (colonnes manquantes)"));
                    continue;
                }

                String numeroCompte = champs[0].trim();
                String intitule = champs[1].trim();
                String classeBrute = champs[2].trim();
                String niveauBrut = champs[3].trim();
                String observationBrute = champs.length >= 5 ? champs[4].trim() : "";

                // AC-03 : champs obligatoires
                if (numeroCompte.isEmpty() || intitule.isEmpty()
                        || classeBrute.isEmpty() || niveauBrut.isEmpty()) {
                    erreurs.add(rejet(numLigne, ligne, "champ obligatoire manquant"));
                    continue;
                }

                if (!NUMERO_VALIDE.matcher(numeroCompte).matches()) {
                    erreurs.add(rejet(numLigne, ligne, "numero de compte invalide"));
                    continue;
                }

                int classe;
                int niveau;
                try {
                    classe = Integer.parseInt(classeBrute);
                    niveau = Integer.parseInt(niveauBrut);
                } catch (NumberFormatException e) {
                    erreurs.add(rejet(numLigne, ligne, "classe ou niveau non numerique"));
                    continue;
                }

                // AC-08 : classes admises de 1 a 8
                if (classe < 1 || classe > 8) {
                    erreurs.add(rejet(numLigne, ligne, "classe hors plage (1-8)"));
                    continue;
                }

                // AC-07 : niveau de 1 a 5
                if (niveau < 1 || niveau > 5) {
                    erreurs.add(rejet(numLigne, ligne, "niveau hors plage (1-5)"));
                    continue;
                }

                // AC-04 : coherence classe / premier chiffre du numero
                int premierChiffre = numeroCompte.charAt(0) - '0';
                if (classe != premierChiffre) {
                    erreurs.add(rejet(numLigne, ligne, "Incoherence classe/numero"));
                    continue;
                }

                // AC-02 : doublon -> rollback total de l'import
                if (!numerosVus.add(numeroCompte)) {
                    throw new PlanComptableImportException(
                            "Doublon de numero de compte detecte (ligne " + numLigne
                                    + ", compte " + numeroCompte + ") : import annule");
                }

                // AC-05 : re-accentuation ; AC-06 : observation vide -> NULL
                String observation = observationBrute.isEmpty()
                        ? null : normalizer.normalize(observationBrute);

                // AC-09 / AC-10 : statut derive de l'observation
                CompteStatut statut = (observation != null
                        && observation.toUpperCase().contains("SUPPRIME"))
                        ? CompteStatut.SUPPRIME : CompteStatut.ACTIF;

                aInserer.add(CompteComptable.builder()
                        .numeroCompte(numeroCompte)
                        .intitule(normalizer.normalize(intitule))
                        .classe(classe)
                        .niveau(niveau)
                        .observation(observation)
                        .statut(statut)
                        .build());
            }
        } catch (IOException e) {
            throw new PlanComptableImportException("Lecture du CSV impossible : " + e.getMessage());
        }

        repository.saveAll(aInserer);
        journaliserErreurs(erreurs);

        log.info("Import plan comptable : {} ligne(s) lue(s), {} importee(s), {} rejetee(s)",
                lignesLues, aInserer.size(), erreurs.size());

        return PlanComptableImportResult.builder()
                .lignesLues(lignesLues)
                .importes(aInserer.size())
                .rejetes(erreurs.size())
                .erreurs(erreurs)
                .build();
    }

    private String rejet(int numLigne, String contenu, String motif) {
        String message = "Ligne " + numLigne + " rejetee [" + motif + "] : " + contenu;
        log.warn(message);
        return message;
    }

    /** Journalise les lignes rejetees dans un fichier d'erreurs (AC-03). */
    private void journaliserErreurs(List<String> erreurs) {
        if (erreurs.isEmpty()) {
            return;
        }
        try {
            Files.write(Path.of(errorLogPath), erreurs, StandardCharsets.UTF_8);
            log.info("{} ligne(s) rejetee(s) journalisee(s) dans {}", erreurs.size(), errorLogPath);
        } catch (IOException e) {
            log.error("Impossible d'ecrire le journal des erreurs d'import ({}): {}",
                    errorLogPath, e.getMessage());
        }
    }
}
