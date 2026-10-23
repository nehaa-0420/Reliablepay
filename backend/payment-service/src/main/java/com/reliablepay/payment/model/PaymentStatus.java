package com.reliablepay.payment.model;

/**
 * Valid states in the ReliablePay payment lifecycle:
 * INITIATED -> PROCESSING -> SUCCESS | FAILED | RETRYING | UNKNOWN | DEAD_LETTERED
 */
public enum PaymentStatus {
    INITIATED,
    PROCESSING,
    SUCCESS,
    FAILED,
    RETRYING,
    UNKNOWN,
    DEAD_LETTERED
}
