package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankStatusResponse;
import com.reliablepay.payment.config.ReconcileProperties;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentRepository;
import com.reliablepay.payment.worker.PaymentReconciliationWorker;
import com.reliablepay.payment.worker.PaymentRetryWorker;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest
class PaymentReconciliationTest {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentReconciliationWorker reconciliationWorker;

    @Autowired
    private PaymentRetryWorker retryWorker;

    @Autowired
    private ReconcileProperties reconcileProperties;

    @MockBean
    private BankClient bankClient;

    @BeforeEach
    void setUp() {
        reset(bankClient);
    }

    private Payment createUnknownPayment(int secondsAgo) {
        Payment payment = new Payment(
                UUID.randomUUID(),
                "ORD-REC-" + UUID.randomUUID(),
                new BigDecimal("150.00"),
                "INR",
                PaymentMode.PROTECTED,
                "key-rec-" + UUID.randomUUID(),
                "hash-rec-" + UUID.randomUUID()
        );
        payment.setStatus(PaymentStatus.UNKNOWN);
        payment.setAttemptCount(1);
        payment.setLastError("Bank call timed out");
        payment.setUpdatedAt(Instant.now().minusSeconds(secondsAgo));
        payment.setCreatedAt(Instant.now().minusSeconds(secondsAgo));
        return paymentRepository.saveAndFlush(payment);
    }

    @Test
    @DisplayName("UNKNOWN + bank confirms charged -> resolves to SUCCESS with no second bank charge call")
    void unknownChargedResolvesToSuccess() {
        // Payment timed out 10s ago (exceeding 6s grace period)
        Payment payment = createUnknownPayment(10);

        // Bank status reports charged=true
        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), true, 1L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment reconciled = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reconciled.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(reconciled.getLastError()).isNull();
        assertThat(reconciled.getNextRetryAt()).isNull();

        // Bank charge endpoint was NEVER called again
        verify(bankClient, never()).charge(any(), any(), any());
        verify(bankClient, times(1)).getStatus(eq(payment.getId().toString()));
    }

    @Test
    @DisplayName("UNKNOWN + bank reports not charged -> moves to RETRYING and is retried")
    void unknownNotChargedMovesToRetrying() {
        Payment payment = createUnknownPayment(10);

        // Bank status reports charged=false
        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), false, 0L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment reconciled = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reconciled.getStatus()).isEqualTo(PaymentStatus.RETRYING);
        assertThat(reconciled.getNextRetryAt()).isNotNull();
        assertThat(reconciled.getNextRetryAt()).isBeforeOrEqualTo(Instant.now().plusMillis(500));

        verify(bankClient, times(1)).getStatus(eq(payment.getId().toString()));
    }

    @Test
    @DisplayName("UNKNOWN payment younger than the grace period is skipped by reconciliation worker")
    void youngUnknownPaymentIsSkipped() {
        // Payment timed out just 1s ago (grace period is 6s)
        Payment payment = createUnknownPayment(1);

        reconciliationWorker.reconcileUnknownPayments();

        Payment skipped = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(skipped.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);

        // Bank getStatus was not called for this payment
        verify(bankClient, never()).getStatus(eq(payment.getId().toString()));
    }
}
