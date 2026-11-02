package com.reliablepay.payment.event;

import com.reliablepay.payment.dto.PaymentEventPayload;
import com.reliablepay.payment.exception.MaxSubscribersReachedException;
import com.reliablepay.payment.model.PaymentStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Thread-safe in-memory event hub for Server-Sent Events (SSE).
 * Dispatches payment lifecycle transitions to customer and administrative subscribers.
 * Enforces subscriber capacity limits (max 200) and sends periodic 15s heartbeat comments.
 */
@Component
public class PaymentEventHub {

    private static final Logger log = LoggerFactory.getLogger(PaymentEventHub.class);

    public static final int MAX_SUBSCRIBERS = 200;
    private static final long SSE_TIMEOUT = 30 * 60 * 1000L; // 30 minutes

    private final AtomicInteger subscriberCount = new AtomicInteger(0);

    // Customer emitters mapped per paymentId
    private final ConcurrentHashMap<UUID, Set<SseEmitter>> paymentSubscribers = new ConcurrentHashMap<>();

    // Administrative emitters subscribed to all transitions
    private final Set<SseEmitter> adminSubscribers = ConcurrentHashMap.newKeySet();

    private final ScheduledExecutorService scheduledExecutor = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "sse-event-hub-worker");
        t.setDaemon(true);
        return t;
    });

    /**
     * Subscribes a customer client to events for a specific payment ID.
     */
    public SseEmitter subscribePayment(UUID paymentId) {
        acquireSubscriberSlot();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        paymentSubscribers.compute(paymentId, (k, set) -> {
            if (set == null) {
                set = ConcurrentHashMap.newKeySet();
            }
            set.add(emitter);
            return set;
        });

        Runnable cleanup = () -> removePaymentSubscriber(paymentId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> {
            try {
                emitter.complete();
            } catch (Exception ignored) {}
            cleanup.run();
        });
        emitter.onError(e -> {
            try {
                emitter.completeWithError(e);
            } catch (Exception ignored) {}
            cleanup.run();
        });

        return emitter;
    }

    /**
     * Subscribes an administrative client to all payment transitions.
     */
    public SseEmitter subscribeAdmin() {
        acquireSubscriberSlot();
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);

        adminSubscribers.add(emitter);

        Runnable cleanup = () -> removeAdminSubscriber(emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(() -> {
            try {
                emitter.complete();
            } catch (Exception ignored) {}
            cleanup.run();
        });
        emitter.onError(e -> {
            try {
                emitter.completeWithError(e);
            } catch (Exception ignored) {}
            cleanup.run();
        });

        return emitter;
    }

    /**
     * Publishes a committed payment transition event to relevant customer and admin emitters.
     */
    public void publish(PaymentEventPayload event) {
        if (event == null) {
            return;
        }

        // 1. Dispatch to admin subscribers (all transitions)
        for (SseEmitter emitter : adminSubscribers) {
            try {
                emitter.send(SseEmitter.event().name("transition").data(event));
            } catch (Exception ex) {
                log.debug("Failed sending transition event to admin emitter: {}", ex.getMessage());
                removeAdminSubscriber(emitter);
            }
        }

        // 2. Dispatch to customer subscribers for this specific payment
        Set<SseEmitter> emitters = paymentSubscribers.get(event.paymentId());
        if (emitters != null && !emitters.isEmpty()) {
            for (SseEmitter emitter : emitters) {
                try {
                    emitter.send(SseEmitter.event().name("transition").data(event));
                } catch (Exception ex) {
                    log.debug("Failed sending transition event to payment emitter {}: {}", event.paymentId(), ex.getMessage());
                    removePaymentSubscriber(event.paymentId(), emitter);
                }
            }

            // Close stream shortly after reaching a terminal status (SUCCESS, FAILED, DEAD_LETTERED)
            if (isTerminalStatus(event.toStatus())) {
                scheduledExecutor.schedule(() -> closePaymentSubscribers(event.paymentId()), 500, TimeUnit.MILLISECONDS);
            }
        }
    }

    /**
     * Scheduled heartbeat comment every 15s to maintain active SSE connections across reverse proxies.
     */
    @Scheduled(fixedRate = 15000)
    public void sendHeartbeat() {
        for (SseEmitter emitter : adminSubscribers) {
            try {
                emitter.send(SseEmitter.event().comment("heartbeat"));
            } catch (Exception ex) {
                removeAdminSubscriber(emitter);
            }
        }

        for (var entry : paymentSubscribers.entrySet()) {
            UUID paymentId = entry.getKey();
            for (SseEmitter emitter : entry.getValue()) {
                try {
                    emitter.send(SseEmitter.event().comment("heartbeat"));
                } catch (Exception ex) {
                    removePaymentSubscriber(paymentId, emitter);
                }
            }
        }
    }

    /**
     * Helper to schedule closing an individual emitter shortly after sending terminal snapshot.
     */
    public void scheduleClose(UUID paymentId, SseEmitter emitter, long delayMs) {
        scheduledExecutor.schedule(() -> {
            try {
                emitter.complete();
            } catch (Exception ignored) {}
            removePaymentSubscriber(paymentId, emitter);
        }, delayMs, TimeUnit.MILLISECONDS);
    }

    public boolean isTerminalStatus(PaymentStatus status) {
        return status != null && isTerminalStatus(status.name());
    }

    public boolean isTerminalStatus(String status) {
        if (status == null) {
            return false;
        }
        return PaymentStatus.SUCCESS.name().equalsIgnoreCase(status)
                || PaymentStatus.FAILED.name().equalsIgnoreCase(status)
                || PaymentStatus.DEAD_LETTERED.name().equalsIgnoreCase(status);
    }

    private void acquireSubscriberSlot() {
        if (subscriberCount.incrementAndGet() > MAX_SUBSCRIBERS) {
            subscriberCount.decrementAndGet();
            throw new MaxSubscribersReachedException("Maximum SSE subscriber capacity (200) reached. Please retry later.");
        }
    }

    private void removePaymentSubscriber(UUID paymentId, SseEmitter emitter) {
        paymentSubscribers.computeIfPresent(paymentId, (k, set) -> {
            if (set.remove(emitter)) {
                subscriberCount.decrementAndGet();
            }
            return set.isEmpty() ? null : set;
        });
    }

    private void removeAdminSubscriber(SseEmitter emitter) {
        if (adminSubscribers.remove(emitter)) {
            subscriberCount.decrementAndGet();
        }
    }

    private void closePaymentSubscribers(UUID paymentId) {
        Set<SseEmitter> toClose = paymentSubscribers.remove(paymentId);
        if (toClose != null) {
            for (SseEmitter emitter : toClose) {
                try {
                    emitter.complete();
                } catch (Exception ignored) {}
                subscriberCount.decrementAndGet();
            }
        }
    }

    public int getSubscriberCount() {
        return subscriberCount.get();
    }

    public int getAdminSubscriberCount() {
        return adminSubscribers.size();
    }

    public int getPaymentSubscriberCount(UUID paymentId) {
        Set<SseEmitter> set = paymentSubscribers.get(paymentId);
        return set != null ? set.size() : 0;
    }

    public void clearAllForTest() {
        paymentSubscribers.clear();
        adminSubscribers.clear();
        subscriberCount.set(0);
    }
}
