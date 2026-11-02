package com.reliablepay.payment.event;

import com.reliablepay.payment.dto.PaymentEventPayload;
import com.reliablepay.payment.exception.MaxSubscribersReachedException;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentEventRepository;
import com.reliablepay.payment.service.PaymentStateMachine;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionSynchronizationUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class PaymentEventHubTest {

    private PaymentEventHub eventHub;
    private PaymentEventRepository eventRepository;
    private PaymentStateMachine stateMachine;

    @BeforeEach
    void setUp() {
        eventHub = new PaymentEventHub();
        eventRepository = mock(PaymentEventRepository.class);
        when(eventRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        stateMachine = new PaymentStateMachine(eventRepository, eventHub);
    }

    @AfterEach
    void tearDown() {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.clearSynchronization();
        }
        eventHub.clearAllForTest();
    }

    static class RecordingPaymentEventHub extends PaymentEventHub {
        final List<PaymentEventPayload> publishedEvents = new java.util.concurrent.CopyOnWriteArrayList<>();

        @Override
        public void publish(PaymentEventPayload event) {
            publishedEvents.add(event);
            super.publish(event);
        }
    }

    @Test
    @DisplayName("Exactly one event is published to subscriber per state transition")
    void exactlyOneEventPerTransition() {
        UUID paymentId = UUID.randomUUID();
        Payment payment = new Payment(paymentId, "TEST-REF", new BigDecimal("100.00"), "USD", PaymentMode.PROTECTED, "key-1", "hash-1");

        RecordingPaymentEventHub recordingHub = new RecordingPaymentEventHub();
        PaymentStateMachine sm = new PaymentStateMachine(eventRepository, recordingHub);

        // Perform single transition: INITIATED -> PROCESSING
        sm.transition(payment, PaymentStatus.PROCESSING, "Dispatching to bank");

        // Verify exactly one event was published
        assertThat(recordingHub.publishedEvents).hasSize(1);
        PaymentEventPayload payload = recordingHub.publishedEvents.get(0);
        assertThat(payload.paymentId()).isEqualTo(paymentId);
        assertThat(payload.fromStatus()).isEqualTo(PaymentStatus.INITIATED.name());
        assertThat(payload.toStatus()).isEqualTo(PaymentStatus.PROCESSING.name());
    }

    @Test
    @DisplayName("Zero events published when database transaction rolls back")
    void zeroEventsWhenTransactionRollsBack() {
        UUID paymentId = UUID.randomUUID();
        RecordingPaymentEventHub recordingHub = new RecordingPaymentEventHub();
        PaymentStateMachine sm = new PaymentStateMachine(eventRepository, recordingHub);

        Payment payment = new Payment(paymentId, "TEST-REF-ROLLBACK", new BigDecimal("250.00"), "USD", PaymentMode.PROTECTED, "key-2", "hash-2");

        // Simulate active Spring transaction
        TransactionSynchronizationManager.initSynchronization();
        try {
            sm.transition(payment, PaymentStatus.PROCESSING, "Starting attempt 1");

            // Before commit: publish must NOT have been called yet
            assertThat(recordingHub.publishedEvents).isEmpty();

            // Simulate transaction rollback
            TransactionSynchronizationUtils.triggerAfterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK);

            // After rollback: publish still must NOT have been called
            assertThat(recordingHub.publishedEvents).isEmpty();
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("Event is published strictly after transaction commit")
    void eventPublishedAfterCommit() {
        UUID paymentId = UUID.randomUUID();
        RecordingPaymentEventHub recordingHub = new RecordingPaymentEventHub();
        PaymentStateMachine sm = new PaymentStateMachine(eventRepository, recordingHub);

        Payment payment = new Payment(paymentId, "TEST-REF-COMMIT", new BigDecimal("50.00"), "USD", PaymentMode.PROTECTED, "key-3", "hash-3");

        TransactionSynchronizationManager.initSynchronization();
        try {
            sm.transition(payment, PaymentStatus.PROCESSING, "Starting attempt 1");

            // Prior to commit: not published
            assertThat(recordingHub.publishedEvents).isEmpty();

            // Trigger afterCommit
            TransactionSynchronizationUtils.triggerAfterCommit();

            // After commit: exactly 1 event published
            assertThat(recordingHub.publishedEvents).hasSize(1);
            assertThat(recordingHub.publishedEvents.get(0).paymentId()).isEqualTo(paymentId);
        } finally {
            TransactionSynchronizationManager.clearSynchronization();
        }
    }

    @Test
    @DisplayName("Hub enforces maximum capacity of 200 subscribers")
    void hubEnforcesSubscriberCap() {
        List<SseEmitter> emitters = new ArrayList<>();
        UUID testId = UUID.randomUUID();

        // Allocate up to 200 subscribers
        for (int i = 0; i < 200; i++) {
            emitters.add(eventHub.subscribePayment(testId));
        }
        assertThat(eventHub.getSubscriberCount()).isEqualTo(200);

        // 201st subscriber must throw MaxSubscribersReachedException
        assertThatThrownBy(() -> eventHub.subscribePayment(testId))
                .isInstanceOf(MaxSubscribersReachedException.class)
                .hasMessageContaining("200");

        assertThatThrownBy(() -> eventHub.subscribeAdmin())
                .isInstanceOf(MaxSubscribersReachedException.class);
    }

    @Test
    @DisplayName("Terminal status detection identifies SUCCESS, FAILED, and DEAD_LETTERED")
    void terminalStatusDetection() {
        assertThat(eventHub.isTerminalStatus(PaymentStatus.SUCCESS)).isTrue();
        assertThat(eventHub.isTerminalStatus(PaymentStatus.FAILED)).isTrue();
        assertThat(eventHub.isTerminalStatus(PaymentStatus.DEAD_LETTERED)).isTrue();
        assertThat(eventHub.isTerminalStatus(PaymentStatus.PROCESSING)).isFalse();
        assertThat(eventHub.isTerminalStatus(PaymentStatus.RETRYING)).isFalse();
        assertThat(eventHub.isTerminalStatus(PaymentStatus.UNKNOWN)).isFalse();
        assertThat(eventHub.isTerminalStatus(PaymentStatus.INITIATED)).isFalse();
    }
}
