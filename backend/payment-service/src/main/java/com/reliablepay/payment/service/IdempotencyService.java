package com.reliablepay.payment.service;

import com.reliablepay.payment.dto.CreatePaymentRequest;
import com.reliablepay.payment.exception.IdempotencyConflictException;
import com.reliablepay.payment.model.IdempotencyRecord;
import com.reliablepay.payment.repository.IdempotencyRecordRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository repository;
    private final long ttlHours;

    public IdempotencyService(IdempotencyRecordRepository repository,
                              @Value("${app.idempotency.ttl-hours:24}") long ttlHours) {
        this.repository = repository;
        this.ttlHours = ttlHours;
    }

    /**
     * Computes a canonical SHA-256 hash for the request payload.
     */
    public String computeRequestHash(CreatePaymentRequest request) {
        try {
            String raw = String.format("%s|%s|%s|%s",
                    request.getMerchantRef() != null ? request.getMerchantRef().trim() : "",
                    request.getAmount() != null ? request.getAmount().stripTrailingZeros().toPlainString() : "",
                    request.getCurrency() != null ? request.getCurrency().trim().toUpperCase() : "",
                    request.getMode() != null ? request.getMode().name() : ""
            );
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(raw.getBytes(StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) {
                    hexString.append('0');
                }
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    /**
     * Looks up an existing idempotency record and validates the hash.
     * Throws IdempotencyConflictException if the key exists with a different hash.
     */
    public Optional<IdempotencyRecord> getAndValidate(String key, String requestHash) {
        Optional<IdempotencyRecord> existing = repository.findById(key);
        if (existing.isPresent()) {
            IdempotencyRecord record = existing.get();
            if (!record.getRequestHash().equals(requestHash)) {
                throw new IdempotencyConflictException(
                        String.format("Idempotency key '%s' was already used with a different request payload", key)
                );
            }
            return Optional.of(record);
        }
        return Optional.empty();
    }

    /**
     * Saves the idempotency response record.
     */
    public IdempotencyRecord store(String key, String requestHash, int status, String responseBody) {
        Instant expiresAt = Instant.now().plus(ttlHours, ChronoUnit.HOURS);
        IdempotencyRecord record = new IdempotencyRecord(key, requestHash, status, responseBody, expiresAt);
        return repository.save(record);
    }
}
