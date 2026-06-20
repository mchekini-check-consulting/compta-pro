package com.comptapro.service;

import com.comptapro.dto.ClientResponse;
import com.comptapro.dto.ClientSearchCriteria;
import com.comptapro.dto.ClientSearchResponse;
import com.comptapro.dto.CreateClientRequest;
import com.comptapro.dto.UpdateClientRequest;
import com.comptapro.model.Accountant;
import com.comptapro.model.Client;
import com.comptapro.repository.AccountantRepository;
import com.comptapro.repository.ClientRepository;
import com.comptapro.repository.ClientSpecifications;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClientService {

    private final ClientRepository clientRepository;
    private final AccountantRepository accountantRepository;

    @Transactional
    public ClientResponse createClient(Long accountantId, CreateClientRequest request) {
        // Valider la duree de l'exercice (max 24 mois)
        long monthsBetween = ChronoUnit.MONTHS.between(
            request.getDateDebutExercice(),
            request.getDateFinExercice()
        );
        if (monthsBetween > 24 || monthsBetween < 0) {
            throw new IllegalArgumentException("La duree de l'exercice ne doit pas depasser 24 mois");
        }

        // Verifier que la date de fin est apres la date de debut
        if (!request.getDateFinExercice().isAfter(request.getDateDebutExercice())) {
            throw new IllegalArgumentException("La date de fin doit etre posterieure a la date de debut");
        }

        Accountant accountant = accountantRepository.findById(accountantId)
            .orElseThrow(() -> new IllegalArgumentException("Comptable non trouve"));

        Client client = Client.builder()
            .raisonSociale(request.getRaisonSociale())
            .siren(request.getSiren())
            .formeJuridique(request.getFormeJuridique())
            .statut(request.getStatut())
            .dateImmatriculation(request.getDateImmatriculation())
            .regimeFiscal(request.getRegimeFiscal())
            .regimeTVA(request.getRegimeTVA())
            .dateDebutExercice(request.getDateDebutExercice())
            .dateFinExercice(request.getDateFinExercice())
            .accountant(accountant)
            .build();

        Client savedClient = clientRepository.save(client);
        return ClientResponse.fromEntity(savedClient);
    }

    public List<ClientResponse> getClientsByAccountant(Long accountantId) {
        return clientRepository.findByAccountantIdOrderByCreatedAtDesc(accountantId)
            .stream()
            .map(ClientResponse::fromEntity)
            .toList();
    }

    /**
     * Recherche multi-critere des dossiers du comptable connecte. Tous les
     * criteres sont optionnels et cumulables (RG-006) ; les resultats sont
     * cloisonnes au cabinet (RG-012) et tries par raison sociale (RG-011).
     *
     * @throws IllegalArgumentException si la date de debut est posterieure a la
     *                                  date de fin (AC-09)
     */
    public ClientSearchResponse searchClients(Long accountantId, ClientSearchCriteria criteria) {
        if (criteria.getDateDebut() != null && criteria.getDateFin() != null
                && criteria.getDateDebut().isAfter(criteria.getDateFin())) {
            throw new IllegalArgumentException(
                "La date de debut doit etre anterieure a la date de fin");
        }

        Specification<Client> spec = Specification
            .where(ClientSpecifications.appartientAuComptable(accountantId))
            .and(ClientSpecifications.raisonSocialeContient(criteria.getRaisonSociale()))
            .and(ClientSpecifications.sirenCommencePar(criteria.getSiren()))
            .and(ClientSpecifications.formeJuridiqueEgale(criteria.getFormeJuridique()))
            .and(ClientSpecifications.statutParmi(criteria.getStatuts()))
            .and(ClientSpecifications.immatriculeApres(criteria.getDateDebut()))
            .and(ClientSpecifications.immatriculeAvant(criteria.getDateFin()));

        List<ClientResponse> clients = clientRepository
            .findAll(spec, Sort.by(Sort.Direction.ASC, "raisonSociale"))
            .stream()
            .map(ClientResponse::fromEntity)
            .toList();

        long total = clientRepository.countByAccountantId(accountantId);

        return ClientSearchResponse.builder()
            .count(clients.size())
            .total(total)
            .clients(clients)
            .build();
    }

    public ClientResponse getClientById(Long accountantId, Long clientId) {
        Client client = clientRepository.findByIdAndAccountantId(clientId, accountantId)
            .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));
        return ClientResponse.fromEntity(client);
    }

    @Transactional
    public ClientResponse updateClient(Long accountantId, Long clientId, UpdateClientRequest request) {
        Client client = clientRepository.findByIdAndAccountantId(clientId, accountantId)
            .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));

        // Valider la duree de l'exercice (max 24 mois)
        long monthsBetween = ChronoUnit.MONTHS.between(
            request.getDateDebutExercice(),
            request.getDateFinExercice()
        );
        if (monthsBetween > 24 || monthsBetween < 0) {
            throw new IllegalArgumentException("La duree de l'exercice ne doit pas depasser 24 mois");
        }

        // Verifier que la date de fin est apres la date de debut
        if (!request.getDateFinExercice().isAfter(request.getDateDebutExercice())) {
            throw new IllegalArgumentException("La date de fin doit etre posterieure a la date de debut");
        }

        client.setRaisonSociale(request.getRaisonSociale());
        client.setSiren(request.getSiren());
        client.setFormeJuridique(request.getFormeJuridique());
        client.setStatut(request.getStatut());
        client.setDateImmatriculation(request.getDateImmatriculation());
        client.setRegimeFiscal(request.getRegimeFiscal());
        client.setRegimeTVA(request.getRegimeTVA());
        client.setDateDebutExercice(request.getDateDebutExercice());
        client.setDateFinExercice(request.getDateFinExercice());

        Client updatedClient = clientRepository.save(client);
        return ClientResponse.fromEntity(updatedClient);
    }

    @Transactional
    public void deleteClient(Long accountantId, Long clientId) {
        Client client = clientRepository.findByIdAndAccountantId(clientId, accountantId)
            .orElseThrow(() -> new IllegalArgumentException("Dossier non trouve"));
        clientRepository.delete(client);
    }
}
