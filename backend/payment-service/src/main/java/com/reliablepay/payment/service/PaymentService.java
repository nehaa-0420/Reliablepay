package com.reliablepay.payment.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.dto.PaymentEventResponse;
import com.reliablepay.payment.dto.PaymentResponse;
import com.reliablepay.payment.exception.IdempotencyConflictException;
import com.reliablepay.payment.exception.ResourceNotFoundException;
import com.reliablepay.payment.model.*;
import com.reliablepay.payment.repository.PaymentEventRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class PaymentService {

    private static final Logger log = LoggerFactory.getLogger(PaymentService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final PaymentStateMachine stateMachine;
    private final IdempotencyService idempotencyService;
    private final PaymentCreationHelper creationHelper;
    private final PaymentProcessingService processingService;
    private final ObjectMapper objectMapper;

    public PaymentService(PaymentRepository paymentRepository,
                          PaymentEventRepository paymentEventRepository,
                          PaymentStateMachine stateMachine,
                          IdempotencyService idempotencyService,
                          PaymentCreationHelper creationHelper,
                          PaymentProcessingService processingService,
                          ObjectMapper objectMapper) {
        this.paymentRepository = paymentRepository;
        this.paymentEventRepository = paymentEventRepository;
        this.stateMachine = stateMachine;
        this.idempotencyService = idempotencyService;
        this.creationHelper = creationHelper;
        this.processingService = processingService;
        this.objectMapper = objectMapper;
    }

    public record CreationResult(PaymentResponse response, boolean isReplay) {}

    /**
     * Creates a payment or returns an existing one if the idempotency key matches.
     * In PROTECTED mode:
     * - Idempotency-Key is mandatory.
     * - Same key + same hash -> returns stored response (200 OK, isReplay = true).
     * - Same key + different hash -> 422 Unprocessable Entity.
     * - Concurrent requests -> database unique constraint prevents duplicate creation.
     *
     * In NAIVE mode:
     * - Idempotency checks are bypassed to demonstrate duplicate payments under retries.
     */
    public CreationResult createPayment(CreatePaymentRequest request, String idempotencyKey) {
        PaymentMode mode = request.getMode() != null ? request.getMode() : PaymentMode.PROTECTED;

        if (mode == PaymentMode.PROTECTED) {
            if (idempotencyKey == null || idempotencyKey.trim().isEmpty()) {
                throw new IllegalArgumentException("Idempotency-Key header is required in PROTECTED mode");
            }
            String cleanKey = idempotencyKey.trim();
            String requestHash = idempotencyService.computeRequestHash(request);

            // 1. Check idempotency store for existing response
            Optional<IdempotencyRecord> existingRecord = idempotencyService.getAndValidate(cleanKey, requestHash);
            if (existingRecord.isPresent()) {
                log.info("Idempotent replay detected for key: {}", cleanKey);
                try {
                    PaymentResponse cachedResponse = objectMapper.readValue(existingRecord.get().getResponseBody(), PaymentResponse.class);
                    return new CreationResult(cachedResponse, true);
                } catch (JsonProcessingException e) {
                    log.warn("Failed to deserialize cached idempotency response, falling back to database entity", e);
                    Payment payment = paymentRepository.findByIdempotencyKey(cleanKey)
                            .orElseThrow(() -> new IllegalStateException("Payment missing for idempotency key: " + cleanKey));
                    return new CreationResult(PaymentResponse.from(payment), true);
                }
            }

            // 2. Delegate creation to isolated transaction helper
            try {
                PaymentResponse response = creationHelper.createAndPersist(request, cleanKey, requestHash, mode);
                log.info("Created new PROTECTED payment {} with key {}", response.getId(), cleanKey);
                processingService.processPaymentAsync(response.getId());
                return new CreationResult(response, false);

            } catch (DataIntegrityViolationException ex) {
                log.info("Concurrent request detected for idempotency key: {}", cleanKey);

                // Winning transaction may take a brief moment to commit the response cache
                for (int i = 0; i < 10; i++) {
                    Optional<IdempotencyRecord> raceRecord = idempotencyService.getAndValidate(cleanKey, requestHash);
                    if (raceRecord.isPresent()) {
                        try {
                            PaymentResponse cachedResponse = objectMapper.readValue(raceRecord.get().getResponseBody(), PaymentResponse.class);
                            return new CreationResult(cachedResponse, true);
                        } catch (JsonProcessingException e) {
                            Payment payment = paymentRepository.findByIdempotencyKey(cleanKey)
                                    .orElseThrow(() -> new IllegalStateException("Payment missing for key: " + cleanKey));
                            return new CreationResult(PaymentResponse.from(payment), true);
                        }
                    }
                    try {
                        Thread.sleep(50);
                    } catch (InterruptedException ie) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }

                Payment existingPayment = paymentRepository.findByIdempotencyKey(cleanKey)
                        .orElseThrow(() -> new IdempotencyConflictException("Conflict occurred processing key: " + cleanKey));
                return new CreationResult(PaymentResponse.from(existingPayment), true);

            } catch (JsonProcessingException e) {
                throw new IllegalStateException("Error serializing payment response", e);
            }

        } else {
            // NAIVE mode: intentionally bypass idempotency key check and do not enforce uniqueness
            Payment payment = new Payment(
                    UUID.randomUUID(),
                    request.getMerchantRef(),
                    request.getAmount(),
                    request.getCurrency(),
                    PaymentMode.NAIVE,
                    null, // null idempotency_key so unique constraint does not trigger
                    null
            );
            payment = paymentRepository.saveAndFlush(payment);
            stateMachine.transition(payment, PaymentStatus.INITIATED, "Payment created in NAIVE mode (no idempotency)");

            PaymentResponse response = PaymentResponse.from(payment);
            log.info("Created new NAIVE payment {}", payment.getId());
            processingService.processPaymentAsync(payment.getId());
            return new CreationResult(response, false);
        }
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentById(UUID id) {
        return paymentRepository.findById(id)
                .map(PaymentResponse::from)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));
    }

    @Transactional(readOnly = true)
    public Page<PaymentResponse> listPayments(PaymentStatus status, PaymentMode mode, Pageable pageable) {
        Page<Payment> page;
        if (status != null && mode != null) {
            page = paymentRepository.findByStatusAndMode(status, mode, pageable);
        } else if (status != null) {
            page = paymentRepository.findByStatus(status, pageable);
        } else if (mode != null) {
            page = paymentRepository.findByMode(mode, pageable);
        } else {
            page = paymentRepository.findAll(pageable);
        }
        return page.map(PaymentResponse::from);
    }

    @Transactional(readOnly = true)
    public List<PaymentEventResponse> getPaymentEvents(UUID paymentId) {
        if (!paymentRepository.existsById(paymentId)) {
            throw new ResourceNotFoundException("Payment not found with id: " + paymentId);
        }
        return paymentEventRepository.findByPaymentIdOrderByCreatedAtAsc(paymentId)
                .stream()
                .map(PaymentEventResponse::from)
                .toList();
    }

    @Transactional
    public PaymentResponse requeuePayment(UUID id) {
        Payment payment = paymentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found with id: " + id));

        if (payment.getStatus() != PaymentStatus.DEAD_LETTERED) {
            throw new IllegalStateException("Payment " + id + " is in status " + payment.getStatus() + ", only DEAD_LETTERED payments can be requeued");
        }

        payment.setAttemptCount(0);
        payment.setNextRetryAt(Instant.now());
        payment.setLastError(null);
        stateMachine.transition(payment, PaymentStatus.RETRYING, "Payment manually requeued from dead letter queue");
        payment = paymentRepository.saveAndFlush(payment);

        log.info("Payment {} successfully requeued from DEAD_LETTERED to RETRYING", id);
        processingService.processPaymentAsync(payment.getId());
        return PaymentResponse.from(payment);
    }
}
