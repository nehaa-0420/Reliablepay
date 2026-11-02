package com.reliablepay.payment.controller;

import com.reliablepay.payment.dto.AdminConfigRequest;
import com.reliablepay.payment.dto.AdminConfigResponse;
import com.reliablepay.payment.dto.AdminStreamSnapshotResponse;
import com.reliablepay.payment.event.PaymentEventHub;
import com.reliablepay.payment.service.AdminService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;

@Tag(name = "Admin", description = "Administrative maintenance and state reset operations")
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final PaymentEventHub paymentEventHub;

    public AdminController(AdminService adminService, PaymentEventHub paymentEventHub) {
        this.adminService = adminService;
        this.paymentEventHub = paymentEventHub;
    }

    @Operation(summary = "Stream admin metrics and transitions (SSE)", description = "Server-Sent Events stream for administrators. Emits status count snapshot + last 20 events, then all transitions.", security = @SecurityRequirement(name = "AdminTokenAuth"))
    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public ResponseEntity<SseEmitter> streamAdminEvents() {
        SseEmitter emitter = paymentEventHub.subscribeAdmin();
        try {
            AdminStreamSnapshotResponse snapshot = adminService.getStreamSnapshot();
            emitter.send(SseEmitter.event()
                    .name("snapshot")
                    .data(snapshot));
        } catch (IOException e) {
            emitter.completeWithError(e);
            return ResponseEntity.ok()
                    .header("Cache-Control", "no-cache")
                    .header("X-Accel-Buffering", "no")
                    .body(emitter);
        }

        return ResponseEntity.ok()
                .header("Cache-Control", "no-cache")
                .header("X-Accel-Buffering", "no")
                .body(emitter);
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
