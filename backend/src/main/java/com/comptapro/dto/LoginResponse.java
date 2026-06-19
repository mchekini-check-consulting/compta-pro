package com.comptapro.dto;

import com.comptapro.model.AccountStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {
    private boolean success;
    private String message;
    private String token;
    private Long accountantId;
    private String cabinetName;
    private String email;
    private AccountStatus accountStatus;
}
