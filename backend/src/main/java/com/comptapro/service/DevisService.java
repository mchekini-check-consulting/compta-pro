package com.comptapro.service;

import com.comptapro.dto.CreateDevisRequest;
import com.comptapro.dto.DevisResponse;
import com.comptapro.dto.LigneDevisRequest;
import com.comptapro.dto.NextNumeroResponse;
import com.comptapro.model.Accountant;
import com.comptapro.model.Client;
import com.comptapro.model.Devis;
import com.comptapro.model.LigneDevis;
import com.comptapro.model.StatutDevis;
import com.comptapro.repository.AccountantRepository;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.DevisRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.Year;
import java.util.List;
import java.util.Set;

/**
 * Creation, consultation et suivi du cycle de vie des devis (US-F-001 et
 * gestion des statuts). Cloisonnement par cabinet via {@code accountantId} +
 * appartenance du dossier.
 */
@Service
@RequiredArgsConstructor
public class DevisService {

    /** Validite par defaut : emission + 30 jours calendaires (RG-002). */
    private static final int VALIDITE_JOURS = 30;

    /** Taux de TVA autorises par ligne (RG-005). */
    private static final Set<BigDecimal> TVA_AUTORISEES = Set.of(
            new BigDecimal("0"), new BigDecimal("5.5"),
            new BigDecimal("10"), new BigDecimal("20"));

    private static final String MENTIONS_DEFAUT = String.join("\n",
            "Devis valable 30 jours a compter de sa date d'emission.",
            "Conditions de reglement : acompte de 30 % a la commande, solde a la livraison.",
            "TVA sur les debits.",
            "L'acceptation du present devis vaut bon de commande.");

    private final DevisRepository devisRepository;
    private final ClientRepository clientRepository;
    private final AccountantRepository accountantRepository;

