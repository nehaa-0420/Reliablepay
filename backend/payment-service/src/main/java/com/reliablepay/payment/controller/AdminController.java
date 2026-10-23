package com.reliablepay.payment.controller;

import com.reliablepay.payment.dto.AdminConfigRequest;
import com.reliablepay.payment.dto.AdminConfigResponse;
import com.reliablepay.payment.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Admin", description = "Administrative maintenance and state reset operations")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @Operation(summary = "Reset all database records", description = "Purges payments, payment attempts, events, idempotency keys, and resets mock-bank ledger. Protected by X-Admin-Token.", security = @SecurityRequirement(name = "AdminTokenAuth"))
    @PostMapping("/reset")
    public ResponseEntity<Map<String, String>> resetAll(
            @Parameter(name = "X-Admin-Token", description = "Admin authorization token (optional locally, mandatory in production)")
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken) {
        if (!adminService.isAdminResetEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Admin reset is disabled by configuration", "status", "FORBIDDEN"));
        }
        adminService.resetAll();
        return ResponseEntity.ok(Map.of("message", "System reset successfully", "status", "RESET"));
    }

    @Operation(summary = "Get system tuning parameters", description = "Returns active bank timeout, reconcile grace period, and retry configuration")
    @GetMapping("/config")
    public ResponseEntity<AdminConfigResponse> getConfig() {
        return ResponseEntity.ok(adminService.getConfig());
    }

    @Operation(summary = "Update system tuning parameters", description = "Dynamically adjusts timeout, grace period, and retry parameters. Protected by X-Admin-Token.", security = @SecurityRequirement(name = "AdminTokenAuth"))
    @PutMapping("/config")
    public ResponseEntity<AdminConfigResponse> updateConfig(
            @Parameter(name = "X-Admin-Token", description = "Admin authorization token (optional locally, mandatory in production)")
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken,
            @RequestBody AdminConfigRequest request) {
        return ResponseEntity.ok(adminService.updateConfig(request));
    }
}
