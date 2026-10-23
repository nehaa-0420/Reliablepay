package com.reliablepay.payment.model;

/**
 * Operating mode:
 * PROTECTED = Idempotency key required, unique check enforced, retry-safe.
 * NAIVE = Idempotency check bypassed, blind retries produce duplicates (for baseline comparison).
 */
public enum PaymentMode {
    PROTECTED,
    NAIVE
}
