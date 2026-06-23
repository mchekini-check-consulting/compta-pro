
package com.comptapro.service;

import com.comptapro.dto.FecControleRapport;
import com.comptapro.dto.FecControleRapport.Anomalie;
import com.comptapro.dto.FecExerciceResume;
import com.comptapro.dto.FecExportResume;
import com.comptapro.dto.FecSynthese;
import com.comptapro.model.Client;
import com.comptapro.model.CompteComptable;
import com.comptapro.model.EcritureComptable;
import com.comptapro.model.FecExport;
import com.comptapro.model.LigneEcriture;
import com.comptapro.model.StatutExportFec;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.CompteComptableRepository;
import com.comptapro.repository.EcritureComptableRepository;
import com.comptapro.repository.FecExportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.stream.Collectors;

/**
 * Generation du Fichier des Ecritures Comptables (FEC) d'un dossier au format
 * normalise DGFiP : 18 colonnes separees par tabulation, une ligne d'en-tete
 * puis une ligne par mouvement (ligne d'ecriture).
 *
 * <p>Le service execute aussi le controle qualite prealable des 21 regles DGFiP
 * (8 bloquantes + 5 avertissements + 8 coherence globale) et bloque l'export
 * tant qu'une anomalie bloquante subsiste (RG-008). Chaque export est trace
 * (FEC-004) avec ses metadonnees de conformite et son empreinte SHA-256.
 */
@Service
@RequiredArgsConstructor
public class FecService {

    private static final DateTimeFormatter FEC_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    /** Date de cloture dans le nom de fichier : JJMMAAAA (RG-006). */
    private static final DateTimeFormatter NOM_DATE = DateTimeFormatter.ofPattern("ddMMyyyy");
    private static final char SEP = '\t';
    /** Fin de ligne reglementaire : CRLF (RG-003). */
    private static final String EOL = "\r\n";
    /** Regles evaluees : 8 bloquantes + 5 avertissements + 8 coherence globale. */
    private static final int NB_CONTROLES = 21;
    /** Nombre de controles de coherence globale (COH-001 a COH-008). */
    private static final int NB_COHERENCE = 8;

    private static final List<String> ENTETES = List.of(
            "JournalCode", "JournalLib", "EcritureNum", "EcritureDate", "CompteNum",
            "CompteLib", "CompAuxNum", "CompAuxLib", "PieceRef", "PieceDate",
            "EcritureLib", "Debit", "Credit", "EcritureLet", "DateLet",
            "ValidDate", "Montantdevise", "Idevise");
    private static final String ENTETE = String.join("\t", ENTETES);
    /** Nombre de lignes de l'apercu de collecte (AC-09). */
    private static final int APERCU_MAX = 10;

    private final EcritureComptableRepository ecritureRepository;
    private final ClientRepository clientRepository;
    private final CompteComptableRepository compteRepository;
    private final FecExportRepository fecExportRepository;
    private final JournalLibelleResolver journalLibelleResolver;

    /** Fichier FEC pret a etre telecharge (nom normalise + contenu texte). */
    public record FecFile(String filename, String content) {}

    /** Leve quand l'export est demande malgre des anomalies bloquantes (RG-008). */
    public static class FecBloquantException extends RuntimeException {
        private final transient FecControleRapport rapport;

        public FecBloquantException(FecControleRapport rapport) {
            super("Export FEC bloque : " + rapport.nbBloquants() + " anomalie(s) bloquante(s)");
            this.rapport = rapport;
        }

        public FecControleRapport getRapport() {
            return rapport;
        }
    }

