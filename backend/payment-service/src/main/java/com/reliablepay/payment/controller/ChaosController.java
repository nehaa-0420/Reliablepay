package com.reliablepay.payment.controller;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.ChaosConfigRequest;
import com.reliablepay.payment.client.ChaosConfigResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Chaos Engineering", description = "Mock bank failure simulation and chaos profile configuration")
@RestController
@RequestMapping("/api/chaos")
public class ChaosController {

    private final BankClient bankClient;

    public ChaosController(BankClient bankClient) {
        this.bankClient = bankClient;
    }

    @Operation(summary = "Get active chaos configuration", description = "Retrieve current network latency, timeout rate, error rate, channel failure rate, and timeout charge probability")
    @GetMapping
    public ResponseEntity<ChaosConfigResponse> getChaos() {
        return ResponseEntity.ok(bankClient.getChaosConfig());
    }

    @Operation(summary = "Update chaos configuration", description = "Dynamically inject bank failures and delays. Protected by X-Admin-Token.", security = @SecurityRequirement(name = "AdminTokenAuth"))
    @PutMapping
    public ResponseEntity<ChaosConfigResponse> updateChaos(
            @Parameter(name = "X-Admin-Token", description = "Admin authorization token (optional locally, mandatory in production)")
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken,
            @RequestBody ChaosConfigRequest request) {
        return ResponseEntity.ok(bankClient.updateChaosConfig(request));
    }
}
