package com.reliablepay.payment.dto;

public class AdminConfigRequest {
    private Integer bankReadTimeoutMs;
    private Long reconcileGraceMs;
    private Long retryBaseDelayMs;
    private Integer retryMaxAttempts;

    public AdminConfigRequest() {
    }

    public AdminConfigRequest(Integer bankReadTimeoutMs, Long reconcileGraceMs, Long retryBaseDelayMs, Integer retryMaxAttempts) {
        this.bankReadTimeoutMs = bankReadTimeoutMs;
        this.reconcileGraceMs = reconcileGraceMs;
        this.retryBaseDelayMs = retryBaseDelayMs;
        this.retryMaxAttempts = retryMaxAttempts;
    }

    public Integer getBankReadTimeoutMs() {
        return bankReadTimeoutMs;
    }

    public void setBankReadTimeoutMs(Integer bankReadTimeoutMs) {
        this.bankReadTimeoutMs = bankReadTimeoutMs;
    }

    public Long getReconcileGraceMs() {
        return reconcileGraceMs;
    }

    public void setReconcileGraceMs(Long reconcileGraceMs) {
        this.reconcileGraceMs = reconcileGraceMs;
    }

    public Long getRetryBaseDelayMs() {
        return retryBaseDelayMs;
    }

    public void setRetryBaseDelayMs(Long retryBaseDelayMs) {
        this.retryBaseDelayMs = retryBaseDelayMs;
    }

    public Integer getRetryMaxAttempts() {
        return retryMaxAttempts;
    }

    public void setRetryMaxAttempts(Integer retryMaxAttempts) {
        this.retryMaxAttempts = retryMaxAttempts;
    }
}
