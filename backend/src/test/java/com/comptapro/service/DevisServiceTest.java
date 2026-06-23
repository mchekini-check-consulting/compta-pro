package com.comptapro.service;

import com.comptapro.dto.CreateDevisRequest;
import com.comptapro.dto.DevisResponse;
import com.comptapro.dto.LigneDevisRequest;
import com.comptapro.model.Accountant;
import com.comptapro.model.Client;
import com.comptapro.model.Devis;
import com.comptapro.model.StatutDevis;
import com.comptapro.repository.AccountantRepository;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.DevisRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * Verifie la creation, le calcul des totaux/acompte (AC-07/AC-08), la
 * numerotation (AC-01) et l'expiration automatique (AC-03) des devis.
 */
class DevisServiceTest {

    private static final Long CABINET = 1L;
    private static final Long DOSSIER = 10L;

    private DevisRepository devisRepository;
    private ClientRepository clientRepository;
    private AccountantRepository accountantRepository;
    private DevisService service;

    @BeforeEach
    void setUp() {
        devisRepository = mock(DevisRepository.class);
        clientRepository = mock(ClientRepository.class);
        accountantRepository = mock(AccountantRepository.class);

        Client client = Client.builder().id(DOSSIER).raisonSociale("Boulangerie Alpha")
                .siren("832145789").build();
        when(clientRepository.findByIdAndAccountantId(DOSSIER, CABINET))
                .thenReturn(Optional.of(client));
        when(accountantRepository.findById(CABINET)).thenReturn(Optional.of(
                Accountant.builder().id(CABINET).cabinetName("Cabinet Trezzo")
                        .address("1 rue des Comptes").siren("123456789")
                        .email("contact@trezzo.fr").phone("0102030405").build()));
        when(devisRepository.findMaxSequence(eq(CABINET), anyInt())).thenReturn(41);
        when(devisRepository.save(any(Devis.class))).thenAnswer(inv -> inv.getArgument(0));

        service = new DevisService(devisRepository, clientRepository, accountantRepository);
    }

    private LigneDevisRequest ligne(String designation, String qte, String pu, String tva) {
        return new LigneDevisRequest(designation, null, new BigDecimal(qte),
                new BigDecimal(pu), new BigDecimal(tva));
    }

    private CreateDevisRequest requete(List<LigneDevisRequest> lignes) {
        CreateDevisRequest r = new CreateDevisRequest();
        r.setClientId(DOSSIER);
        r.setLignes(lignes);
        return r;
    }

    @Test
    void create_numerote_et_snapshot_emetteur_destinataire() {
        DevisResponse r = service.create(CABINET,
                requete(List.of(ligne("Prestation", "1", "1000.00", "20"))));

        assertThat(r.numero()).isEqualTo(String.format("DEV-%d-0042", Year.now().getValue()));
        assertThat(r.statut()).isEqualTo(StatutDevis.BROUILLON);
        assertThat(r.emetteur().raisonSociale()).isEqualTo("Cabinet Trezzo");
        assertThat(r.destinataire().raisonSociale()).isEqualTo("Boulangerie Alpha");
        // Validite par defaut = emission + 30 jours (RG-002).
        assertThat(r.dateValidite()).isEqualTo(r.dateEmission().plusDays(30));
    }

    @Test
    void create_calcule_totaux_et_acompte() {
        CreateDevisRequest req = requete(List.of(ligne("Audit", "1", "12520.00", "20")));
        req.setAcompteActif(true);
        req.setAcompteTaux(new BigDecimal("30"));

        DevisResponse r = service.create(CABINET, req);

        assertThat(r.totalHT()).isEqualByComparingTo("12520.00");
        assertThat(r.totalTVA()).isEqualByComparingTo("2504.00");
        assertThat(r.totalTTC()).isEqualByComparingTo("15024.00");
        // RG-003 : acompte sur le TTC.
        assertThat(r.acompteMontant()).isEqualByComparingTo("4507.20");
    }

    @Test
    void create_additionne_tva_par_ligne() {
        DevisResponse r = service.create(CABINET, requete(List.of(
                ligne("Conseil", "2", "100.00", "20"),     // HT 200 · TVA 40
                ligne("Formation", "1", "100.00", "5.5")))); // HT 100 · TVA 5.50

        assertThat(r.totalHT()).isEqualByComparingTo("300.00");
        assertThat(r.totalTVA()).isEqualByComparingTo("45.50");
        assertThat(r.totalTTC()).isEqualByComparingTo("345.50");
    }

    @Test
    void create_refuse_taux_tva_non_autorise() {
        assertThatThrownBy(() -> service.create(CABINET,
                requete(List.of(ligne("X", "1", "100.00", "7")))))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Taux de TVA non autorise");
    }

    @Test
    void create_refuse_acompte_actif_sans_taux() {
        CreateDevisRequest req = requete(List.of(ligne("X", "1", "100.00", "20")));
        req.setAcompteActif(true);

        assertThatThrownBy(() -> service.create(CABINET, req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("acompte");
    }

    @Test
    void update_refuse_devis_signe() {
        Devis signe = Devis.builder().id(5L).accountantId(CABINET).statut(StatutDevis.SIGNE).build();
        when(devisRepository.findByIdAndAccountantId(5L, CABINET)).thenReturn(Optional.of(signe));

        assertThatThrownBy(() -> service.update(CABINET, 5L,
                requete(List.of(ligne("X", "1", "100.00", "20")))))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void expirer_devis_echus_passe_au_statut_expire() {
        Devis d1 = Devis.builder().id(1L).statut(StatutDevis.ENVOYE).build();
        Devis d2 = Devis.builder().id(2L).statut(StatutDevis.EN_ATTENTE_SIGNATURE).build();
        when(devisRepository.findExpirables(anyList(), any(LocalDate.class)))
                .thenReturn(List.of(d1, d2));
        when(devisRepository.saveAll(anyList())).thenAnswer(inv -> inv.getArgument(0));

        int expires = service.expirerDevisEchus(LocalDate.of(2026, 6, 22));

        assertThat(expires).isEqualTo(2);
        assertThat(d1.getStatut()).isEqualTo(StatutDevis.EXPIRE);
        assertThat(d2.getStatut()).isEqualTo(StatutDevis.EXPIRE);
    }
}