    /** Exercices selectionnables du dossier avec leur volumetrie (AC-01). */
    @Transactional(readOnly = true)
    public List<FecExerciceResume> exercices(Long accountantId, Long clientId) {
        Client client = chargerDossier(accountantId, clientId);
        List<EcritureComptable> toutes =
                ecritureRepository.findByClientIdOrderByDateEcritureAscIdAsc(client.getId());

        // Regroupe par annee : nb ecritures, nb lignes, totaux Debit/Credit.
        Map<Integer, long[]> compteurs = new TreeMap<>(Comparator.reverseOrder());
        Map<Integer, BigDecimal[]> totaux = new TreeMap<>();
        for (EcritureComptable e : toutes) {
            int annee = e.getDateEcriture().getYear();
            long[] cumul = compteurs.computeIfAbsent(annee, a -> new long[2]);
            BigDecimal[] somme = totaux.computeIfAbsent(annee, a -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            cumul[0]++;
            cumul[1] += e.getLignes().size();
            for (LigneEcriture l : e.getLignes()) {
                somme[0] = somme[0].add(nz(l.getDebit()));
                somme[1] = somme[1].add(nz(l.getCredit()));
            }
        }
        // Garantit la presence de l'exercice declare meme sans ecriture.
        if (client.getDateFinExercice() != null) {
            compteurs.computeIfAbsent(client.getDateFinExercice().getYear(), a -> new long[2]);
        }

        List<FecExerciceResume> resume = new ArrayList<>();
        for (Map.Entry<Integer, long[]> en : compteurs.entrySet()) {
            int annee = en.getKey();
            BigDecimal[] somme = totaux.getOrDefault(annee, new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
            boolean equilibre = somme[0].compareTo(somme[1]) == 0;
            resume.add(new FecExerciceResume(annee, debutExercice(client, annee),
                    clotureExercice(client, annee), en.getValue()[0], en.getValue()[1], equilibre));
        }
        return resume;
    }

    /** Synthese de collecte et de consolidation d'un exercice (FEC-001). */
    @Transactional(readOnly = true)
    public FecSynthese synthese(Long accountantId, Long clientId, Integer annee) {
        Client client = chargerDossier(accountantId, clientId);
        List<EcritureComptable> ecritures = ecrituresExercice(client, annee);
        Set<String> pcg = prefixesPcg();

        Map<String, long[]> nbParJournal = new TreeMap<>();
        Map<String, BigDecimal[]> totauxParJournal = new HashMap<>();
        Set<String> comptesDistincts = new HashSet<>();
        Set<String> comptesHorsPcg = new HashSet<>();
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;
        long totalLignes = 0;
        List<List<String>> apercu = new ArrayList<>();

        for (EcritureComptable e : ecritures) {
            String code = e.getCodeJournal();
            for (LigneEcriture l : e.getLignes()) {
                BigDecimal debit = nz(l.getDebit());
                BigDecimal credit = nz(l.getCredit());
                totalDebit = totalDebit.add(debit);
                totalCredit = totalCredit.add(credit);
                totalLignes++;

                nbParJournal.computeIfAbsent(code, c -> new long[1])[0]++;
                BigDecimal[] tj = totauxParJournal.computeIfAbsent(code,
                        c -> new BigDecimal[]{BigDecimal.ZERO, BigDecimal.ZERO});
                tj[0] = tj[0].add(debit);
                tj[1] = tj[1].add(credit);

                if (!estVide(l.getNumeroCompte())) {
                    comptesDistincts.add(l.getNumeroCompte());
                    if (!pcg.isEmpty() && !dansPcg(pcg, l.getNumeroCompte())) {
                        comptesHorsPcg.add(l.getNumeroCompte());
                    }
                }
                if (apercu.size() < APERCU_MAX) {
                    apercu.add(champsFec(e, l));
                }
            }
        }

        List<FecSynthese.JournalSynthese> journaux = new ArrayList<>();
        for (Map.Entry<String, long[]> en : nbParJournal.entrySet()) {
            BigDecimal[] tj = totauxParJournal.get(en.getKey());
            journaux.add(new FecSynthese.JournalSynthese(en.getKey(),
                    journalLibelleResolver.libelle(en.getKey()), en.getValue()[0],
                    tj[0], tj[1], tj[0].compareTo(tj[1]) == 0));
        }

        int anneeRetenue = annee != null ? annee : anneeExercice(client);
        BigDecimal ecart = totalDebit.subtract(totalCredit);
        return new FecSynthese(
                anneeRetenue, debutExercice(client, anneeRetenue), clotureExercice(client, annee),
                totalLignes, nbParJournal.size(), comptesDistincts.size(),
                totalDebit, totalCredit, ecart, ecart.signum() == 0,
                nbParJournal.containsKey("AN"), comptesHorsPcg.size(),
                journaux, ENTETES, apercu);
    }

    private int anneeExercice(Client client) {
        return client.getDateFinExercice() != null
                ? client.getDateFinExercice().getYear() : LocalDate.now().getYear();
    }

    /** Controle de conformite seul, sans generer le fichier (AC-02). */
    @Transactional(readOnly = true)
    public FecControleRapport controle(Long accountantId, Long clientId) {
        return controle(accountantId, clientId, null);
    }

    /** Controle de conformite d'un exercice donne (AC-02). */
    @Transactional(readOnly = true)
    public FecControleRapport controle(Long accountantId, Long clientId, Integer annee) {
        Client client = chargerDossier(accountantId, clientId);
        return controler(client, ecrituresExercice(client, annee));
    }

    @Transactional
    public FecFile generate(Long accountantId, String utilisateur, Long clientId) {
        return generate(accountantId, utilisateur, clientId, null);
    }

    @Transactional
    public FecFile generate(Long accountantId, String utilisateur, Long clientId, Integer annee) {
        Client client = chargerDossier(accountantId, clientId);
        List<EcritureComptable> ecritures = ecrituresExercice(client, annee);

        // RG-008 : export impossible tant qu'une anomalie bloquante subsiste.
        FecControleRapport rapport = controler(client, ecritures);
        if (!rapport.exportPossible()) {
            throw new FecBloquantException(rapport);
        }

        int nbLignes = 0;
        BigDecimal sigmaDebit = BigDecimal.ZERO;
        BigDecimal sigmaCredit = BigDecimal.ZERO;
        StringBuilder sb = new StringBuilder(ENTETE).append(EOL);
        for (EcritureComptable e : ecritures) {
            for (LigneEcriture l : e.getLignes()) {
                sb.append(String.join(String.valueOf(SEP), champsFec(e, l))).append(EOL);
                sigmaDebit = sigmaDebit.add(nz(l.getDebit()));
                sigmaCredit = sigmaCredit.add(nz(l.getCredit()));
                nbLignes++;
            }
        }

        // Nom reglementaire : [SIREN][JJMMAAAA]i.txt (RG-006).
        LocalDate dateCloture = clotureExercice(client, annee);
        String filename = client.getSiren() + dateCloture.format(NOM_DATE) + "i.txt";
        String contenu = sb.toString();

        // AC-10 : exercice non cloture (fin > aujourd'hui) => export partiel.
        StatutExportFec statut = dateCloture.isAfter(LocalDate.now())
                ? StatutExportFec.PARTIEL : StatutExportFec.SUCCES;
        String avertissements = rapport.avertissements().stream()
                .map(a -> a.code() + " " + a.message())
                .collect(Collectors.joining("\n"));

        // Trace de l'export pour l'historique du dossier (FEC-004, RG-002).
        fecExportRepository.save(FecExport.builder()
                .client(client)
                .accountantId(accountantId)
                .utilisateur(utilisateur)
                .exerciceDebut(debutExercice(client, annee != null ? annee : anneeExercice(client)))
                .exerciceFin(dateCloture)
                .nbLignes(nbLignes)
                .nbBloquants(rapport.nbBloquants())
                .nbAvertissements(rapport.nbAvertissements())
                .sigmaDebit(sigmaDebit.setScale(2, RoundingMode.HALF_UP))
                .sigmaCredit(sigmaCredit.setScale(2, RoundingMode.HALF_UP))
                .statut(statut)
                .hashSha256(sha256(contenu))
                .avertissementsTexte(avertissements)
                .valideCtrlDgfip(false)
                .filename(filename)
                .contenu(contenu)
                .build());

        return new FecFile(filename, contenu);
    }

    /** Historique des exports d'un dossier, du plus recent au plus ancien (AC-04). */
    @Transactional(readOnly = true)
    public List<FecExportResume> historique(Long accountantId, Long clientId) {
        chargerDossier(accountantId, clientId);
        return fecExportRepository
                .findByClientIdAndAccountantIdOrderByCreatedAtDesc(clientId, accountantId)
                .stream().map(FecExportResume::from).toList();
    }

    /** Re-telechargement d'un export archive a l'identique (AC-05, RG-004). */
    @Transactional(readOnly = true)
    public FecFile telechargerArchive(Long accountantId, Long exportId) {
        FecExport export = fecExportRepository.findByIdAndAccountantId(exportId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Export FEC non trouve"));
        return new FecFile(export.getFilename(), export.getContenu());
    }

    /** Marque un export comme valide avec l'outil officiel CTRL-DGFIP (AC-09). */
    @Transactional
    public FecExportResume validerCtrlDgfip(Long accountantId, Long exportId) {
        FecExport export = fecExportRepository.findByIdAndAccountantId(exportId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Export FEC non trouve"));
        export.setValideCtrlDgfip(true);
        export.setDateValidationCtrl(java.time.LocalDateTime.now());
        return FecExportResume.from(fecExportRepository.save(export));
    }

    private Client chargerDossier(Long accountantId, Long clientId) {
        return clientRepository.findByIdAndAccountantId(clientId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));
    }

    /**
     * Ecritures d'un exercice. Si {@code annee} est fourni, filtre sur l'annee
     * calendaire choisie (AC-01) ; sinon, sur l'exercice declare du dossier (ou
     * toutes les ecritures a defaut de bornes). Tri RG-010.
     */
    private List<EcritureComptable> ecrituresExercice(Client client, Integer annee) {
        List<EcritureComptable> toutes =
                ecritureRepository.findByClientIdOrderByDateEcritureAscIdAsc(client.getId());
        List<EcritureComptable> exercice = new ArrayList<>();
        LocalDate debut = client.getDateDebutExercice();
        LocalDate fin = client.getDateFinExercice();
        for (EcritureComptable e : toutes) {
            LocalDate d = e.getDateEcriture();
            boolean retenu = annee != null
                    ? d.getYear() == annee
                    : (debut == null || fin == null) || (!d.isBefore(debut) && !d.isAfter(fin));
            if (retenu) {
                exercice.add(e);
            }
        }
        // RG-010 : tri par EcritureDate, puis JournalCode, puis EcritureNum (sequence).
        exercice.sort(Comparator
                .comparing(EcritureComptable::getDateEcriture)
                .thenComparing(EcritureComptable::getCodeJournal)
                .thenComparing(EcritureComptable::getNumeroSequence));
        return exercice;
    }

    /** Date de cloture de l'exercice : fin declaree si meme annee, sinon 31/12. */
    private LocalDate clotureExercice(Client client, Integer annee) {
        if (annee == null) {
            return client.getDateFinExercice() != null ? client.getDateFinExercice() : LocalDate.now();
        }
        LocalDate fin = client.getDateFinExercice();
        if (fin != null && fin.getYear() == annee) {
            return fin;
        }
        return LocalDate.of(annee, 12, 31);
    }

    /** Date de debut de l'exercice : debut declare si meme annee, sinon 01/01. */
    private LocalDate debutExercice(Client client, int annee) {
        LocalDate debut = client.getDateDebutExercice();
        if (debut != null && debut.getYear() == annee) {
            return debut;
        }
        return LocalDate.of(annee, 1, 1);
    }

    /**
     * Execute les 21 controles de conformite (8 BLQ + 5 AVT + 8 COH) sur les
     * ecritures de l'exercice et construit le rapport (FEC-002, RG-007 : ordre
     * BLQ puis AVT puis COH). La numerotation des lignes suit l'ordre d'export.
     */
    private FecControleRapport controler(Client client, List<EcritureComptable> ecritures) {
        List<Anomalie> bloquants = new ArrayList<>();
        List<Anomalie> avertissements = new ArrayList<>();
        List<Anomalie> coherence = new ArrayList<>();
        Set<String> codesEnDefaut = new TreeSet<>();

        Set<String> pcg = prefixesPcg();
        LocalDate debut = client.getDateDebutExercice();
        LocalDate fin = client.getDateFinExercice();

        Set<String> numerosVus = new HashSet<>();      // codeJournal|EcritureNum
        Map<String, Set<Integer>> sequencesParJournal = new TreeMap<>(); // COH-002
        boolean anPresent = false;                     // COH-001
        BigDecimal totalDebit = BigDecimal.ZERO;
        BigDecimal totalCredit = BigDecimal.ZERO;
        int ligne = 0;

        for (EcritureComptable e : ecritures) {
            String numero = e.getNumeroOperation();
            BigDecimal debitEcriture = BigDecimal.ZERO;
            BigDecimal creditEcriture = BigDecimal.ZERO;
            boolean a44551 = false, a44567 = false, a44566 = false, aImmo = false;
            if ("AN".equalsIgnoreCase(e.getCodeJournal())) {
                anPresent = true;
            }
            sequencesParJournal.computeIfAbsent(e.getCodeJournal(), j -> new TreeSet<>())
                    .add(e.getNumeroSequence());

            for (LigneEcriture l : e.getLignes()) {
                ligne++;
                BigDecimal debit = nz(l.getDebit());
                BigDecimal credit = nz(l.getCredit());
                totalDebit = totalDebit.add(debit);
                totalCredit = totalCredit.add(credit);
                debitEcriture = debitEcriture.add(debit);
                creditEcriture = creditEcriture.add(credit);
                String compte = l.getNumeroCompte();
                boolean mouvemente = debit.signum() != 0 || credit.signum() != 0;
                if (compte != null && mouvemente) {
                    if (compte.startsWith("44551")) a44551 = true;
                    if (compte.startsWith("44567")) a44567 = true;
                    if (compte.startsWith("44566")) a44566 = true;
                    if (compte.startsWith("2")) aImmo = true;
                }

                // BLQ-003 : CompteNum vide ou < 3 caracteres.
                if (estVide(compte) || compte.trim().length() < 3) {
                    bloquants.add(anomalie(codesEnDefaut, "BLQ-003",
                            "Numero de compte vide ou invalide (< 3 caracteres) — ligne " + ligne, ligne, e));
                }
                // BLQ-004 : EcritureDate hors exercice declare.
                if (debut != null && fin != null
                        && (e.getDateEcriture().isBefore(debut) || e.getDateEcriture().isAfter(fin))) {
                    bloquants.add(anomalie(codesEnDefaut, "BLQ-004",
                            "Date " + e.getDateEcriture().format(FEC_DATE) + " hors exercice — ligne " + ligne,
                            ligne, e));
                }
                // BLQ-005 : Debit ET Credit non nuls sur la meme ligne.
                if (debit.signum() != 0 && credit.signum() != 0) {
                    bloquants.add(anomalie(codesEnDefaut, "BLQ-005",
                            "Debit et Credit non nuls simultanement — ligne " + ligne, ligne, e));
                }
                // BLQ-006 : Debit ET Credit tous deux a 0.
                if (debit.signum() == 0 && credit.signum() == 0) {
                    bloquants.add(anomalie(codesEnDefaut, "BLQ-006",
                            "Ligne a montants nuls non autorisee — ligne " + ligne, ligne, e));
                }
                // BLQ-007 : ValidDate vide ou anterieure a la date d'ecriture.
                LocalDate validDate = e.getCreatedAt() != null ? e.getCreatedAt().toLocalDate() : null;
                if (validDate == null) {
                    bloquants.add(anomalie(codesEnDefaut, "BLQ-007",
                            "Date de validation manquante — ligne " + ligne, ligne, e));
                } else if (validDate.isBefore(e.getDateEcriture())) {
                    bloquants.add(anomalie(codesEnDefaut, "BLQ-007",
                            "Date de validation anterieure a la date d'ecriture — ligne " + ligne, ligne, e));
                }
                // AVT-001 : compte hors PCG officiel.
                if (!pcg.isEmpty() && !estVide(compte) && !dansPcg(pcg, compte)) {
                    avertissements.add(anomalie(codesEnDefaut, "AVT-001",
                            "Compte " + compte + " non reference dans le PCG — ligne " + ligne, ligne, e));
                }
                // AVT-002 : EcritureLib vide.
                if (estVide(l.getLibelle())) {
                    avertissements.add(anomalie(codesEnDefaut, "AVT-002",
                            "Libelle d'ecriture vide — ligne " + ligne, ligne, e));
                }
                // AVT-003 : PieceRef vide (la reference piece reprend l'EcritureNum).
                if (estVide(numero)) {
                    avertissements.add(anomalie(codesEnDefaut, "AVT-003",
                            "Reference piece manquante — ligne " + ligne, ligne, e));
                }
                // COH-007 : aucun montant negatif.
                if (debit.signum() < 0 || credit.signum() < 0) {
                    coherence.add(anomalie(codesEnDefaut, "COH-007",
                            "Montant negatif interdit — ligne " + ligne, ligne, e));
                }
                // COH-008 : ValidDate dans l'exercice.
                if (validDate != null && debut != null && fin != null
                        && (validDate.isBefore(debut) || validDate.isAfter(fin))) {
                    coherence.add(anomalie(codesEnDefaut, "COH-008",
                            "Date de validation hors exercice — ligne " + ligne, ligne, e));
                }
            }

            // BLQ-001 : ecriture desequilibree.
            if (debitEcriture.compareTo(creditEcriture) != 0) {
                BigDecimal ecart = debitEcriture.subtract(creditEcriture).abs();
                bloquants.add(anomalie(codesEnDefaut, "BLQ-001",
                        "Ecriture desequilibree — ecart de " + fmt(ecart) + " €", null, e));
            }
            // BLQ-002 : EcritureNum vide ou duplique dans le meme journal.
            if (estVide(numero)) {
                bloquants.add(anomalie(codesEnDefaut, "BLQ-002", "Numero d'ecriture manquant", null, e));
            } else if (!numerosVus.add(e.getCodeJournal() + "|" + numero)) {
                bloquants.add(anomalie(codesEnDefaut, "BLQ-002",
                        "Numero d'ecriture duplique dans le journal " + e.getCodeJournal() + " : " + numero,
                        null, e));
            }
            // COH-005 : comptes de TVA 44551 et 44567 mouvementes simultanement.
            if (a44551 && a44567) {
                coherence.add(anomalie(codesEnDefaut, "COH-005",
                        "Comptes TVA 44551 et 44567 mouvementes simultanement — ecriture " + numero, null, e));
            }
            // COH-006 : TVA deductible sur immobilisations attendue sur 44562, pas 44566.
            if (a44566 && aImmo) {
                coherence.add(anomalie(codesEnDefaut, "COH-006",
                        "TVA sur immobilisation a porter sur 44562 et non 44566 — ecriture " + numero, null, e));
            }
        }

        // BLQ-008 : balance desequilibree sur l'exercice.
        if (totalDebit.compareTo(totalCredit) != 0) {
            BigDecimal ecart = totalDebit.subtract(totalCredit).abs();
            bloquants.add(anomalie(codesEnDefaut, "BLQ-008",
                    "Balance globale desequilibree — ecart de " + fmt(ecart)
                            + " € — resoudre TREZ-61 avant export", null, null));
        }
        // COH-001 : journal AN present (a-nouveaux).
        if (!anPresent && !ecritures.isEmpty()) {
            coherence.add(anomalie(codesEnDefaut, "COH-001",
                    "Aucun a-nouveau (journal AN) — verifier l'ouverture de l'exercice", null, null));
        }
        // COH-002 : EcritureNum sequentiel sans trou par journal.
        for (Map.Entry<String, Set<Integer>> en : sequencesParJournal.entrySet()) {
            Set<Integer> seqs = en.getValue();
            int max = seqs.stream().mapToInt(Integer::intValue).max().orElse(0);
            for (int i = 1; i <= max; i++) {
                if (!seqs.contains(i)) {
                    coherence.add(anomalie(codesEnDefaut, "COH-002",
                            "Trou dans la sequence du journal " + en.getKey()
                                    + " : numero " + String.format("%06d", i) + " manquant", null, null));
                }
            }
        }

        boolean exportPossible = bloquants.isEmpty();
        int passes = NB_CONTROLES - codesEnDefaut.size();
        long cohEnDefaut = codesEnDefaut.stream().filter(c -> c.startsWith("COH")).count();
        int coherencePasses = NB_COHERENCE - (int) cohEnDefaut;
        return new FecControleRapport(NB_CONTROLES, passes, bloquants.size(),
                avertissements.size(), coherencePasses, exportPossible,
                bloquants, avertissements, coherence);
    }

    private Anomalie anomalie(Set<String> codes, String code, String message, Integer ligne, EcritureComptable e) {
        codes.add(code);
        return new Anomalie(code, message, ligne,
                e != null ? e.getId() : null, e != null ? e.getNumeroOperation() : null);
    }

    /** Prefixes de comptes du PCG officiel pour le controle AVT-001. */
    private Set<String> prefixesPcg() {
        Set<String> prefixes = new HashSet<>();
        for (CompteComptable c : compteRepository.findAllByOrderByNumeroCompteAsc()) {
            if (c.getNumeroCompte() != null) {
                prefixes.add(c.getNumeroCompte());
            }
        }
        return prefixes;
    }

    /** Un compte est conforme si un compte du PCG en est la racine (prefixe). */
    private boolean dansPcg(Set<String> pcg, String numeroCompte) {
        for (int i = numeroCompte.length(); i >= 1; i--) {
            if (pcg.contains(numeroCompte.substring(0, i))) {
                return true;
            }
        }
        return false;
    }

    private static BigDecimal nz(BigDecimal v) {
        return v != null ? v : BigDecimal.ZERO;
    }

    private static boolean estVide(String v) {
        return v == null || v.isBlank();
    }

    /** Empreinte SHA-256 hexadecimale du contenu (AC-03, RG-005). */
    private String sha256(String contenu) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] hash = md.digest(contenu.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hash.length * 2);
            for (byte b : hash) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("SHA-256 indisponible", ex);
        }
    }

