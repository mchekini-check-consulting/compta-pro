package com.comptapro.service;

import com.comptapro.dto.PlanComptableImportResult;
import com.comptapro.exception.PlanComptableImportException;
import com.comptapro.model.CompteComptable;
import com.comptapro.model.CompteStatut;
import com.comptapro.repository.CompteComptableRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifie les criteres d'acceptation AC-01 a AC-10 de l'import du plan comptable
 * en s'appuyant sur le fichier reel data/plan_comptable_general_2026.csv.
 */
class PlanComptableImportServiceTest {

    private CompteComptableRepository repository;
    private PlanComptableImportService service;
    private List<CompteComptable> sauvegardes;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        repository = mock(CompteComptableRepository.class);
        sauvegardes = new ArrayList<>();
        // saveAll renvoie l'argument et memorise les comptes "persistes"
        when(repository.saveAll(anyList())).thenAnswer(invocation -> {
            List<CompteComptable> arg = invocation.getArgument(0);
            sauvegardes.addAll(arg);
            return arg;
        });
        service = new PlanComptableImportService(repository, new LibelleNormalizer());
        // chemin de journal d'erreurs dans le repertoire temporaire
        org.springframework.test.util.ReflectionTestUtils.setField(
                service, "errorLogPath",
                System.getProperty("java.io.tmpdir") + "/pcg-test-errors.log");
    }

    private PlanComptableImportResult importerCsvReel() throws Exception {
        try (InputStream in = getClass().getClassLoader()
                .getResourceAsStream("data/plan_comptable_general_2026.csv");
             Reader reader = new InputStreamReader(in, StandardCharsets.UTF_8)) {
            return service.importFromCsv(reader);
        }
    }

    private Map<String, CompteComptable> parNumero() {
        return sauvegardes.stream()
                .collect(Collectors.toMap(CompteComptable::getNumeroCompte, Function.identity()));
    }

    @Test
    void ac01_importe_exactement_351_comptes_sans_doublon() throws Exception {
        PlanComptableImportResult resultat = importerCsvReel();

        assertThat(resultat.getImportes()).isEqualTo(351);
        assertThat(resultat.getRejetes()).isZero();
        assertThat(sauvegardes).extracting(CompteComptable::getNumeroCompte)
                .doesNotHaveDuplicates();
    }

    @Test
    void ac02_doublon_de_numero_annule_l_import() {
        String csv = "Numero_compte;Intitule;Classe;Niveau;Observation\n"
                + "401;Fournisseurs;4;3;\n"
                + "401;Fournisseurs bis;4;3;\n";

        assertThatThrownBy(() -> service.importFromCsv(new StringReader(csv)))
                .isInstanceOf(PlanComptableImportException.class)
                .hasMessageContaining("Doublon");
        // rollback : rien n'a ete persiste
        assertThat(sauvegardes).isEmpty();
    }

    @Test
    void ac03_ligne_avec_champ_obligatoire_manquant_est_rejetee_import_poursuivi() {
        String csv = "Numero_compte;Intitule;Classe;Niveau;Observation\n"
                + "401;Fournisseurs;4;3;\n"
                + "411;;4;3;\n"          // intitule manquant
                + "512;Banques;5;3;\n";

        PlanComptableImportResult resultat = service.importFromCsv(new StringReader(csv));

        assertThat(resultat.getImportes()).isEqualTo(2);
        assertThat(resultat.getRejetes()).isEqualTo(1);
        assertThat(resultat.getErreurs()).anyMatch(e -> e.contains("champ obligatoire manquant"));
    }

    @Test
    void ac04_incoherence_classe_numero_est_rejetee() {
        String csv = "Numero_compte;Intitule;Classe;Niveau;Observation\n"
                + "412;Clients;5;3;\n";   // classe 5 mais numero commence par 4

        PlanComptableImportResult resultat = service.importFromCsv(new StringReader(csv));

        assertThat(resultat.getImportes()).isZero();
        assertThat(resultat.getErreurs()).anyMatch(e -> e.contains("Incoherence classe/numero"));
    }

    @Test
    void ac05_les_libelles_sont_reaccentues() throws Exception {
        importerCsvReel();
        Map<String, CompteComptable> comptes = parNumero();

        assertThat(comptes.get("106").getIntitule()).isEqualTo("Réserves");
        assertThat(comptes.get("44").getIntitule()).isEqualTo("État et autres collectivités publiques");
        assertThat(comptes.get("164").getIntitule())
                .isEqualTo("Emprunts auprès des établissements de crédit");
    }

    @Test
    void ac06_observation_vide_stockee_null() throws Exception {
        importerCsvReel();
        Map<String, CompteComptable> comptes = parNumero();

        assertThat(comptes.get("401").getObservation()).isNull();
    }

    @Test
    void ac07_les_niveaux_sont_compris_entre_1_et_5() throws Exception {
        importerCsvReel();

        assertThat(sauvegardes).allSatisfy(c ->
                assertThat(c.getNiveau()).isBetween(1, 5));
    }

    @Test
    void ac08_les_classes_distinctes_sont_1_a_8() throws Exception {
        importerCsvReel();

        assertThat(sauvegardes).extracting(CompteComptable::getClasse)
                .containsOnly(1, 2, 3, 4, 5, 6, 7, 8);
        java.util.Set<Integer> classesDistinctes = sauvegardes.stream()
                .map(CompteComptable::getClasse).collect(Collectors.toSet());
        assertThat(classesDistinctes).containsExactlyInAnyOrder(1, 2, 3, 4, 5, 6, 7, 8);
    }

    @Test
    void ac09_compte_79_supprime_par_anc_2022_06() throws Exception {
        importerCsvReel();
        CompteComptable compte79 = parNumero().get("79");

        assertThat(compte79.getStatut()).isEqualTo(CompteStatut.SUPPRIME);
        assertThat(compte79.getObservation()).contains("SUPPRIME par le règlement ANC 2022-06");
    }

    @Test
    void ac10_comptes_crees_649_et_7587_actifs_avec_observation() throws Exception {
        importerCsvReel();
        Map<String, CompteComptable> comptes = parNumero();

        assertThat(comptes.get("649").getStatut()).isEqualTo(CompteStatut.ACTIF);
        assertThat(comptes.get("649").getObservation()).isNotNull();
        assertThat(comptes.get("7587").getStatut()).isEqualTo(CompteStatut.ACTIF);
        assertThat(comptes.get("7587").getObservation()).isNotNull();
    }
}
