package com.reliablepay.payment.auth;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Signs and validates HMAC-SHA256 tokens with 8-hour expiry.
 * Enforces constant-time cryptographic signature comparison.
 */
@Service
public class TokenService {

    public static final long EXPIRY_SECONDS = 8 * 3600L; // 8 hours
    private static final String HMAC_ALGO = "HmacSHA256";

    private static final Pattern EXP_PATTERN = Pattern.compile("\"exp\"\\s*:\\s*(\\d+)");
    private static final Pattern SUB_PATTERN = Pattern.compile("\"sub\"\\s*:\\s*\"([^\"]+)\"");

    private final AdminAuthConfig authConfig;

    public TokenService(AdminAuthConfig authConfig) {
        this.authConfig = authConfig;
    }

    /**
     * Generates a signed token: Base64Url(header) + "." + Base64Url(payload) + "." + Base64Url(signature)
     */
    public String generateToken(String username) {
        String secret = authConfig.getTokenSecret();
        if (secret == null || secret.isEmpty()) {
            throw new IllegalStateException("AUTH_TOKEN_SECRET is not configured");
        }

        Instant now = Instant.now();
        Instant exp = now.plus(EXPIRY_SECONDS, ChronoUnit.SECONDS);

        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String headerEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));

        String payloadJson = String.format("{\"sub\":\"%s\",\"iat\":%d,\"exp\":%d}",
                escapeJson(username), now.getEpochSecond(), exp.getEpochSecond());
        String payloadEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));

        String dataToSign = headerEncoded + "." + payloadEncoded;
        String signature = computeHmac(dataToSign, secret);

        return dataToSign + "." + signature;
    }

    /**
     * Validates an HMAC-SHA256 token using constant-time signature comparison and checks expiration.
     */
    public TokenValidationResult validateToken(String token) {
        if (token == null || token.isBlank()) {
            return TokenValidationResult.invalid("Token is null or blank");
        }

        String secret = authConfig.getTokenSecret();
        if (secret == null || secret.isEmpty()) {
            return TokenValidationResult.invalid("AUTH_TOKEN_SECRET is not configured on server");
        }

        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            return TokenValidationResult.invalid("Token must contain exactly 3 segments separated by dots");
        }

        String dataToSign = parts[0] + "." + parts[1];
        String expectedSignature = computeHmac(dataToSign, secret);

        // Constant-time signature comparison
        byte[] expectedSigBytes = expectedSignature.getBytes(StandardCharsets.UTF_8);
        byte[] actualSigBytes = parts[2].getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(actualSigBytes, expectedSigBytes)) {
            return TokenValidationResult.invalid("Signature mismatch or token tampered");
        }

        try {
            byte[] payloadBytes = Base64.getUrlDecoder().decode(parts[1]);
            String payloadJson = new String(payloadBytes, StandardCharsets.UTF_8);

            Matcher expMatcher = EXP_PATTERN.matcher(payloadJson);
            if (!expMatcher.find()) {
                return TokenValidationResult.invalid("Token payload missing exp claim");
            }
            long expSeconds = Long.parseLong(expMatcher.group(1));

            Matcher subMatcher = SUB_PATTERN.matcher(payloadJson);
            if (!subMatcher.find()) {
                return TokenValidationResult.invalid("Token payload missing sub claim");
            }
            String username = subMatcher.group(1);

            Instant expiresAt = Instant.ofEpochSecond(expSeconds);
            if (Instant.now().isAfter(expiresAt)) {
                return TokenValidationResult.expired("Token expired at " + expiresAt);
            }

            return TokenValidationResult.valid(username, expiresAt);
        } catch (Exception ex) {
            return TokenValidationResult.invalid("Failed decoding token payload: " + ex.getMessage());
        }
    }

    private String computeHmac(String data, String secret) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGO);
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), HMAC_ALGO);
            mac.init(secretKeySpec);
            byte[] rawHmac = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(rawHmac);
        } catch (Exception e) {
            throw new IllegalStateException("Failed computing HMAC-SHA256 signature", e);
        }
    }

    public String createTokenWithExpiryForTest(String username, Instant exp) {
        String secret = authConfig.getTokenSecret();
        Instant now = Instant.now();
        String headerJson = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
        String headerEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(headerJson.getBytes(StandardCharsets.UTF_8));
        String payloadJson = String.format("{\"sub\":\"%s\",\"iat\":%d,\"exp\":%d}",
                escapeJson(username), now.getEpochSecond(), exp.getEpochSecond());
        String payloadEncoded = Base64.getUrlEncoder().withoutPadding().encodeToString(payloadJson.getBytes(StandardCharsets.UTF_8));
        String dataToSign = headerEncoded + "." + payloadEncoded;
        String signature = computeHmac(dataToSign, secret);
        return dataToSign + "." + signature;
    }

    private String escapeJson(String raw) {
        if (raw == null) {
            return "";
        }
        return raw.replace("\\", "\\\\").replace("\"", "\\\"");
    }
}
