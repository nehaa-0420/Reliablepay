package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.config.BankProperties;
import com.reliablepay.payment.config.ReconcileProperties;
import com.reliablepay.payment.config.RetryProperties;
import com.reliablepay.payment.dto.AdminConfigRequest;
import com.reliablepay.payment.dto.AdminConfigResponse;
import com.reliablepay.payment.repository.IdempotencyRecordRepository;
import com.reliablepay.payment.repository.PaymentAttemptRepository;
import com.reliablepay.payment.repository.PaymentEventRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AdminService {

    private static final Logger log = LoggerFactory.getLogger(AdminService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final PaymentEventRepository paymentEventRepository;
    private final IdempotencyRecordRepository idempotencyRecordRepository;
    private final BankClient bankClient;
    private final BankProperties bankProperties;
    private final ReconcileProperties reconcileProperties;
    private final RetryProperties retryProperties;
    private final boolean adminResetEnabled;

    public AdminService(PaymentRepository paymentRepository,
                        PaymentAttemptRepository paymentAttemptRepository,
                        PaymentEventRepository paymentEventRepository,
                        IdempotencyRecordRepository idempotencyRecordRepository,
                        BankClient bankClient,
                        BankProperties bankProperties,
                        ReconcileProperties reconcileProperties,
                        RetryProperties retryProperties,
                        @Value("${app.admin-reset-enabled:true}") boolean adminResetEnabled) {
        this.paymentRepository = paymentRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.paymentEventRepository = paymentEventRepository;
        this.idempotencyRecordRepository = idempotencyRecordRepository;
        this.bankClient = bankClient;
        this.bankProperties = bankProperties;
        this.reconcileProperties = reconcileProperties;
        this.retryProperties = retryProperties;
        this.adminResetEnabled = adminResetEnabled;
    }

    public AdminConfigResponse getConfig() {
        return new AdminConfigResponse(
                bankProperties.getReadTimeoutMs(),
                reconcileProperties.getGraceMs(),
                retryProperties.getBaseDelayMs(),
                retryProperties.getMaxAttempts()
        );
    }

    public AdminConfigResponse updateConfig(AdminConfigRequest request) {
        if (request.getBankReadTimeoutMs() != null) {
            bankClient.updateReadTimeout(request.getBankReadTimeoutMs());
        }
        if (request.getReconcileGraceMs() != null) {
            reconcileProperties.setGraceMs(request.getReconcileGraceMs());
            log.info("Reconciliation grace period updated to {}ms", request.getReconcileGraceMs());
        }
        if (request.getRetryBaseDelayMs() != null) {
            retryProperties.setBaseDelayMs(request.getRetryBaseDelayMs());
            log.info("Retry base delay updated to {}ms", request.getRetryBaseDelayMs());
        }
        if (request.getRetryMaxAttempts() != null) {
            retryProperties.setMaxAttempts(request.getRetryMaxAttempts());
            log.info("Retry max attempts updated to {}", request.getRetryMaxAttempts());
        }
        return getConfig();
    }

    public boolean isAdminResetEnabled() {
        return adminResetEnabled;
    }

    @Transactional
    public void resetAll() {
        if (!adminResetEnabled) {
            throw new SecurityException("Admin reset is disabled by configuration");
        }

        paymentAttemptRepository.deleteAllInBatch();
        paymentEventRepository.deleteAllInBatch();
        paymentRepository.deleteAllInBatch();
        idempotencyRecordRepository.deleteAllInBatch();

        try {
            bankClient.reset();
        } catch (Exception e) {
            log.warn("Failed to reset bank service: {}", e.getMessage());
        }

        log.info("System fully reset: payments, attempts, events, idempotency keys cleared and bank reset");
    }
}
