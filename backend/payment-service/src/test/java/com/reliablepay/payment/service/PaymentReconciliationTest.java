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

    @Test
    @DisplayName("charged == true -> SUCCESS even if count is 0 or missing (logs WARN)")
    void unknownChargedZeroCountOrMissingResolvesToSuccess() {
        Payment payment = createUnknownPayment(10);

        // Bank reports charged=true but count=0
        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), true, 0L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment reconciled = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reconciled.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(reconciled.getNextRetryAt()).isNull();
        verify(bankClient, never()).charge(any(), any(), any());
    }

    @Test
    @DisplayName("charged == false and count == 0 -> RETRYING for immediate retry")
    void unknownNotChargedZeroCountMovesToRetrying() {
        Payment payment = createUnknownPayment(10);

        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), false, 0L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment reconciled = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(reconciled.getStatus()).isEqualTo(PaymentStatus.RETRYING);
        assertThat(reconciled.getNextRetryAt()).isNotNull();
    }

    @Test
    @DisplayName("Contradictory status (charged == false but count > 0) -> keeps UNKNOWN, does NOT retry")
    void contradictoryStatusKeepsUnknownNoRetry() {
        Payment payment = createUnknownPayment(10);

        // Contradictory: reported not charged, but charge count is 2!
        when(bankClient.getStatus(eq(payment.getId().toString())))
                .thenReturn(new BankStatusResponse(payment.getId().toString(), false, 2L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment kept = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(kept.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
        assertThat(kept.getNextRetryAt()).isNull();
        assertThat(kept.getLastError()).contains("Reconciliation anomaly: contradictory or missing bank status");
    }

    @Test
    @DisplayName("Missing fields (charged == null or count == null) -> keeps UNKNOWN, does NOT retry")
    void missingFieldsKeepsUnknownNoRetry() {
        Payment payment1 = createUnknownPayment(10);

        // Missing charged field
        when(bankClient.getStatus(eq(payment1.getId().toString())))
                .thenReturn(new BankStatusResponse(payment1.getId().toString(), null, 0L));

        reconciliationWorker.reconcileUnknownPayments();

        Payment kept1 = paymentRepository.findById(payment1.getId()).orElseThrow();
        assertThat(kept1.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
        assertThat(kept1.getNextRetryAt()).isNull();

        Payment payment2 = createUnknownPayment(10);
        // Missing count field when charged is false
        when(bankClient.getStatus(eq(payment2.getId().toString())))
                .thenReturn(new BankStatusResponse(payment2.getId().toString(), false, null));

        reconciliationWorker.reconcileUnknownPayments();

        Payment kept2 = paymentRepository.findById(payment2.getId()).orElseThrow();
        assertThat(kept2.getStatus()).isEqualTo(PaymentStatus.UNKNOWN);
        assertThat(kept2.getNextRetryAt()).isNull();
    }

    @Test
    @DisplayName("BankStatusResponse deserialization: only chargeCount, only count, both, missing, contradictory")
    void bankStatusDeserializationAllVariants() throws Exception {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // 1. Only chargeCount
        String jsonChargeCount = "{\"paymentRef\":\"ref-1\",\"charged\":true,\"chargeCount\":1}";
        BankStatusResponse res1 = mapper.readValue(jsonChargeCount, BankStatusResponse.class);
        assertThat(res1.paymentRef()).isEqualTo("ref-1");
        assertThat(res1.charged()).isTrue();
        assertThat(res1.count()).isEqualTo(1L);

        // 2. Only count
        String jsonCount = "{\"paymentRef\":\"ref-2\",\"charged\":false,\"count\":0}";
        BankStatusResponse res2 = mapper.readValue(jsonCount, BankStatusResponse.class);
        assertThat(res2.paymentRef()).isEqualTo("ref-2");
        assertThat(res2.charged()).isFalse();
        assertThat(res2.count()).isEqualTo(0L);

        // 3. Both chargeCount and count
        String jsonBoth = "{\"paymentRef\":\"ref-3\",\"charged\":true,\"chargeCount\":3,\"count\":3}";
        BankStatusResponse res3 = mapper.readValue(jsonBoth, BankStatusResponse.class);
        assertThat(res3.charged()).isTrue();
        assertThat(res3.count()).isEqualTo(3L);

        // 4. Missing fields
        String jsonMissingCharged = "{\"paymentRef\":\"ref-4\",\"count\":1}";
        BankStatusResponse resMissingCharged = mapper.readValue(jsonMissingCharged, BankStatusResponse.class);
        assertThat(resMissingCharged.charged()).isNull();
        assertThat(resMissingCharged.count()).isEqualTo(1L);

        String jsonMissingCount = "{\"paymentRef\":\"ref-5\",\"charged\":false}";
        BankStatusResponse resMissingCount = mapper.readValue(jsonMissingCount, BankStatusResponse.class);
        assertThat(resMissingCount.charged()).isFalse();
        assertThat(resMissingCount.count()).isNull();

        String jsonMissingBoth = "{\"paymentRef\":\"ref-6\"}";
        BankStatusResponse resMissingBoth = mapper.readValue(jsonMissingBoth, BankStatusResponse.class);
        assertThat(resMissingBoth.charged()).isNull();
        assertThat(resMissingBoth.count()).isNull();

        // 5. Contradictory (charged == false but count > 0)
        String jsonContradictory = "{\"paymentRef\":\"ref-7\",\"charged\":false,\"count\":5}";
        BankStatusResponse resContradictory = mapper.readValue(jsonContradictory, BankStatusResponse.class);
        assertThat(resContradictory.charged()).isFalse();
        assertThat(resContradictory.count()).isEqualTo(5L);
    }
}
