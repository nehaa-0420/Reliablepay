package com.reliablepay.mockbank.controller;

import com.reliablepay.mockbank.dto.*;
import com.reliablepay.mockbank.model.BankCharge;
import com.reliablepay.mockbank.model.ChaosConfig;
import com.reliablepay.mockbank.service.BankService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/bank")
public class BankController {

    private final BankService bankService;

    public BankController(BankService bankService) {
        this.bankService = bankService;
    }

    @PostMapping("/charge")
    public ResponseEntity<ChargeResponse> charge(@Valid @RequestBody ChargeRequest request) {
        ChargeResponse response = bankService.processCharge(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/charges")
    public ResponseEntity<List<BankCharge>> getCharges(@RequestParam(required = false) String paymentRef) {
        return ResponseEntity.ok(bankService.getCharges(paymentRef));
    }

    @GetMapping("/status/{paymentRef}")
    public ResponseEntity<BankStatusResponse> getStatus(@PathVariable String paymentRef) {
        return ResponseEntity.ok(bankService.getStatus(paymentRef));
    }

    @GetMapping("/admin/chaos")
    public ResponseEntity<ChaosConfig> getChaos() {
        return ResponseEntity.ok(bankService.getChaosConfig());
    }

    @PutMapping("/admin/chaos")
    public ResponseEntity<ChaosConfig> updateChaos(@RequestBody ChaosConfigRequest request) {
        return ResponseEntity.ok(bankService.updateChaosConfig(request));
    }

    @GetMapping("/admin/stats")
    public ResponseEntity<BankStatsResponse> getStats() {
        return ResponseEntity.ok(bankService.getStats());
    }

    @PostMapping("/admin/reset")
    public ResponseEntity<Map<String, String>> reset() {
        bankService.reset();
        return ResponseEntity.ok(Map.of("status", "RESET", "message", "Bank ledger and chaos config have been reset"));
    }
}