    @Transactional(readOnly = true)
    public List<DevisResponse> getDevisByClient(Long accountantId, Long clientId) {
        getClientOrThrow(accountantId, clientId);
        return devisRepository.findByClientIdAndAccountantIdOrderByCreatedAtDesc(clientId, accountantId)
                .stream().map(DevisResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public DevisResponse getDevis(Long accountantId, Long devisId) {
        return DevisResponse.fromEntity(getDevisOrThrow(accountantId, devisId));
    }

    /** Apercu du prochain numero pour le formulaire « Nouveau devis » (AC-01). */
    @Transactional(readOnly = true)
    public NextNumeroResponse previewNumero(Long accountantId) {
        int annee = Year.now().getValue();
        int rang = devisRepository.findMaxSequence(accountantId, annee) + 1;
        return NextNumeroResponse.builder()
                .numeroOperation(formatNumero(annee, rang))
                .build();
    }

    @Transactional
    public DevisResponse create(Long accountantId, CreateDevisRequest request) {
        Client client = getClientOrThrow(accountantId, request.getClientId());
        Accountant cabinet = accountantRepository.findById(accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Cabinet non trouve"));

        validateLignes(request.getLignes());
        if (request.isAcompteActif()
                && (request.getAcompteTaux() == null || request.getAcompteTaux().signum() <= 0)) {
            throw new IllegalArgumentException("Un taux d'acompte positif est requis quand l'acompte est actif");
        }

        LocalDate emission = request.getDateEmission() != null ? request.getDateEmission() : LocalDate.now();
        LocalDate validite = request.getDateValidite() != null
                ? request.getDateValidite() : emission.plusDays(VALIDITE_JOURS);
        if (validite.isBefore(emission)) {
            throw new IllegalArgumentException("La validite ne peut preceder la date d'emission");
        }

        int annee = emission.getYear();
        int rang = devisRepository.findMaxSequence(accountantId, annee) + 1;

        Devis devis = Devis.builder()
                .client(client)
                .accountantId(accountantId)
                .numero(formatNumero(annee, rang))
                .anneeSequence(annee)
                .numeroSequence(rang)
                .statut(StatutDevis.BROUILLON)
                // Bloc emetteur (snapshot cabinet, AC-02).
                .emetteurRaisonSociale(cabinet.getCabinetName())
                .emetteurAdresse(cabinet.getAddress())
                .emetteurSiret(cabinet.getSiren())
                .emetteurEmail(cabinet.getEmail())
                .emetteurTelephone(cabinet.getPhone())
                // Bloc destinataire (snapshot client, AC-03).
                .clientRaisonSociale(client.getRaisonSociale())
                .clientAttention(request.getClientAttention())
                .clientSiret(client.getSiren())
                .dateEmission(emission)
                .dateDebutPrestation(request.getDateDebutPrestation())
                .dateValidite(validite)
                .acompteActif(request.isAcompteActif())
                .acompteTaux(request.getAcompteTaux())
                .mentionsLegales(request.getMentionsLegales() != null
                        ? request.getMentionsLegales() : MENTIONS_DEFAUT)
                .build();

        appliquerLignes(devis, request.getLignes());
        return DevisResponse.fromEntity(devisRepository.save(devis));
    }

    /** Mise a jour d'un devis non signe (RG-002 : signe = lecture seule). */
    @Transactional
    public DevisResponse update(Long accountantId, Long devisId, CreateDevisRequest request) {
        Devis devis = getDevisOrThrow(accountantId, devisId);
        if (devis.getStatut() == StatutDevis.SIGNE) {
            throw new IllegalStateException("Un devis signe ne peut plus etre modifie");
        }
        validateLignes(request.getLignes());

        if (request.getDateEmission() != null) {
            devis.setDateEmission(request.getDateEmission());
        }
        devis.setDateDebutPrestation(request.getDateDebutPrestation());
        if (request.getDateValidite() != null) {
            devis.setDateValidite(request.getDateValidite());
        }
        devis.setClientAttention(request.getClientAttention());
        devis.setAcompteActif(request.isAcompteActif());
        devis.setAcompteTaux(request.getAcompteTaux());
        if (request.getMentionsLegales() != null) {
            devis.setMentionsLegales(request.getMentionsLegales());
        }

        devis.getLignes().clear();
        appliquerLignes(devis, request.getLignes());
        return DevisResponse.fromEntity(devisRepository.save(devis));
    }

    /** Transition de statut declenchee par l'utilisateur (RG-001). */
    @Transactional
    public DevisResponse changerStatut(Long accountantId, Long devisId, StatutDevis cible) {
        Devis devis = getDevisOrThrow(accountantId, devisId);
        if (devis.getStatut() == StatutDevis.SIGNE) {
            throw new IllegalStateException("Un devis signe est en lecture seule");
        }
        devis.setStatut(cible);
        return DevisResponse.fromEntity(devisRepository.save(devis));
    }

    /**
     * Relance d'un devis expire : cree une copie en brouillon avec un nouveau
     * numero et des dates rafraichies (RG-003).
     */
    @Transactional
    public DevisResponse relancer(Long accountantId, Long devisId) {
        Devis source = getDevisOrThrow(accountantId, devisId);

        CreateDevisRequest copie = new CreateDevisRequest();
        copie.setClientId(source.getClient().getId());
        copie.setClientAttention(source.getClientAttention());
        copie.setDateDebutPrestation(source.getDateDebutPrestation());
        copie.setAcompteActif(source.isAcompteActif());
        copie.setAcompteTaux(source.getAcompteTaux());
        copie.setMentionsLegales(source.getMentionsLegales());
        copie.setLignes(source.getLignes().stream().map(l -> new LigneDevisRequest(
                l.getDesignation(), l.getDetail(), l.getQuantite(),
                l.getPrixUnitaireHT(), l.getTauxTva())).toList());

        return create(accountantId, copie);
    }

    /**
     * Passe a « Expire » les devis dont la validite est depassee et qui ne sont
     * ni signes ni refuses (AC-03). Renvoie le nombre de devis expires.
     */
    @Transactional
    public int expirerDevisEchus(LocalDate aujourdhui) {
        List<StatutDevis> candidats = List.of(
                StatutDevis.BROUILLON, StatutDevis.ENVOYE, StatutDevis.EN_ATTENTE_SIGNATURE);
        List<Devis> expirables = devisRepository.findExpirables(candidats, aujourdhui);
        for (Devis d : expirables) {
            d.setStatut(StatutDevis.EXPIRE);
        }
        devisRepository.saveAll(expirables);
        return expirables.size();
    }

    private void appliquerLignes(Devis devis, List<LigneDevisRequest> lignes) {
        int ordre = 0;
        for (LigneDevisRequest l : lignes) {
            devis.getLignes().add(LigneDevis.builder()
                    .devis(devis)
                    .designation(l.getDesignation())
                    .detail(l.getDetail())
                    .quantite(l.getQuantite())
                    .prixUnitaireHT(l.getPrixUnitaireHT())
                    .tauxTva(l.getTauxTva())
                    .ordre(ordre++)
                    .build());
        }
    }

    private void validateLignes(List<LigneDevisRequest> lignes) {
        for (LigneDevisRequest l : lignes) {
            // RG-005 : seuls 0, 5.5, 10 et 20 % sont autorises.
            boolean autorise = TVA_AUTORISEES.stream()
                    .anyMatch(t -> t.compareTo(l.getTauxTva()) == 0);
            if (!autorise) {
                throw new IllegalArgumentException(
                        "Taux de TVA non autorise : " + l.getTauxTva() + " (0, 5.5, 10 ou 20 attendu)");
            }
        }
    }

    private Client getClientOrThrow(Long accountantId, Long clientId) {
        return clientRepository.findByIdAndAccountantId(clientId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));
    }

    private Devis getDevisOrThrow(Long accountantId, Long devisId) {
        return devisRepository.findByIdAndAccountantId(devisId, accountantId)
                .orElseThrow(() -> new IllegalArgumentException("Devis non trouve"));
    }

    private String formatNumero(int annee, int rang) {
        return String.format("DEV-%d-%04d", annee, rang);
    }
}
