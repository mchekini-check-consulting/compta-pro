package com.comptapro.exception;

/**
 * Erreur bloquante lors de l'import du plan comptable, entrainant l'annulation
 * (rollback) de l'ensemble de l'import (ex. doublon de numero de compte, AC-02).
 */
public class PlanComptableImportException extends RuntimeException {

    public PlanComptableImportException(String message) {
        super(message);
    }
}
