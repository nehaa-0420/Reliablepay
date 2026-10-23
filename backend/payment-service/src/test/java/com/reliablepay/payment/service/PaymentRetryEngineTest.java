package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankCallResult;
import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankOutcome;
import com.reliablepay.payment.config.RetryProperties;
import com.reliablepay.payment.model.*;
import com.reliablepay.payment.repository.PaymentAttemptRepository;
import com.reliablepay.payment.repository.PaymentEventRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import com.reliablepay.payment.worker.PaymentRetryWorker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
class PaymentRetryEngineTest {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentAttemptRepository paymentAttemptRepository;

    @Autowired
    private PaymentEventRepository paymentEventRepository;

    @Autowired
    private PaymentProcessingService processingService;

    @Autowired
    private PaymentRetryWorker retryWorker;

    @Autowired
    private RetryProperties retryProperties;

    @MockBean
    private BankClient bankClient;

    @BeforeEach
    void setUp() {
        reset(bankClient);
    }

    private Payment createTestPayment() {
        Payment payment = new Payment(
                UUID.randomUUID(),
                "ORD-" + UUID.randomUUID(),
                new BigDecimal("250.00"),
                "INR",
                PaymentMode.PROTECTED,
                "key-" + UUID.randomUUID(),
                "hash-" + UUID.randomUUID()
        );
        payment.setStatus(PaymentStatus.INITIATED);
        return paymentRepository.saveAndFlush(payment);
    }

    @Test
    @DisplayName("Successful bank call moves payment to SUCCESS with single attempt")
    void successfulBankCall() {
        Payment payment = createTestPayment();

        when(bankClient.charge(eq(payment.getId().toString()), any(), any(BigDecimal.class)))
                .thenReturn(new BankCallResult(BankOutcome.SUCCESS, 120, null, "{\"status\":\"CHARGED\"}"));

        processingService.processPayment(payment.getId());

        Payment updated = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(updated.getAttemptCount()).isEqualTo(1);
        assertThat(updated.getNextRetryAt()).isNull();

        List<PaymentAttempt> attempts = paymentAttemptRepository.findByPaymentIdOrderByAttemptNoAsc(payment.getId());
        assertThat(attempts).hasSize(1);
        assertThat(attempts.get(0).getOutcome()).isEqualTo("SUCCESS");
        assertThat(attempts.get(0).getAttemptNo()).isEqualTo(1);

        verify(bankClient, times(1)).charge(eq(payment.getId().toString()), any(), any());
    }

