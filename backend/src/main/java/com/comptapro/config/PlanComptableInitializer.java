package com.comptapro.config;

import com.comptapro.dto.PlanComptableImportResult;
import com.comptapro.model.CompteComptable;
import com.comptapro.model.CompteStatut;
import com.comptapro.repository.CompteComptableRepository;
import com.comptapro.service.PlanComptableImportService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Charge le Plan Comptable General en base au demarrage de l'application,
 * uniquement si la table est vide. Le referentiel est ainsi persiste une fois
 * et reutilise lors des demarrages suivants.
 */
@Component
@RequiredArgsConstructor
public class PlanComptableInitializer implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(PlanComptableInitializer.class);

    private static final String CSV_RESOURCE = "data/plan_comptable_general_2026.csv";

    private final CompteComptableRepository repository;
    private final PlanComptableImportService importService;

    /** Comptes de cloture TVA indispensables (cadrage CA3), absents des anciens imports. */
    private static final List<CompteComptable> COMPTES_REQUIS = List.of(
            CompteComptable.builder().numeroCompte("44551").intitule("TVA a decaisser").classe(4).niveau(5).statut(CompteStatut.ACTIF).build(),
            CompteComptable.builder().numeroCompte("44567").intitule("Credit de TVA a reporter").classe(4).niveau(5).statut(CompteStatut.ACTIF).build()
    );

    @Override
    public void run(ApplicationArguments args) {
        long existants = repository.count();
        if (existants > 0) {
            log.info("Plan comptable deja present en base ({} compte(s)), import ignore.", existants);
            ensureComptesRequis();
            return;
        }

        log.info("Plan comptable absent en base, import depuis {} ...", CSV_RESOURCE);
        try (InputStream in = new ClassPathResource(CSV_RESOURCE).getInputStream();
             Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8)) {
            PlanComptableImportResult resultat = importService.importFromCsv(reader);
            log.info("Plan comptable importe : {} compte(s) en base, {} ligne(s) rejetee(s).",
                    resultat.getImportes(), resultat.getRejetes());
        } catch (Exception e) {
            log.error("Echec de l'import du plan comptable au demarrage : {}", e.getMessage(), e);
        }
    }

    /** Insere les comptes requis manquants (idempotent), meme si le PCG est deja importe. */
    private void ensureComptesRequis() {
        for (CompteComptable compte : COMPTES_REQUIS) {
            if (!repository.existsById(compte.getNumeroCompte())) {
                repository.save(compte);
                log.info("Compte requis ajoute au plan comptable : {} ({}).",
                        compte.getNumeroCompte(), compte.getIntitule());
            }
        }
    }
}
