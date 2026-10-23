package com.reliablepay.payment.controller;

import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.dto.PaymentEventResponse;
import com.reliablepay.payment.dto.PaymentResponse;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@Tag(name = "Payments", description = "Payment lifecycle management and idempotent processing")
@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @Operation(summary = "Create or replay payment", description = "Initiate an idempotent payment request. If Idempotency-Key has already been used with identical payload, returns 200 OK with cached record. If payload differs, returns 422 Unprocessable Entity.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Payment successfully created and queued for processing"),
            @ApiResponse(responseCode = "200", description = "Idempotent replay: returns original payment without re-charging"),
            @ApiResponse(responseCode = "422", description = "Idempotency conflict: key reused with different request payload")
    })
    @PostMapping
    public ResponseEntity<PaymentResponse> createPayment(
            @Parameter(name = "Idempotency-Key", description = "Unique key (UUID or client token) ensuring at-most-once execution", required = true)
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreatePaymentRequest request) {

        PaymentService.CreationResult result = paymentService.createPayment(request, idempotencyKey);

        if (result.isReplay()) {
            return ResponseEntity.ok(result.response());
        }

        URI location = URI.create("/api/payments/" + result.response().getId());
        return ResponseEntity.created(location).body(result.response());
    }

    @Operation(summary = "Get payment by ID", description = "Retrieve current payment state, attempt count, and last error")
    @GetMapping("/{id}")
    public ResponseEntity<PaymentResponse> getPayment(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentById(id));
    }

    @Operation(summary = "List paginated payments", description = "Filter payments by state (INITIATED, PROCESSING, RETRYING, SUCCESS, FAILED, UNKNOWN, DEAD_LETTERED) and mode (PROTECTED, NAIVE)")
    @GetMapping
    public ResponseEntity<Page<PaymentResponse>> listPayments(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) PaymentMode mode,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        int pageSize = Math.min(Math.max(size, 1), 100);
        int pageIndex = Math.max(page, 0);
        PageRequest pageRequest = PageRequest.of(pageIndex, pageSize, Sort.by("createdAt").descending());

        return ResponseEntity.ok(paymentService.listPayments(status, mode, pageRequest));
    }

    @Operation(summary = "Get audit trail", description = "Retrieve immutable timeline of all state transitions and system events for the payment")
    @GetMapping("/{id}/events")
    public ResponseEntity<List<PaymentEventResponse>> getPaymentEvents(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.getPaymentEvents(id));
    }

    @Operation(summary = "Requeue dead-lettered payment", description = "Reset a DEAD_LETTERED payment back to RETRYING for another processing attempt")
    @PostMapping("/{id}/requeue")
    public ResponseEntity<PaymentResponse> requeuePayment(@PathVariable UUID id) {
        return ResponseEntity.ok(paymentService.requeuePayment(id));
    }
}
