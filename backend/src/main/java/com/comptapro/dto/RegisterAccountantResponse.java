package com.comptapro.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RegisterAccountantResponse {
    private boolean success;
    private String message;
    private Long accountantId;
}
