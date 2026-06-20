package com.comptapro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Apercu du numero d'operation genere a la saisie du premier compte (RG-003/RG-006).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NextNumeroResponse {

    private String codeJournal;
    private String numeroOperation;
}
