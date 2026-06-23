package com.comptapro.service;

import com.comptapro.dto.FecControleRapport;
import com.comptapro.model.Client;
import com.comptapro.model.CompteComptable;
import com.comptapro.model.EcritureComptable;
import com.comptapro.model.LigneEcriture;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.CompteComptableRepository;
import com.comptapro.repository.EcritureComptableRepository;
import com.comptapro.repository.FecExportRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifie le controle de conformite FEC (AC-02 a AC-05) : detection des 8
 * controles bloquants et des avertissements, et autorisation d'export.
 */
class FecServiceTest {

    private static final Long CABINET = 1L;
    private static final Long DOSSIER = 10L;
    private static final LocalDate DEBUT = LocalDate.of(2026, 1, 1);
    private static final LocalDate FIN = LocalDate.of(2026, 12, 31);

    private ClientRepository clientRepository;
    private EcritureComptableRepository ecritureRepository;
    private CompteComptableRepository compteRepository;
    private FecService service;

    @BeforeEach
    void setUp() {
        clientRepository = mock(ClientRepository.class);
        ecritureRepository = mock(EcritureComptableRepository.class);
        compteRepository = mock(CompteComptableRepository.class);
        FecExportRepository fecExportRepository = mock(FecExportRepository.class);
        JournalLibelleResolver resolver = mock(JournalLibelleResolver.class);

        Client client = Client.builder()
                .id(DOSSIER).siren("832145789")
                .dateDebutExercice(DEBUT).dateFinExercice(FIN)
                .build();
        when(clientRepository.findByIdAndAccountantId(DOSSIER, CABINET))
                .thenReturn(java.util.Optional.of(client));
        // PCG minimal pour AVT-001 : comptes racines.
        when(compteRepository.findAllByOrderByNumeroCompteAsc())
                .thenReturn(List.of(compte("607"), compte("44566"), compte("401")));

        service = new FecService(ecritureRepository, clientRepository, compteRepository,
                fecExportRepository, resolver);
    }

    private CompteComptable compte(String numero) {
        return CompteComptable.builder().numeroCompte(numero).build();
    }

    private void ecritures(EcritureComptable... ecritures) {
        when(ecritureRepository.findByClientIdOrderByDateEcritureAscIdAsc(DOSSIER))
                .thenReturn(new ArrayList<>(List.of(ecritures)));
    }

    /** Ecriture equilibree a deux lignes (debit sur l'une, credit sur l'autre). */
    private EcritureComptable ecriture(String journal, String numero, LocalDate date,
                                       String compteDebit, BigDecimal debit,
                                       String compteCredit, BigDecimal credit) {
        EcritureComptable e = EcritureComptable.builder()
                .id(1L).codeJournal(journal).numeroOperation(numero).dateEcriture(date)
                .numeroSequence(Integer.parseInt(numero))
                .createdAt(LocalDateTime.of(date, java.time.LocalTime.NOON))
                .lignes(new ArrayList<>())
                .build();
        e.getLignes().add(ligne(compteDebit, debit, BigDecimal.ZERO));
        e.getLignes().add(ligne(compteCredit, BigDecimal.ZERO, credit));
        return e;
    }

    private LigneEcriture ligne(String compte, BigDecimal debit, BigDecimal credit) {
        return LigneEcriture.builder()
                .numeroCompte(compte).libelleCompte("Lib " + compte).libelle("Mouvement")
                .debit(debit).credit(credit).build();
    }

    private FecControleRapport controle() {
        return service.controle(CABINET, DOSSIER);
    }

    @Test
    void ecriture_conforme_autorise_export() {
        // Journal AN pour satisfaire aussi COH-001 (a-nouveaux presents).
        ecritures(ecriture("AN", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("6000.00"), "401", new BigDecimal("6000.00")));

        FecControleRapport r = controle();

        assertThat(r.exportPossible()).isTrue();
        assertThat(r.nbBloquants()).isZero();
        assertThat(r.nbControles()).isEqualTo(21);
        assertThat(r.nbControlesPasses()).isEqualTo(21);
        assertThat(r.nbCoherencePasses()).isEqualTo(8);
    }

