package com.reliablepay.payment.auth;

import java.time.Instant;

/**
 * Result of HMAC-SHA256 token validation.
 */
public record TokenValidationResult(
        boolean valid,
        boolean expired,
        String username,
        Instant expiresAt,
        String error
) {
    public static TokenValidationResult valid(String username, Instant expiresAt) {
        return new TokenValidationResult(true, false, username, expiresAt, null);
    }

    public static TokenValidationResult expired(String error) {
        return new TokenValidationResult(false, true, null, null, error);
    }

    public static TokenValidationResult invalid(String error) {
        return new TokenValidationResult(false, false, null, null, error);
    }
}
