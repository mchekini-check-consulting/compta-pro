package com.comptapro.controller;

import com.comptapro.dto.ClientResponse;
import com.comptapro.dto.CreateClientRequest;
import com.comptapro.dto.UpdateClientRequest;
import com.comptapro.security.AccountantUserDetails;
import com.comptapro.service.ClientService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clients")
@RequiredArgsConstructor
public class ClientController {

    private final ClientService clientService;

    @PostMapping
    public ResponseEntity<ClientResponse> createClient(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @Valid @RequestBody CreateClientRequest request) {
        ClientResponse response = clientService.createClient(userDetails.getAccountantId(), request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<List<ClientResponse>> getClients(
            @AuthenticationPrincipal AccountantUserDetails userDetails) {
        List<ClientResponse> clients = clientService.getClientsByAccountant(userDetails.getAccountantId());
        return ResponseEntity.ok(clients);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClientResponse> getClient(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id) {
        ClientResponse client = clientService.getClientById(userDetails.getAccountantId(), id);
        return ResponseEntity.ok(client);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ClientResponse> updateClient(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id,
            @Valid @RequestBody UpdateClientRequest request) {
        ClientResponse response = clientService.updateClient(userDetails.getAccountantId(), id, request);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Map<String, Object>> deleteClient(
            @AuthenticationPrincipal AccountantUserDetails userDetails,
            @PathVariable Long id) {
        clientService.deleteClient(userDetails.getAccountantId(), id);
        return ResponseEntity.ok(Map.of(
            "success", true,
            "message", "Dossier supprime avec succes"
        ));
    }
}
