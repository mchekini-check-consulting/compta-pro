package com.comptapro.dto;

import com.comptapro.model.DocumentStatus;
import com.comptapro.model.DocumentType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocumentResponse {
    private Long id;
    private DocumentType type;
    private String fileName;
    private Long fileSize;
    private String contentType;
    private DocumentStatus status;
    private String rejectionReason;
    private LocalDateTime uploadedAt;
    private LocalDateTime verifiedAt;
}
