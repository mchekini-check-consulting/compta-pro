package com.comptapro.service;

import com.comptapro.dto.GrandLivreCompteResponse;
import com.comptapro.dto.GrandLivreMouvementResponse;
import com.comptapro.dto.GrandLivreResponse;
import com.comptapro.model.EcritureComptable;
import com.comptapro.model.LigneEcriture;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.EcritureComptableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Construction du grand livre d'un dossier : regroupement des lignes d'ecriture
 * par compte, en ordre chronologique, avec solde cumule et totaux.
 */
@Service
@RequiredArgsConstructor
public class GrandLivreService {

    private final EcritureComptableRepository ecritureRepository;
    private final ClientRepository clientRepository;

    @Transactional(readOnly = true)
    public GrandLivreResponse getGrandLivre(Long accountantId, Long clientId) {
        // Cloisonnement : verifie l'appartenance du dossier au cabinet connecte.
        clientRepository.findByIdAndAccountantId(clientId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));

        List<EcritureComptable> ecritures =
                ecritureRepository.findByClientIdOrderByDateEcritureAscIdAsc(clientId);

        // Regroupe les mouvements par compte en conservant l'ordre d'apparition.
        Map<String, CompteAccumulator> parCompte = new LinkedHashMap<>();
        for (EcritureComptable ecriture : ecritures) {
            for (LigneEcriture ligne : ecriture.getLignes()) {
                CompteAccumulator acc = parCompte.computeIfAbsent(
                        ligne.getNumeroCompte(),
                        k -> new CompteAccumulator(ligne.getNumeroCompte(), ligne.getLibelleCompte()));
                acc.add(ecriture, ligne);
            }
        }

        // Trie les comptes par numero croissant.
        List<GrandLivreCompteResponse> comptes = parCompte.values().stream()
                .sorted((a, b) -> a.numeroCompte.compareTo(b.numeroCompte))
                .map(CompteAccumulator::toResponse)
                .toList();

        BigDecimal totalDebit = comptes.stream()
                .map(GrandLivreCompteResponse::getTotalDebit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal totalCredit = comptes.stream()
                .map(GrandLivreCompteResponse::getTotalCredit)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return GrandLivreResponse.builder()
                .clientId(clientId)
                .comptes(comptes)
                .totalDebit(totalDebit)
                .totalCredit(totalCredit)
                .build();
    }

    /** Accumulateur de mouvements pour un compte (solde cumule + totaux). */
    private static final class CompteAccumulator {
        private final String numeroCompte;
        private final String libelleCompte;
        private final List<GrandLivreMouvementResponse> mouvements = new ArrayList<>();
        private BigDecimal totalDebit = BigDecimal.ZERO;
        private BigDecimal totalCredit = BigDecimal.ZERO;
        private BigDecimal solde = BigDecimal.ZERO;

        CompteAccumulator(String numeroCompte, String libelleCompte) {
            this.numeroCompte = numeroCompte;
            this.libelleCompte = libelleCompte;
        }

        void add(EcritureComptable ecriture, LigneEcriture ligne) {
            BigDecimal debit = ligne.getDebit() != null ? ligne.getDebit() : BigDecimal.ZERO;
            BigDecimal credit = ligne.getCredit() != null ? ligne.getCredit() : BigDecimal.ZERO;
            totalDebit = totalDebit.add(debit);
            totalCredit = totalCredit.add(credit);
            solde = solde.add(debit).subtract(credit);

            mouvements.add(GrandLivreMouvementResponse.builder()
                    .date(ecriture.getDateEcriture())
                    .codeJournal(ecriture.getCodeJournal())
                    .numeroOperation(ecriture.getNumeroOperation())
                    .libelle(ligne.getLibelle())
                    .debit(ligne.getDebit())
                    .credit(ligne.getCredit())
                    .solde(solde)
                    .build());
        }

        GrandLivreCompteResponse toResponse() {
            return GrandLivreCompteResponse.builder()
                    .numeroCompte(numeroCompte)
                    .libelleCompte(libelleCompte)
                    .mouvements(mouvements)
                    .totalDebit(totalDebit)
                    .totalCredit(totalCredit)
                    .solde(solde)
                    .build();
        }
    }
}