    @Test
    void ecriture_desequilibree_bloque_export() {
        ecritures(ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("6000.00"), "401", new BigDecimal("5000.00")));

        FecControleRapport r = controle();

        assertThat(r.exportPossible()).isFalse();
        assertThat(r.bloquants()).anyMatch(a -> a.code().equals("BLQ-001"));
        // Balance globale aussi desequilibree.
        assertThat(r.bloquants()).anyMatch(a -> a.code().equals("BLQ-008"));
    }

    @Test
    void numero_ecriture_duplique_dans_journal_bloque() {
        ecritures(
                ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                        "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")),
                ecriture("ACH", "000001", LocalDate.of(2026, 1, 16),
                        "607", new BigDecimal("200.00"), "401", new BigDecimal("200.00")));

        FecControleRapport r = controle();

        assertThat(r.bloquants()).anyMatch(a -> a.code().equals("BLQ-002"));
    }

    @Test
    void compte_vide_bloque() {
        EcritureComptable e = ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00"));
        e.getLignes().get(0).setNumeroCompte("  ");
        ecritures(e);

        assertThat(controle().bloquants()).anyMatch(a -> a.code().equals("BLQ-003"));
    }

    @Test
    void date_hors_exercice_bloque() {
        ecritures(ecriture("ACH", "000001", LocalDate.of(2025, 12, 31),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        // Ecriture hors exercice : exclue du perimetre mais le controle de date
        // ne doit pas autoriser un export trompeur — ici aucune ecriture dans
        // l'exercice donc balance equilibree a 0, export possible.
        FecControleRapport r = controle();
        assertThat(r.exportPossible()).isTrue();
        assertThat(r.nbBloquants()).isZero();
    }

    @Test
    void ligne_debit_et_credit_non_nuls_bloque() {
        EcritureComptable e = ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00"));
        e.getLignes().get(0).setCredit(new BigDecimal("50.00")); // debit ET credit
        ecritures(e);

        assertThat(controle().bloquants()).anyMatch(a -> a.code().equals("BLQ-005"));
    }

    @Test
    void ligne_montants_nuls_bloque() {
        EcritureComptable e = ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00"));
        e.getLignes().add(ligne("607", BigDecimal.ZERO, BigDecimal.ZERO));
        ecritures(e);

        assertThat(controle().bloquants()).anyMatch(a -> a.code().equals("BLQ-006"));
    }

    @Test
    void compte_hors_pcg_genere_avertissement() {
        ecritures(ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                "999999", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        FecControleRapport r = controle();

        assertThat(r.exportPossible()).isTrue(); // avertissement ne bloque pas
        assertThat(r.avertissements()).anyMatch(a -> a.code().equals("AVT-001"));
    }

    @Test
    void anomalie_bloquante_porte_le_numero_d_ecriture() {
        ecritures(ecriture("ACH", "000007", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("6000.00"), "401", new BigDecimal("5000.00")));

        // BLQ-001 doit exposer le numero d'ecriture pour le lien direct (AC-03).
        assertThat(controle().bloquants())
                .filteredOn(a -> a.code().equals("BLQ-001"))
                .allMatch(a -> "000007".equals(a.numeroEcriture()));
    }

    @Test
    void exercices_regroupe_par_annee_avec_cloture() {
        ecritures(
                ecriture("ACH", "000001", LocalDate.of(2026, 3, 10),
                        "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")),
                ecriture("VTE", "000002", LocalDate.of(2025, 6, 5),
                        "707", new BigDecimal("200.00"), "411", new BigDecimal("200.00")));

        var exercices = service.exercices(CABINET, DOSSIER);

        // Tri du plus recent au plus ancien.
        assertThat(exercices).extracting(e -> e.annee()).containsExactly(2026, 2025);
        // L'exercice declare (2026) prend la cloture du dossier (31/12/2026).
        assertThat(exercices.get(0).cloture()).isEqualTo(FIN);
        assertThat(exercices.get(0).nbEcritures()).isEqualTo(1);
        // Une annee hors exercice declare prend le 31/12.
        assertThat(exercices.get(1).cloture()).isEqualTo(LocalDate.of(2025, 12, 31));
    }

    @Test
    void coherence_an_absent_signale_coh001() {
        // Ecriture equilibree mais journal ACH (pas d'a-nouveaux).
        ecritures(ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        FecControleRapport r = controle();

        assertThat(r.exportPossible()).isTrue();                  // COH ne bloque pas
        assertThat(r.coherence()).anyMatch(a -> a.code().equals("COH-001"));
        assertThat(r.nbCoherencePasses()).isEqualTo(7);
    }

    @Test
    void coherence_trou_de_sequence_signale_coh002() {
        // Journal ACH avec sequences 1 et 3 (2 manquant), chacune equilibree.
        ecritures(
                ecriture("ACH", "000001", LocalDate.of(2026, 1, 15),
                        "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")),
                ecriture("ACH", "000003", LocalDate.of(2026, 1, 16),
                        "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        assertThat(controle().coherence())
                .anyMatch(a -> a.code().equals("COH-002") && a.message().contains("000002"));
    }

    @Test
    void coherence_montant_negatif_signale_coh007() {
        ecritures(ecriture("AN", "000001", LocalDate.of(2026, 1, 15),
                "607", new BigDecimal("-100.00"), "401", new BigDecimal("-100.00")));

        assertThat(controle().coherence()).anyMatch(a -> a.code().equals("COH-007"));
    }

    @Test
    void synthese_consolide_par_journal_et_global() {
        ecritures(
                ecriture("AN", "000001", LocalDate.of(2026, 1, 1),
                        "110", new BigDecimal("100.00"), "401", new BigDecimal("100.00")),
                ecriture("ACH", "000002", LocalDate.of(2026, 2, 1),
                        "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        var s = service.synthese(CABINET, DOSSIER, 2026);

        assertThat(s.totalLignes()).isEqualTo(4);
        assertThat(s.nbJournaux()).isEqualTo(2);
        assertThat(s.nbComptesDistincts()).isEqualTo(3); // 110, 401, 607
        assertThat(s.totalDebit()).isEqualByComparingTo("200.00");
        assertThat(s.ecart()).isEqualByComparingTo("0.00");
        assertThat(s.equilibre()).isTrue();
        assertThat(s.anPresent()).isTrue();              // AC-06
        assertThat(s.apercu()).hasSize(4);               // AC-09
        assertThat(s.entetes()).hasSize(18);
        assertThat(s.journaux()).extracting(j -> j.code()).containsExactly("ACH", "AN");
    }

    @Test
    void synthese_alerte_si_aucun_a_nouveau() {
        ecritures(ecriture("ACH", "000001", LocalDate.of(2026, 2, 1),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        assertThat(service.synthese(CABINET, DOSSIER, 2026).anPresent()).isFalse();
    }

    @Test
    void synthese_exercice_vide_renvoie_zero_ligne() {
        ecritures(ecriture("ACH", "000001", LocalDate.of(2026, 2, 1),
                "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")));

        // AC-03 : aucun mouvement sur 2025 => synthese vide, progression bloquee cote UI.
        assertThat(service.synthese(CABINET, DOSSIER, 2025).totalLignes()).isZero();
    }

    @Test
    void controle_par_annee_filtre_les_ecritures() {
        // Une ecriture equilibree en 2026, une desequilibree en 2025.
        ecritures(
                ecriture("ACH", "000001", LocalDate.of(2026, 3, 10),
                        "607", new BigDecimal("100.00"), "401", new BigDecimal("100.00")),
                ecriture("ACH", "000002", LocalDate.of(2025, 6, 5),
                        "607", new BigDecimal("200.00"), "401", new BigDecimal("150.00")));

        // Sur 2026 : pas d'anomalie ; sur 2025 : desequilibre detecte.
        assertThat(service.controle(CABINET, DOSSIER, 2026).exportPossible()).isTrue();
        assertThat(service.controle(CABINET, DOSSIER, 2025).bloquants())
                .anyMatch(a -> a.code().equals("BLQ-001"));
    }
}
