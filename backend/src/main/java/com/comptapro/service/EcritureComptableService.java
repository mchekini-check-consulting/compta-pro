package com.comptapro.service;

import com.comptapro.dto.CreateEcritureRequest;
import com.comptapro.dto.EcritureResponse;
import com.comptapro.dto.LigneEcritureRequest;
import com.comptapro.dto.NextNumeroResponse;
import com.comptapro.model.Client;
import com.comptapro.model.CompteComptable;
import com.comptapro.model.EcritureComptable;
import com.comptapro.model.EcritureStatut;
import com.comptapro.model.LigneEcriture;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.CompteComptableRepository;
import com.comptapro.repository.EcritureComptableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Saisie et consultation des ecritures comptables d'un dossier.
 */
@Service
@RequiredArgsConstructor
public class EcritureComptableService {

    /**
     * RG-009 : libelle libre. Lettres accentuees, chiffres et ponctuation
     * comptable (/ ' - , . etc.) sont autorises ; seuls tab et retour-ligne
     * sont interdits (delimiteurs du FEC, par ailleurs assainis a l'export).
     */
    private static final Pattern LIBELLE_VALIDE = Pattern.compile("^[^\\t\\r\\n]+$");

    private final EcritureComptableRepository ecritureRepository;
    private final ClientRepository clientRepository;
    private final CompteComptableRepository compteRepository;
    private final JournalCodeResolver journalCodeResolver;

    @Transactional(readOnly = true)
    public List<EcritureResponse> getEcrituresByClient(Long accountantId, Long clientId) {
        // Verifie l'appartenance du dossier au cabinet connecte.
        getClientOrThrow(accountantId, clientId);
        return ecritureRepository.findByClientIdOrderByDateEcritureDescIdDesc(clientId)
                .stream()
                .map(EcritureResponse::fromEntity)
                .toList();
    }

    /**
     * Apercu du numero d'operation pour le premier compte saisi (RG-003/RG-006).
     * La date est facultative : l'annee de sequence est celle de la date si
     * fournie, sinon l'annee courante.
     */
    @Transactional(readOnly = true)
    public NextNumeroResponse previewNumero(Long accountantId, Long clientId,
                                            String numeroCompte, LocalDate date) {
        getClientOrThrow(accountantId, clientId);
        String codeJournal = journalCodeResolver.resolve(numeroCompte);
        int annee = (date != null ? date.getYear() : Year.now().getValue());
        int prochainRang = ecritureRepository.findMaxSequence(clientId, codeJournal, annee) + 1;
        return NextNumeroResponse.builder()
                .codeJournal(codeJournal)
                .numeroOperation(formatNumero(codeJournal, annee, prochainRang))
                .build();
    }

    @Transactional
    public EcritureResponse createBrouillon(Long accountantId, CreateEcritureRequest request) {
        Client client = getClientOrThrow(accountantId, request.getClientId());

        // RG-002 : la date doit appartenir a l'exercice ouvert du dossier.
        LocalDate date = request.getDate();
        if (date.isBefore(client.getDateDebutExercice()) || date.isAfter(client.getDateFinExercice())) {
            throw new IllegalArgumentException("La date doit appartenir a l'exercice en cours");
        }

        List<LigneEcritureRequest> lignes = request.getLignes();
        validateLignes(lignes);

        // RG-006 : le code journal est determine par la classe du premier compte.
        String codeJournal = journalCodeResolver.resolve(lignes.get(0).getNumeroCompte());
        int annee = date.getYear();
        int rang = ecritureRepository.findMaxSequence(client.getId(), codeJournal, annee) + 1;

        EcritureComptable ecriture = EcritureComptable.builder()
                .client(client)
                .dateEcriture(date)
                .codeJournal(codeJournal)
                .numeroOperation(formatNumero(codeJournal, annee, rang))
                .anneeSequence(annee)
                .numeroSequence(rang)
                .statut(EcritureStatut.BROUILLON)
                .build();

        int ordre = 0;
        for (LigneEcritureRequest l : lignes) {
            CompteComptable compte = compteRepository.findById(l.getNumeroCompte())
                    .orElseThrow(() -> new IllegalArgumentException(
                            "Compte introuvable dans le plan comptable : " + l.getNumeroCompte()));
            ecriture.addLigne(LigneEcriture.builder()
                    .numeroCompte(compte.getNumeroCompte())
                    .libelleCompte(compte.getIntitule())
                    .libelle(l.getLibelle().trim())
                    .debit(normalize(l.getDebit()))
                    .credit(normalize(l.getCredit()))
                    .ordre(ordre++)
                    .build());
        }

        EcritureComptable saved = ecritureRepository.save(ecriture);
        return EcritureResponse.fromEntity(saved);
    }

    // --- Validation ---

    private void validateLignes(List<LigneEcritureRequest> lignes) {
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;

        for (LigneEcritureRequest l : lignes) {
            // RG-009 : libelle obligatoire (tab/retour-ligne interdits).
            String libelle = l.getLibelle() != null ? l.getLibelle().trim() : "";
            if (libelle.isEmpty() || !LIBELLE_VALIDE.matcher(libelle).matches()) {
                throw new IllegalArgumentException(
                        "Le libelle de ligne est obligatoire");
            }

            BigDecimal debit = l.getDebit();
            BigDecimal credit = l.getCredit();

            // RG-012 : valeurs negatives interdites.
            if ((debit != null && debit.signum() < 0) || (credit != null && credit.signum() < 0)) {
                throw new IllegalArgumentException("Le montant doit etre une valeur positive");
            }

            boolean debitRenseigne = debit != null && debit.signum() > 0;
            boolean creditRenseigne = credit != null && credit.signum() > 0;

            // RG-010 : pas de debit ET credit simultanement.
            if (debitRenseigne && creditRenseigne) {
                throw new IllegalArgumentException(
                        "Une ligne ne peut pas avoir un debit et un credit simultanement");
            }
            // Chaque ligne doit porter un montant.
            if (!debitRenseigne && !creditRenseigne) {
                throw new IllegalArgumentException(
                        "Chaque ligne doit comporter un montant positif au debit ou au credit");
            }

            if (debitRenseigne) {
                totalDebit = totalDebit.add(debit);
            } else {
                totalCredit = totalCredit.add(credit);
            }
        }

        // RG-013/RG-014 : l'ecriture doit etre equilibree (et non nulle).
        if (totalDebit.signum() == 0 || totalDebit.compareTo(totalCredit) != 0) {
            throw new IllegalArgumentException(
                    "L'ecriture doit etre equilibree : total debit = total credit");
        }
    }

    // --- Helpers ---

    private Client getClientOrThrow(Long accountantId, Long clientId) {
        return clientRepository.findByIdAndAccountantId(clientId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));
    }

    private String formatNumero(String codeJournal, int annee, int rang) {
        return String.format("%s-%d-%05d", codeJournal, annee, rang);
    }

    /** Normalise un montant a 2 decimales ; null si absent ou nul. */
    private BigDecimal normalize(BigDecimal montant) {
        if (montant == null || montant.signum() == 0) {
            return null;
        }
        return montant.setScale(2, java.math.RoundingMode.HALF_UP);
    }
}
