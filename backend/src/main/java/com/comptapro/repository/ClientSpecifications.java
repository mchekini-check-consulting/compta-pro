package com.comptapro.repository;

import com.comptapro.model.Client;
import com.comptapro.model.FormeJuridique;
import com.comptapro.model.StatutDossier;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.util.List;

/**
 * Fabriques de {@link Specification} pour la recherche multi-critere des dossiers.
 * Tous les criteres sont optionnels et cumulables (RG-006).
 */
public final class ClientSpecifications {

    private ClientSpecifications() {
    }

    /** Cloisonnement par cabinet : seuls les dossiers du comptable connecte (RG-012). */
    public static Specification<Client> appartientAuComptable(Long accountantId) {
        return (root, query, cb) -> cb.equal(root.get("accountant").get("id"), accountantId);
    }

    /** Raison sociale : recherche partielle insensible a la casse (RG-001). */
    public static Specification<Client> raisonSocialeContient(String terme) {
        if (terme == null || terme.isBlank()) {
            return null;
        }
        String motif = "%" + terme.trim().toLowerCase() + "%";
        return (root, query, cb) -> cb.like(cb.lower(root.get("raisonSociale")), motif);
    }

    /** SIREN : recherche partielle par prefixe (RG-002). */
    public static Specification<Client> sirenCommencePar(String terme) {
        if (terme == null || terme.isBlank()) {
            return null;
        }
        String motif = terme.trim() + "%";
        return (root, query, cb) -> cb.like(root.get("siren"), motif);
    }

    /** Filtre par forme juridique (AC-05). */
    public static Specification<Client> formeJuridiqueEgale(FormeJuridique forme) {
        if (forme == null) {
            return null;
        }
        return (root, query, cb) -> cb.equal(root.get("formeJuridique"), forme);
    }

    /** Filtre par statut, multi-selection (AC-06 / AC-07 / RG-003). */
    public static Specification<Client> statutParmi(List<StatutDossier> statuts) {
        if (statuts == null || statuts.isEmpty()) {
            return null;
        }
        return (root, query, cb) -> root.get("statut").in(statuts);
    }

    /** Date d'immatriculation >= date de debut (AC-08 / RG-005). */
    public static Specification<Client> immatriculeApres(LocalDate dateDebut) {
        if (dateDebut == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.greaterThanOrEqualTo(root.get("dateImmatriculation"), dateDebut);
    }

    /** Date d'immatriculation <= date de fin (AC-08 / RG-005). */
    public static Specification<Client> immatriculeAvant(LocalDate dateFin) {
        if (dateFin == null) {
            return null;
        }
        return (root, query, cb) ->
                cb.lessThanOrEqualTo(root.get("dateImmatriculation"), dateFin);
    }
}
