package com.comptapro.service;

import com.comptapro.model.Client;
import com.comptapro.model.EcritureComptable;
import com.comptapro.model.LigneEcriture;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.EcritureComptableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Generation du Fichier des Ecritures Comptables (FEC) d'un dossier au format
 * normalise DGFiP : 18 colonnes separees par tabulation, une ligne d'en-tete
 * puis une ligne par mouvement (ligne d'ecriture).
 */
@Service
@RequiredArgsConstructor
public class FecService {

    private static final DateTimeFormatter FEC_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final char SEP = '\t';

    private static final String ENTETE = String.join("\t",
            "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum",
            "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate",
            "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet",
            "ValidDate", "Montantdevise", "Idevise");

    private final EcritureComptableRepository ecritureRepository;
    private final ClientRepository clientRepository;
    private final JournalLibelleResolver journalLibelleResolver;

    /** Fichier FEC pret a etre telecharge (nom normalise + contenu texte). */
    public record FecFile(String filename, String content) {}

    @Transactional(readOnly = true)
    public FecFile generate(Long accountantId, Long clientId) {
        Client client = clientRepository.findByIdAndAccountantId(clientId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));

        List<EcritureComptable> ecritures =
                ecritureRepository.findByClientIdOrderByDateEcritureAscIdAsc(clientId);

        StringBuilder sb = new StringBuilder(ENTETE).append('\n');
        for (EcritureComptable e : ecritures) {
            String journalLib = journalLibelleResolver.libelle(e.getCodeJournal());
            String ecritureDate = e.getDateEcriture().format(FEC_DATE);
            String validDate = e.getCreatedAt() != null
                    ? e.getCreatedAt().toLocalDate().format(FEC_DATE) : ecritureDate;

            for (LigneEcriture l : e.getLignes()) {
                sb.append(champ(e.getCodeJournal())).append(SEP)
                  .append(champ(journalLib)).append(SEP)
                  .append(champ(e.getNumeroOperation())).append(SEP)
                  .append(ecritureDate).append(SEP)
                  .append(champ(l.getNumeroCompte())).append(SEP)
                  .append(champ(l.getLibelleCompte())).append(SEP)
                  .append("").append(SEP)               // CompAuxNum
                  .append("").append(SEP)               // CompAuxLib
                  .append(champ(e.getNumeroOperation())).append(SEP) // PieceRef
                  .append(ecritureDate).append(SEP)      // PieceDate
                  .append(champ(l.getLibelle())).append(SEP)
                  .append(montant(l.getDebit())).append(SEP)
                  .append(montant(l.getCredit())).append(SEP)
                  .append("").append(SEP)               // EcritureLet
                  .append("").append(SEP)               // DateLet
                  .append(validDate).append(SEP)
                  .append("").append(SEP)               // Montantdevise
                  .append("")                            // Idevise
                  .append('\n');
            }
        }

        String cloture = client.getDateFinExercice() != null
                ? client.getDateFinExercice().format(FEC_DATE)
                : LocalDate.now().format(FEC_DATE);
        String filename = client.getSiren() + "FEC" + cloture + ".txt";

        return new FecFile(filename, sb.toString());
    }

    /** Montant FEC : 2 decimales, separateur decimal virgule ; 0,00 si absent. */
    private String montant(BigDecimal montant) {
        BigDecimal valeur = montant != null ? montant : BigDecimal.ZERO;
        return valeur.setScale(2, java.math.RoundingMode.HALF_UP)
                .toPlainString().replace('.', ',');
    }

    /** Neutralise les caracteres qui casseraient le format tabule. */
    private String champ(String valeur) {
        if (valeur == null) {
            return "";
        }
        return valeur.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
    }
}
