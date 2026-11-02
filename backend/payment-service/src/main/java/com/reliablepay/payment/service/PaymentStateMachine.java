package com.reliablepay.payment.service;

import com.reliablepay.payment.dto.PaymentEventPayload;
import com.reliablepay.payment.event.PaymentEventHub;
import com.reliablepay.payment.exception.InvalidStateTransitionException;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentEvent;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentEventRepository;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Instant;
import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

/**
 * PaymentStateMachine: Central authority for allowed lifecycle transitions.
 * Enforces strict transitions and writes audit records to payment_events on every transition.
 * Publishes events to PaymentEventHub strictly after transaction commit.
 */
@Component
public class PaymentStateMachine {

    private final PaymentEventRepository eventRepository;
    private final PaymentEventHub eventHub;

    private static final Map<PaymentStatus, Set<PaymentStatus>> ALLOWED_TRANSITIONS = new EnumMap<>(PaymentStatus.class);

    static {
        // INITIATED -> PROCESSING
        ALLOWED_TRANSITIONS.put(PaymentStatus.INITIATED, Set.of(PaymentStatus.PROCESSING));

        // PROCESSING -> SUCCESS | FAILED | RETRYING | UNKNOWN | DEAD_LETTERED
        ALLOWED_TRANSITIONS.put(PaymentStatus.PROCESSING, Set.of(
                PaymentStatus.SUCCESS,
                PaymentStatus.FAILED,
                PaymentStatus.RETRYING,
                PaymentStatus.UNKNOWN,
                PaymentStatus.DEAD_LETTERED
        ));

        // RETRYING -> PROCESSING | DEAD_LETTERED
        ALLOWED_TRANSITIONS.put(PaymentStatus.RETRYING, Set.of(
                PaymentStatus.PROCESSING,
                PaymentStatus.DEAD_LETTERED
        ));

        // UNKNOWN -> SUCCESS | FAILED | RETRYING (resolved by reconciliation in Phase 3)
        ALLOWED_TRANSITIONS.put(PaymentStatus.UNKNOWN, Set.of(
                PaymentStatus.SUCCESS,
                PaymentStatus.FAILED,
                PaymentStatus.RETRYING
        ));

        // Terminal states
        ALLOWED_TRANSITIONS.put(PaymentStatus.SUCCESS, Set.of());
        ALLOWED_TRANSITIONS.put(PaymentStatus.FAILED, Set.of());
        // DEAD_LETTERED -> RETRYING allowed on manual requeue
        ALLOWED_TRANSITIONS.put(PaymentStatus.DEAD_LETTERED, Set.of(PaymentStatus.RETRYING));
    }

    @org.springframework.beans.factory.annotation.Autowired
    public PaymentStateMachine(PaymentEventRepository eventRepository, PaymentEventHub eventHub) {
        this.eventRepository = eventRepository;
        this.eventHub = eventHub;
    }

    public PaymentStateMachine(PaymentEventRepository eventRepository) {
        this(eventRepository, null);
    }

    /**
     * Validates and applies a state transition, recording an append-only audit event.
     */
    public Payment transition(Payment payment, PaymentStatus targetStatus, String detail) {
        PaymentStatus currentStatus = payment.getStatus();

        if (currentStatus == null) {
            if (targetStatus != PaymentStatus.INITIATED) {
                throw new InvalidStateTransitionException("New payment must start in INITIATED state, got: " + targetStatus);
            }
        } else if (currentStatus == PaymentStatus.INITIATED && targetStatus == PaymentStatus.INITIATED) {
            // Initializing/confirming initial state for newly created payment
            payment.setUpdatedAt(Instant.now());
            PaymentEvent event = new PaymentEvent(
                    payment.getId(),
                    null,
                    PaymentStatus.INITIATED.name(),
                    detail
            );
            PaymentEvent savedEvent = eventRepository.save(event);
            publishCommittedEvent(payment, savedEvent, null, PaymentStatus.INITIATED.name(), detail);
            return payment;
        } else {
            Set<PaymentStatus> allowed = ALLOWED_TRANSITIONS.getOrDefault(currentStatus, Set.of());
            if (!allowed.contains(targetStatus)) {
                throw new InvalidStateTransitionException(
                        String.format("Invalid state transition from %s to %s for payment %s",
                                currentStatus, targetStatus, payment.getId())
                );
            }
        }

        payment.setStatus(targetStatus);
        payment.setUpdatedAt(Instant.now());

        PaymentEvent event = new PaymentEvent(
                payment.getId(),
                currentStatus != null ? currentStatus.name() : null,
                targetStatus.name(),
                detail
        );
        PaymentEvent savedEvent = eventRepository.save(event);
        publishCommittedEvent(payment, savedEvent, currentStatus != null ? currentStatus.name() : null, targetStatus.name(), detail);

        return payment;
    }

    private void publishCommittedEvent(Payment payment, PaymentEvent savedEvent, String fromStatus, String toStatus, String detail) {
        if (eventHub == null) {
            return;
        }

        Long eventId = savedEvent != null ? savedEvent.getId() : null;
        Instant occurredAt = (savedEvent != null && savedEvent.getCreatedAt() != null)
                ? savedEvent.getCreatedAt()
                : Instant.now();

        PaymentEventPayload payload = new PaymentEventPayload(
                eventId,
                payment.getId(),
                payment.getMerchantRef(),
                payment.getAmount(),
                payment.getCurrency(),
                payment.getMode() != null ? payment.getMode().name() : null,
                fromStatus,
                toStatus,
                detail,
                payment.getAttemptCount(),
                occurredAt
        );

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    eventHub.publish(payload);
                }
            });
        } else {
            eventHub.publish(payload);
        }
    }

    public boolean canTransition(PaymentStatus from, PaymentStatus to) {
        if (from == null) {
            return to == PaymentStatus.INITIATED;
        }
        return ALLOWED_TRANSITIONS.getOrDefault(from, Set.of()).contains(to);
    }
}
