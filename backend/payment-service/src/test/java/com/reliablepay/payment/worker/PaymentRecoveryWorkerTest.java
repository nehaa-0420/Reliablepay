package com.reliablepay.payment.worker;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankStatusResponse;
import com.reliablepay.payment.config.RecoveryProperties;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentEventRepository;
import com.reliablepay.payment.repository.PaymentRepository;
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
class PaymentRecoveryWorkerTest {

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentEventRepository eventRepository;

    @Autowired
    private PaymentRecoveryWorker recoveryWorker;

    @Autowired
    private PaymentReconciliationWorker reconciliationWorker;

    @Autowired
    private RecoveryProperties recoveryProperties;

    @MockBean
    private BankClient bankClient;

    @BeforeEach
    void setUp() {
        reset(bankClient);
    }

    private Payment createProcessingPayment(PaymentMode mode, int secondsAgo) {
        Payment payment = new Payment(
                UUID.randomUUID(),
                "ORD-REC-" + UUID.randomUUID(),
                new BigDecimal("200.00"),
                "INR",
                mode,
                "key-rec-" + UUID.randomUUID(),
                "hash-rec-" + UUID.randomUUID()
        );
        payment.setStatus(PaymentStatus.PROCESSING);
        payment.setAttemptCount(1);
        payment.setUpdatedAt(Instant.now().minusSeconds(secondsAgo));
        payment.setCreatedAt(Instant.now().minusSeconds(secondsAgo));
        return paymentRepository.saveAndFlush(payment);
    }

    @Test
    @DisplayName("Stale PROCESSING payment becomes UNKNOWN and is then reconciled to SUCCESS if charged, with no second bank charge")
    void staleProcessingPaymentBecomesUnknownAndReconcilesToSuccess() {
        // Stale payment: updated 120 seconds ago (> 60s default staleProcessingMs)
        Payment payment = createProcessingPayment(PaymentMode.PROTECTED, 120);

        // Run recovery worker
        recoveryWorker.recoverStaleProcessingPayments();

        // 1. Assert payment transitioned to UNKNOWN with exact event detail
        Payment recovered = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(recovered.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);

        var events = eventRepository.findByPaymentIdOrderByCreatedAtAsc(payment.getId());
        assertThat(events).anyMatch(e ->
                "PROCESSING".equals(e.getFromStatus()) &&
                "UNKNOWN".equals(e.getToStatus()) &&
                "Recovered after interruption: outcome unknown".equals(e.getDetail())
        );

        // 2. Reconcile with bank: bank confirms charged=true
        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), true, 1L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment reconciled = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reconciled.getStatus()).isEqualTo(PaymentStatus.SUCCESS);

        // Verify no second charge call was made!
        verify(bankClient, never()).charge(any(), any(), any());
        verify(bankClient, times(1)).getStatus(eq(payment.getId().toString()));
    }

    @Test
    @DisplayName("Fresh PROCESSING payment (< 60s) is left alone")
    void freshProcessingPaymentIsLeftAlone() {
        // Fresh payment: updated only 10 seconds ago (< 60s threshold)
        Payment payment = createProcessingPayment(PaymentMode.PROTECTED, 10);

        recoveryWorker.recoverStaleProcessingPayments();

        Payment intact = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(intact.getStatus()).isEqualTo(PaymentStatus.PROCESSING);
    }

    @Test
    @DisplayName("Stale NAIVE payment is left alone (only PROTECTED mode payments are recovered; NAIVE stays unsafe)")
    void naiveStaleProcessingPaymentIsLeftAlone() {
        // Stale NAIVE payment: updated 120 seconds ago
        Payment payment = createProcessingPayment(PaymentMode.NAIVE, 120);

        recoveryWorker.recoverStaleProcessingPayments();

        Payment intact = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(intact.getStatus()).isEqualTo(PaymentStatus.PROCESSING);
    }

    @Test
    @DisplayName("Stale PROCESSING payment not charged at bank reconciles to RETRYING for safe re-execution")
    void staleProcessingPaymentNotChargedReconcilesToRetrying() {
        Payment payment = createProcessingPayment(PaymentMode.PROTECTED, 120);

        recoveryWorker.recoverStaleProcessingPayments();

        Payment recovered = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(recovered.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);

        // Bank status: charged=false
        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), false, 0L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment reconciled = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reconciled.getStatus()).isEqualTo(PaymentStatus.RETRYING);
        assertThat(reconciled.getNextRetryAt()).isNotNull();
    }
}
