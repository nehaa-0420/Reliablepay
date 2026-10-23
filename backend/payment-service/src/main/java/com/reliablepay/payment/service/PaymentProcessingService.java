package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankCallResult;
import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankOutcome;
import com.reliablepay.payment.config.RetryProperties;
import com.reliablepay.payment.model.Payment;
import com.reliablepay.payment.model.PaymentAttempt;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentAttemptRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import jakarta.persistence.OptimisticLockException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class PaymentProcessingService {

    private static final Logger log = LoggerFactory.getLogger(PaymentProcessingService.class);

    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final PaymentStateMachine stateMachine;
    private final BankClient bankClient;
    private final RetryProperties retryProperties;
    private final TransactionTemplate transactionTemplate;

    public record AttemptContext(UUID paymentId, String merchantRef, BigDecimal amount, int attemptNo, PaymentMode mode) {}

    public PaymentProcessingService(PaymentRepository paymentRepository,
                                    PaymentAttemptRepository paymentAttemptRepository,
                                    PaymentStateMachine stateMachine,
                                    BankClient bankClient,
                                    RetryProperties retryProperties,
                                    PlatformTransactionManager transactionManager) {
        this.paymentRepository = paymentRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.stateMachine = stateMachine;
        this.bankClient = bankClient;
        this.retryProperties = retryProperties;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * Dispatches payment processing asynchronously on the paymentExecutor thread pool.
     */
    @Async("paymentExecutor")
    public void processPaymentAsync(UUID paymentId) {
        processPayment(paymentId);
    }

    /**
     * Executes a payment attempt strictly ensuring no database transaction
     * is open during the external bank HTTP call.
     */
    public void processPayment(UUID paymentId) {
        try {
            // Step 1: Start attempt in short transaction
            AttemptContext context = transactionTemplate.execute(status -> {
                Payment payment = paymentRepository.findById(paymentId).orElse(null);
                if (payment == null) {
                    log.warn("Payment {} not found for processing", paymentId);
                    return null;
                }

                PaymentStatus current = payment.getStatus();
                if (current == PaymentStatus.INITIATED) {
                    payment.setAttemptCount(payment.getAttemptCount() + 1);
                    stateMachine.transition(payment, PaymentStatus.PROCESSING, "Attempt " + payment.getAttemptCount() + " initiated");
                    paymentRepository.saveAndFlush(payment);
                    return new AttemptContext(payment.getId(), payment.getMerchantRef(), payment.getAmount(), payment.getAttemptCount(), payment.getMode());
                } else if (current == PaymentStatus.RETRYING) {
                    payment.setAttemptCount(payment.getAttemptCount() + 1);
                    stateMachine.transition(payment, PaymentStatus.PROCESSING, "Retry attempt " + payment.getAttemptCount() + " initiated");
                    paymentRepository.saveAndFlush(payment);
                    return new AttemptContext(payment.getId(), payment.getMerchantRef(), payment.getAmount(), payment.getAttemptCount(), payment.getMode());
                } else if (current == PaymentStatus.PROCESSING) {
                    // Already transitioned to PROCESSING by retry claim worker
                    return new AttemptContext(payment.getId(), payment.getMerchantRef(), payment.getAmount(), payment.getAttemptCount(), payment.getMode());
                } else {
                    log.info("Payment {} in status {}, skipping processing", paymentId, current);
                    return null;
                }
            });

            if (context == null) {
                return;
            }

            // Step 2: Outbound HTTP call to mock bank (NO DB TRANSACTION HELD)
            log.info("Dispatching HTTP bank charge for payment {} (orderRef: {}, attempt: {}, mode: {})",
                    context.paymentId(), context.merchantRef(), context.attemptNo(), context.mode());
            BankCallResult result = bankClient.charge(context.paymentId().toString(), context.merchantRef(), context.amount());
            if (result == null) {
                log.warn("Bank client returned null result for payment {}, skipping processing cycle", context.paymentId());
                return;
            }
            log.info("Bank charge result for payment {}: outcome={}, latency={}ms, errorCode={}",
                    context.paymentId(), result.outcome(), result.latencyMs(), result.errorCode());

            // Step 3: Complete attempt in short transaction
            transactionTemplate.executeWithoutResult(status -> {
                Payment payment = paymentRepository.findById(context.paymentId()).orElse(null);
                if (payment == null) {
                    log.error("Payment {} disappeared during processing!", context.paymentId());
                    return;
                }

                // Record payment attempt
                PaymentAttempt attempt = new PaymentAttempt(
                        payment.getId(),
                        context.attemptNo(),
                        result.outcome().name(),
                        result.latencyMs(),
                        result.errorCode()
                );
                paymentAttemptRepository.save(attempt);

                // Apply state transition
                if (result.outcome() == BankOutcome.SUCCESS) {
                    payment.setLastError(null);
                    payment.setNextRetryAt(null);
                    stateMachine.transition(payment, PaymentStatus.SUCCESS, "Bank charge successful (" + result.latencyMs() + "ms)");
                    paymentRepository.saveAndFlush(payment);

                } else if (result.outcome() == BankOutcome.TIMEOUT) {
                    if (context.mode() == PaymentMode.NAIVE) {
                        // NAIVE mode: blind retry on timeout! Never goes to UNKNOWN!
                        int maxAttempts = retryProperties.getMaxAttempts();
                        if (context.attemptNo() >= maxAttempts) {
                            payment.setLastError("Max attempts (" + maxAttempts + ") exhausted on timeout (NAIVE mode)");
                            payment.setNextRetryAt(null);
                            stateMachine.transition(payment, PaymentStatus.DEAD_LETTERED,
                                    "Max attempts (" + maxAttempts + ") exhausted. Last error: TIMEOUT (NAIVE blind retry)");
                            paymentRepository.saveAndFlush(payment);
                        } else {
                            Instant nextRetry = calculateBackoff(context.attemptNo());
                            payment.setLastError("TIMEOUT (NAIVE blind retry)");
                            payment.setNextRetryAt(nextRetry);
                            stateMachine.transition(payment, PaymentStatus.RETRYING,
                                    "Attempt " + context.attemptNo() + " timed out; NAIVE blind retry scheduled at " + nextRetry);
                            paymentRepository.saveAndFlush(payment);
                        }
                    } else {
                        // PROTECTED mode: never retry blindly; marked UNKNOWN pending Phase 3 reconciliation
                        payment.setLastError("Bank call timed out: " + result.errorCode());
                        payment.setNextRetryAt(null);
                        stateMachine.transition(payment, PaymentStatus.UNKNOWN,
                                "Bank read timed out (" + result.latencyMs() + "ms); marked UNKNOWN for reconciliation");
                        paymentRepository.saveAndFlush(payment);
                    }

                } else {
                    // 5xx or CHANNEL_FAILURE or other transient error
                    int maxAttempts = retryProperties.getMaxAttempts();
                    if (context.attemptNo() >= maxAttempts) {
                        payment.setLastError("Max attempts (" + maxAttempts + ") exhausted. Last error: " + result.errorCode());
                        payment.setNextRetryAt(null);
                        stateMachine.transition(payment, PaymentStatus.DEAD_LETTERED,
                                "Max attempts (" + maxAttempts + ") exhausted. Last error: " + result.errorCode());
                        paymentRepository.saveAndFlush(payment);
                    } else {
                        Instant nextRetry = calculateBackoff(context.attemptNo());
                        payment.setLastError(result.errorCode());
                        payment.setNextRetryAt(nextRetry);
                        stateMachine.transition(payment, PaymentStatus.RETRYING,
                                "Attempt " + context.attemptNo() + " failed (" + result.errorCode() + "); scheduled retry at " + nextRetry);
                        paymentRepository.saveAndFlush(payment);
                    }
                }
            });

        } catch (ObjectOptimisticLockingFailureException | OptimisticLockException ex) {
            log.warn("Optimistic lock conflict on payment {}, skipping row: {}", paymentId, ex.getMessage());
        } catch (Exception ex) {
            log.error("Unexpected error processing payment {}", paymentId, ex);
        }
    }

    /**
     * Calculates exponential backoff with proportional jitter using app.retry.* settings.
     */
    public Instant calculateBackoff(int attemptNo) {
        long baseDelay = retryProperties.getBaseDelayMs();
        double multiplier = retryProperties.getMultiplier();
        long maxDelay = retryProperties.getMaxDelayMs();

        double expDelay = baseDelay * Math.pow(multiplier, Math.max(0, attemptNo - 1));
        long delayMs = Math.min(maxDelay, (long) expDelay);

        long jitterRange = Math.max(10, delayMs / 4);
        long jitter = ThreadLocalRandom.current().nextLong(-jitterRange, jitterRange + 1);
        long finalDelay = Math.max(50, delayMs + jitter);

        return Instant.now().plusMillis(finalDelay);
    }
}
