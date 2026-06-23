package com.comptapro.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;

/**
 * Job quotidien d'expiration automatique des devis echus (AC-03).
 * <p>
 * S'execute chaque jour a 02h00 et passe a « Expire » tout devis non signe dont
 * la validite est depassee.
 */
@Component
@RequiredArgsConstructor
public class DevisExpirationScheduler {

    private static final Logger log = LoggerFactory.getLogger(DevisExpirationScheduler.class);

    private final DevisService devisService;

    @Scheduled(cron = "0 0 2 * * *")
    public void expirerDevisEchus() {
        int expires = devisService.expirerDevisEchus(LocalDate.now());
        if (expires > 0) {
            log.info("Expiration automatique : {} devis passe(s) au statut EXPIRE", expires);
        }
    }
}
