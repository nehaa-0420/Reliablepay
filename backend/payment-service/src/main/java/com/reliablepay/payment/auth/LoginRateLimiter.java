package com.reliablepay.payment.auth;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * Thread-safe rate limiter tracking failed administrative login attempts.
 * Enforces a maximum of 5 failed attempts per minute per IP address.
 */
@Component
public class LoginRateLimiter {

    public static final int MAX_FAILED_ATTEMPTS = 5;
    public static final long WINDOW_MS = 60_000L; // 1 minute

    private final ConcurrentHashMap<String, ConcurrentLinkedQueue<Long>> failedAttemptsPerIp = new ConcurrentHashMap<>();

    /**
     * Checks whether an IP address is blocked due to 5 or more failed attempts within 60 seconds.
     */
    public boolean isBlocked(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }

        ConcurrentLinkedQueue<Long> attempts = failedAttemptsPerIp.get(ip);
        if (attempts == null || attempts.isEmpty()) {
            return false;
        }

        long cutoff = System.currentTimeMillis() - WINDOW_MS;
        cleanOldAttempts(attempts, cutoff);
        return attempts.size() >= MAX_FAILED_ATTEMPTS;
    }

    /**
     * Records a failed login attempt for the given IP address.
     */
    public void recordFailure(String ip) {
        if (ip == null || ip.isBlank()) {
            return;
        }

        long now = System.currentTimeMillis();
        long cutoff = now - WINDOW_MS;

        failedAttemptsPerIp.compute(ip, (k, attempts) -> {
            if (attempts == null) {
                attempts = new ConcurrentLinkedQueue<>();
            }
            cleanOldAttempts(attempts, cutoff);
            attempts.add(now);
            return attempts;
        });
    }

    /**
     * Records a failed login attempt with an explicit timestamp (package-private for testing expiration).
     */
    void recordFailureAt(String ip, long timestamp) {
        if (ip == null || ip.isBlank()) {
            return;
        }
        long cutoff = System.currentTimeMillis() - WINDOW_MS;
        failedAttemptsPerIp.compute(ip, (k, attempts) -> {
            if (attempts == null) {
                attempts = new ConcurrentLinkedQueue<>();
            }
            cleanOldAttempts(attempts, cutoff);
            attempts.add(timestamp);
            return attempts;
        });
    }

    /**
     * Resets failed login counters upon a successful login.
     */
    public void recordSuccess(String ip) {
        if (ip != null) {
            failedAttemptsPerIp.remove(ip);
        }
    }

    private void cleanOldAttempts(ConcurrentLinkedQueue<Long> attempts, long cutoff) {
        Long head;
        while ((head = attempts.peek()) != null && head < cutoff) {
            attempts.poll();
        }
    }

    public void reset() {
        failedAttemptsPerIp.clear();
    }
}
