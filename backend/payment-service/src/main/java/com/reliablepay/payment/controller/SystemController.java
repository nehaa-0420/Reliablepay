package com.reliablepay.payment.controller;

import com.reliablepay.payment.client.BankClient;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@Tag(name = "System", description = "Health and cold-start wake operations")
@RestController
@RequestMapping("/api/system")
public class SystemController {

    private final BankClient bankClient;

    public SystemController(BankClient bankClient) {
        this.bankClient = bankClient;
    }

    @Operation(summary = "Wake services", description = "Pings internal dependencies to warm up free-tier cold starts")
    @GetMapping("/wake")
    public ResponseEntity<Map<String, String>> wake() {
        boolean bankUp = false;
        try {
            bankUp = bankClient.isHealthy();
        } catch (Exception ignored) {
        }

        return ResponseEntity.ok(Map.of(
                "paymentService", "UP",
                "mockBank", bankUp ? "UP" : "DOWN"
        ));
    }
}
