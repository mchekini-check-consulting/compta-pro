package com.comptapro.service;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Restitue les accents des libelles du PCG, fournis sans accentuation dans le
 * CSV source (AC-05 : "Reserves" -> "Reserves", "Etat" -> "Etat").
 * <p>
 * La normalisation est faite mot a mot : chaque suite de lettres du libelle est
 * recherchee (en minuscules) dans un dictionnaire des termes du referentiel ;
 * si une forme accentuee existe, elle est substituee en conservant la casse de
 * la premiere lettre. Les suites de lettres absentes du dictionnaire (sigles
 * TVA, TIAP, CSE... ou mots deja sans accent) sont laissees telles quelles.
 * <p>
 * Limite connue : quelques homographes ne peuvent etre distingues par un
 * dictionnaire mot a mot (ex. "factures" nom commun vs "factures" participe).
 * La forme la plus frequente dans le referentiel est retenue.
 */
@Component
public class LibelleNormalizer {

    private static final Pattern MOT = Pattern.compile("\\p{L}+");

    /** Dictionnaire minuscule -> forme accentuee, pour les mots du PCG concernes. */
    private static final Map<String, String> ACCENTS = Map.ofEntries(
            Map.entry("a", "à"),
            Map.entry("accordes", "accordés"),
            Map.entry("accreditifs", "accréditifs"),
            Map.entry("activite", "activité"),
            Map.entry("activites", "activités"),
            Map.entry("affectes", "affectés"),
            Map.entry("amenagements", "aménagements"),
            Map.entry("anticipes", "anticipés"),
            Map.entry("appele", "appelé"),
            Map.entry("arriere", "arrière"),
            Map.entry("assimilees", "assimilées"),
            Map.entry("assimiles", "assimilés"),
            Map.entry("associes", "associés"),
            Map.entry("aupres", "auprès"),
            Map.entry("benefice", "bénéfice"),
            Map.entry("benefices", "bénéfices"),
            Map.entry("cautionnees", "cautionnées"),
            Map.entry("cedes", "cédés"),
            Map.entry("cheques", "chèques"),
            Map.entry("cloture", "clôture"),
            Map.entry("collectee", "collectée"),
            Map.entry("collectees", "collectées"),
            Map.entry("collectivites", "collectivités"),
            Map.entry("comite", "comité"),
            Map.entry("conferant", "conférant"),
            Map.entry("constatees", "constatées"),
            Map.entry("constates", "constatés"),
            Map.entry("copropriete", "copropriété"),
            Map.entry("cree", "créé"),
            Map.entry("desormais", "désormais"),
            Map.entry("reduit", "réduit"),
            Map.entry("reglement", "règlement"),
            Map.entry("creance", "créance"),
            Map.entry("creances", "créances"),
            Map.entry("credit", "crédit"),
            Map.entry("crediteur", "créditeur"),
            Map.entry("crediteurs", "créditeurs"),
            Map.entry("decaisser", "décaisser"),
            Map.entry("deductible", "déductible"),
            Map.entry("deductibles", "déductibles"),
            Map.entry("defaillants", "défaillants"),
            Map.entry("deficits", "déficits"),
            Map.entry("deplacements", "déplacements"),
            Map.entry("depots", "dépôts"),
            Map.entry("depreciations", "dépréciations"),
            Map.entry("derogatoires", "dérogatoires"),
            Map.entry("destockage", "déstockage"),
            Map.entry("developpement", "développement"),
            Map.entry("differences", "différences"),
            Map.entry("donnes", "donnés"),
            Map.entry("ecart", "écart"),
            Map.entry("ecarts", "écarts"),
            Map.entry("echanges", "échangés"),
            Map.entry("economique", "économique"),
            Map.entry("elements", "éléments"),
            Map.entry("emis", "émis"),
            Map.entry("emission", "émission"),
            Map.entry("entite", "entité"),
            Map.entry("equipement", "équipement"),
            Map.entry("equipements", "équipements"),
            Map.entry("equivalence", "équivalence"),
            Map.entry("etablissement", "établissement"),
            Map.entry("etablissements", "établissements"),
            Map.entry("etat", "état"),
            Map.entry("etudes", "études"),
            Map.entry("exterieur", "extérieur"),
            Map.entry("exterieurs", "extérieurs"),
            Map.entry("fabriques", "fabriqués"),
            Map.entry("financieres", "financières"),
            Map.entry("generale", "générale"),
            Map.entry("gerants", "gérants"),
            Map.entry("immobilisee", "immobilisée"),
            Map.entry("immobilisees", "immobilisées"),
            Map.entry("immobilises", "immobilisés"),
            Map.entry("impot", "impôt"),
            Map.entry("impots", "impôts"),
            Map.entry("indemnites", "indemnités"),
            Map.entry("integration", "intégration"),
            Map.entry("interets", "intérêts"),
            Map.entry("intermediaires", "intermédiaires"),
            Map.entry("legale", "légale"),
            Map.entry("liberees", "libérées"),
            Map.entry("liberes", "libérés"),
            Map.entry("liees", "liées"),
            Map.entry("lies", "liés"),
            Map.entry("materiel", "matériel"),
            Map.entry("matieres", "matières"),
            Map.entry("mobilieres", "mobilières"),
            Map.entry("operations", "opérations"),
            Map.entry("particulieres", "particulières"),
            Map.entry("periodique", "périodique"),
            Map.entry("premieres", "premières"),
            Map.entry("presence", "présence"),
            Map.entry("prets", "prêts"),
            Map.entry("prevoyance", "prévoyance"),
            Map.entry("procedes", "procédés"),
            Map.entry("propriete", "propriété"),
            Map.entry("publicite", "publicité"),
            Map.entry("rachetes", "rachetés"),
            Map.entry("rattachees", "rattachées"),
            Map.entry("rattaches", "rattachés"),
            Map.entry("receptions", "réceptions"),
            Map.entry("recus", "reçus"),
            Map.entry("reevaluation", "réévaluation"),
            Map.entry("regies", "régies"),
            Map.entry("reglementations", "réglementations"),
            Map.entry("reglementees", "réglementées"),
            Map.entry("regularisation", "régularisation"),
            Map.entry("regulariser", "régulariser"),
            Map.entry("reinvesties", "réinvesties"),
            Map.entry("remuneration", "rémunération"),
            Map.entry("remunerations", "rémunérations"),
            Map.entry("reparations", "réparations"),
            Map.entry("repartir", "répartir"),
            Map.entry("repartition", "répartition"),
            Map.entry("reserve", "réserve"),
            Map.entry("reserves", "réserves"),
            Map.entry("residuels", "résiduels"),
            Map.entry("resultat", "résultat"),
            Map.entry("resultats", "résultats"),
            Map.entry("salaries", "salariés"),
            Map.entry("securite", "sécurité"),
            Map.entry("seminaires", "séminaires"),
            Map.entry("societe", "société"),
            Map.entry("societes", "sociétés"),
            Map.entry("speciale", "spéciale"),
            Map.entry("speciaux", "spéciaux"),
            Map.entry("stockee", "stockée"),
            Map.entry("stockes", "stockés"),
            Map.entry("supplements", "suppléments"),
            Map.entry("telecommunications", "télécommunications"),
            Map.entry("tresor", "trésor"),
            Map.entry("tresorerie", "trésorerie"),
            Map.entry("verse", "versé"),
            Map.entry("verses", "versés")
    );

    /**
     * Restitue les accents d'un libelle brut issu du CSV.
     *
     * @param libelle libelle non accentue (peut etre null)
     * @return libelle accentue, ou la valeur d'origine si null
     */
    public String normalize(String libelle) {
        if (libelle == null) {
            return null;
        }
        Matcher matcher = MOT.matcher(libelle);
        StringBuilder out = new StringBuilder(libelle.length());
        while (matcher.find()) {
            String mot = matcher.group();
            String accentue = ACCENTS.get(mot.toLowerCase());
            matcher.appendReplacement(out, Matcher.quoteReplacement(
                    accentue == null ? mot : applyCase(mot, accentue)));
        }
        matcher.appendTail(out);
        return out.toString();
    }

    /** Reapplique la casse de la premiere lettre du mot d'origine sur le remplacement. */
    private String applyCase(String original, String accentue) {
        if (Character.isUpperCase(original.charAt(0))) {
            return Character.toUpperCase(accentue.charAt(0)) + accentue.substring(1);
        }
        return accentue;
    }
}
