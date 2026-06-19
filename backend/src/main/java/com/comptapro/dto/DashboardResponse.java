package com.comptapro.dto;

import com.comptapro.model.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardResponse {
    private Long accountantId;
    private String cabinetName;
    private AccountStatus accountStatus;
    private boolean canSubmitDossier;
    private boolean dossierSubmitted;
    private List<DocumentResponse> documents;
}