    /** Montant FEC : 2 decimales, separateur decimal virgule ; 0,00 si absent. */
    private String montant(BigDecimal montant) {
        return fmt(nz(montant));
    }

    private String fmt(BigDecimal valeur) {
        return valeur.setScale(2, RoundingMode.HALF_UP).toPlainString().replace('.', ',');
    }

    /** Neutralise les caracteres qui casseraient le format tabule. */
    private String champ(String valeur) {
        if (valeur == null) {
            return "";
        }
        return valeur.replace('\t', ' ').replace('\n', ' ').replace('\r', ' ');
    }

    /** Les 18 champs FEC d'une ligne de mouvement, dans l'ordre reglementaire. */
    private List<String> champsFec(EcritureComptable e, LigneEcriture l) {
        String journalLib = journalLibelleResolver.libelle(e.getCodeJournal());
        String ecritureDate = e.getDateEcriture().format(FEC_DATE);
        String validDate = e.getCreatedAt() != null
                ? e.getCreatedAt().toLocalDate().format(FEC_DATE) : ecritureDate;
        // EcritureNum : sequence numerique formatee sur 6 chiffres (AC-12, RG-009).
        String ecritureNum = String.format("%06d", e.getNumeroSequence());
        return List.of(
                champ(e.getCodeJournal()), champ(journalLib), ecritureNum, ecritureDate,
                champ(l.getNumeroCompte()), champ(l.getLibelleCompte()), "", "",
                champ(e.getNumeroOperation()), ecritureDate, champ(l.getLibelle()),
                montant(l.getDebit()), montant(l.getCredit()), "", "", validDate, "", "");
    }
}
