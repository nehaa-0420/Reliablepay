package com.reliablepay.payment.service;

import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.exception.IdempotencyConflictException;
import com.reliablepay.payment.model.IdempotencyRecord;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.repository.IdempotencyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class PaymentIdempotencyTest {

    private IdempotencyRecordRepository repository;
    private IdempotencyService idempotencyService;

    @BeforeEach
    void setUp() {
        repository = mock(IdempotencyRecordRepository.class);
        idempotencyService = new IdempotencyService(repository, 24);
    }

    @Test
    @DisplayName("Identical request payloads generate identical SHA-256 hashes")
    void identicalRequestsProduceSameHash() {
        CreatePaymentRequest req1 = new CreatePaymentRequest("ORD-1", new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED);
        CreatePaymentRequest req2 = new CreatePaymentRequest("ORD-1", new BigDecimal("100.000"), "INR", PaymentMode.PROTECTED);

        String hash1 = idempotencyService.computeRequestHash(req1);
        String hash2 = idempotencyService.computeRequestHash(req2);

        assertThat(hash1).isEqualTo(hash2);
        assertThat(hash1).hasSize(64);
    }

    @Test
    @DisplayName("Different amount or merchantRef produces distinct hashes")
    void differentPayloadProducesDifferentHash() {
        CreatePaymentRequest req1 = new CreatePaymentRequest("ORD-1", new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED);
        CreatePaymentRequest req2 = new CreatePaymentRequest("ORD-1", new BigDecimal("200.00"), "INR", PaymentMode.PROTECTED);
        CreatePaymentRequest req3 = new CreatePaymentRequest("ORD-2", new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED);

        String hash1 = idempotencyService.computeRequestHash(req1);
        String hash2 = idempotencyService.computeRequestHash(req2);
        String hash3 = idempotencyService.computeRequestHash(req3);

        assertThat(hash1).isNotEqualTo(hash2);
        assertThat(hash1).isNotEqualTo(hash3);
    }

    @Test
    @DisplayName("Replaying with matching key and hash returns existing record")
    void getAndValidateWithMatchingHashSucceeds() {
        String key = "idemp-key-123";
        String hash = "hash-abc";
        IdempotencyRecord record = new IdempotencyRecord(key, hash, 201, "{\"id\":\"123\"}", Instant.now().plusSeconds(3600));

        when(repository.findById(key)).thenReturn(Optional.of(record));

        Optional<IdempotencyRecord> result = idempotencyService.getAndValidate(key, hash);

        assertThat(result).isPresent();
        assertThat(result.get().getResponseStatus()).isEqualTo(201);
    }

    @Test
    @DisplayName("Replaying with matching key but different hash throws IdempotencyConflictException (422)")
    void getAndValidateWithMismatchedHashThrowsException() {
        String key = "idemp-key-123";
        IdempotencyRecord record = new IdempotencyRecord(key, "original-hash", 201, "{\"id\":\"123\"}", Instant.now().plusSeconds(3600));

        when(repository.findById(key)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> idempotencyService.getAndValidate(key, "different-hash"))
                .isInstanceOf(IdempotencyConflictException.class)
                .hasMessageContaining("already used with a different request payload");
    }
}