    @Test
    @DisplayName("Transient 503 CHANNEL_FAILURE moves to RETRYING, subsequent attempt succeeds")
    void transientFailureThenSuccess() {
        Payment payment = createTestPayment();

        // Attempt 1 fails with CHANNEL_FAILURE
        when(bankClient.charge(eq(payment.getId().toString()), any(), any(BigDecimal.class)))
                .thenReturn(new BankCallResult(BankOutcome.CHANNEL_FAILURE, 200, "CHANNEL_FAILURE", "Service Unavailable"))
                .thenReturn(new BankCallResult(BankOutcome.SUCCESS, 150, null, "{\"status\":\"CHARGED\"}"));

        processingService.processPayment(payment.getId());

        Payment afterFirst = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(afterFirst.getStatus()).isEqualTo(PaymentStatus.RETRYING);
        assertThat(afterFirst.getAttemptCount()).isEqualTo(1);
        assertThat(afterFirst.getNextRetryAt()).isNotNull();

        // Simulate retry worker: set next_retry_at to past so worker picks it up
        afterFirst.setNextRetryAt(Instant.now().minusSeconds(1));
        paymentRepository.saveAndFlush(afterFirst);

        // Run retry worker
        retryWorker.processDueRetries();

        // Allow async worker task to complete if needed
        Payment afterRetry = null;
        for (int i = 0; i < 20; i++) {
            afterRetry = paymentRepository.findById(payment.getId()).orElseThrow();
            if (afterRetry.getStatus() == PaymentStatus.SUCCESS) {
                break;
            }
            try { Thread.sleep(100); } catch (InterruptedException ignored) {}
        }

        assertThat(afterRetry.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(afterRetry.getAttemptCount()).isEqualTo(2);

        List<PaymentAttempt> attempts = paymentAttemptRepository.findByPaymentIdOrderByAttemptNoAsc(payment.getId());
        assertThat(attempts).hasSize(2);
        assertThat(attempts.get(0).getOutcome()).isEqualTo("CHANNEL_FAILURE");
        assertThat(attempts.get(1).getOutcome()).isEqualTo("SUCCESS");

        verify(bankClient, times(2)).charge(eq(payment.getId().toString()), any(), any());
    }

    @Test
    @DisplayName("Continuous failures exhaust max attempts and move payment to DEAD_LETTERED")
    void maxAttemptsExhaustedMovesToDeadLettered() {
        Payment payment = createTestPayment();
        int maxAttempts = retryProperties.getMaxAttempts(); // 4

        when(bankClient.charge(eq(payment.getId().toString()), any(), any(BigDecimal.class)))
                .thenReturn(new BankCallResult(BankOutcome.ERROR, 100, "BANK_ERROR_500", "Internal Server Error"));

        // Process through all attempts
        for (int attempt = 1; attempt <= maxAttempts; attempt++) {
            Payment current = paymentRepository.findById(payment.getId()).orElseThrow();
            if (current.getStatus() == PaymentStatus.RETRYING) {
                current.setNextRetryAt(Instant.now().minusSeconds(1));
                paymentRepository.saveAndFlush(current);
                retryWorker.processDueRetries();
                // Wait for worker
                for (int w = 0; w < 20; w++) {
                    Payment p = paymentRepository.findById(payment.getId()).orElseThrow();
                    if (p.getAttemptCount() == attempt && p.getStatus() != PaymentStatus.PROCESSING) {
                        break;
                    }
                    try { Thread.sleep(50); } catch (InterruptedException ignored) {}
                }
            } else {
                processingService.processPayment(payment.getId());
            }
        }

        Payment finalPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(finalPayment.getStatus()).isEqualTo(PaymentStatus.DEAD_LETTERED);
        assertThat(finalPayment.getAttemptCount()).isEqualTo(maxAttempts);
        assertThat(finalPayment.getNextRetryAt()).isNull();

        List<PaymentAttempt> attempts = paymentAttemptRepository.findByPaymentIdOrderByAttemptNoAsc(payment.getId());
        assertThat(attempts).hasSize(maxAttempts);
        assertThat(attempts.get(maxAttempts - 1).getOutcome()).isEqualTo("ERROR");

        verify(bankClient, times(maxAttempts)).charge(eq(payment.getId().toString()), any(), any());
    }

    @Test
    @DisplayName("Bank client timeout transitions payment to UNKNOWN and retry worker does NOT retry it")
    void timeoutLeadsToUnknownAndNoSecondCall() {
        Payment payment = createTestPayment();

        when(bankClient.charge(eq(payment.getId().toString()), any(), any(BigDecimal.class)))
                .thenReturn(new BankCallResult(BankOutcome.TIMEOUT, 2050, "TIMEOUT", "Read timed out"));

        processingService.processPayment(payment.getId());

        Payment updated = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(updated.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
        assertThat(updated.getAttemptCount()).isEqualTo(1);
        assertThat(updated.getNextRetryAt()).isNull();

        // Run retry worker - should NOT pick up UNKNOWN payments
        retryWorker.processDueRetries();

        Payment afterWorker = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(afterWorker.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
        assertThat(afterWorker.getAttemptCount()).isEqualTo(1);

        // Bank was called exactly once; never retried blindly
        verify(bankClient, times(1)).charge(eq(payment.getId().toString()), any(), any());
    }
}
