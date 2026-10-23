package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankStatsResponse;
import com.reliablepay.payment.dto.*;
import com.reliablepay.payment.exception.ExperimentAlreadyRunningException;
import com.reliablepay.payment.exception.ExperimentBankUnavailableException;
import com.reliablepay.payment.exception.ResourceNotFoundException;
import com.reliablepay.payment.model.PaymentMode;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentAttemptRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;

@Service
public class ExperimentService {

    private static final Logger log = LoggerFactory.getLogger(ExperimentService.class);

    private final PaymentService paymentService;
    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final BankClient bankClient;

    private final AtomicBoolean isRunning = new AtomicBoolean(false);
    private final Map<String, ExperimentResponse> experimentStore = new ConcurrentHashMap<>();
    private final Map<String, Long> startTimes = new ConcurrentHashMap<>();
    private final ExecutorService experimentRunner = Executors.newSingleThreadExecutor();

    @Value("${app.experiment.wait-timeout-ms:90000}")
    private long maxWaitMs = 90_000;

    public ExperimentService(PaymentService paymentService,
                             PaymentRepository paymentRepository,
                             PaymentAttemptRepository paymentAttemptRepository,
                             BankClient bankClient) {
        this.paymentService = paymentService;
        this.paymentRepository = paymentRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.bankClient = bankClient;
    }

    public String startExperiment(ExperimentRunRequest request) {
        if (!bankClient.isHealthy()) {
            throw new ExperimentBankUnavailableException(
                    "Cannot start experiment: Mock Bank service is not UP. Please wait for cold start or wake the bank before starting an experiment."
            );
        }

        if (!isRunning.compareAndSet(false, true)) {
            throw new ExperimentAlreadyRunningException("An experiment is already in progress. Please wait for it to complete.");
        }

        String experimentId = UUID.randomUUID().toString();
        long now = System.currentTimeMillis();
        startTimes.put(experimentId, now);
        experimentStore.put(experimentId, new ExperimentResponse(
                experimentId,
                "RUNNING",
                null,
                0L,
                request,
                null,
                null,
                null
        ));

        experimentRunner.submit(() -> runExperimentAsync(experimentId, request));

        return experimentId;
    }

    public ExperimentResponse getExperiment(String id) {
        ExperimentResponse response = experimentStore.get(id);
        if (response == null) {
            throw new ResourceNotFoundException("Experiment not found with id: " + id);
        }
        if ("RUNNING".equals(response.status())) {
            Long startTime = startTimes.get(id);
            long elapsed = startTime != null ? System.currentTimeMillis() - startTime : 0L;
            return new ExperimentResponse(
                    response.id(),
                    response.status(),
                    response.errorMessage(),
                    elapsed,
                    response.config(),
                    response.naive(),
                    response.protectedMode(),
                    response.delta()
            );
        }
        return response;
    }

    private void runExperimentAsync(String experimentId, ExperimentRunRequest req) {
        log.info("Starting experiment {} (count={}, concurrency={}, dupRate={})",
                experimentId, req.getCount(), req.getConcurrency(), req.getDuplicateSubmitRate());

        try {
            // 1. Run NAIVE mode
            log.info("Experiment {}: Starting NAIVE mode execution", experimentId);
            ModeResult naiveResult = runMode(experimentId, PaymentMode.NAIVE, req);

            // Brief pause between runs
            Thread.sleep(1000);

            // 2. Run PROTECTED mode
            log.info("Experiment {}: Starting PROTECTED mode execution", experimentId);
            ModeResult protectedResult = runMode(experimentId, PaymentMode.PROTECTED, req);

            // 3. Compute Delta
            ExperimentDelta delta = computeDelta(naiveResult, protectedResult);

            // 4. Store final result
            Long startTime = startTimes.get(experimentId);
            long durationMs = startTime != null ? System.currentTimeMillis() - startTime : 0L;
            ExperimentResponse finalResponse = new ExperimentResponse(
                    experimentId,
                    "DONE",
                    null,
                    durationMs,
                    req,
                    naiveResult,
                    protectedResult,
                    delta
            );
            experimentStore.put(experimentId, finalResponse);
            log.info("Experiment {} COMPLETED successfully in {}ms", experimentId, durationMs);

        } catch (Exception ex) {
            log.error("Experiment {} failed", experimentId, ex);
            Long startTime = startTimes.get(experimentId);
            long durationMs = startTime != null ? System.currentTimeMillis() - startTime : 0L;
            experimentStore.put(experimentId, new ExperimentResponse(
                    experimentId,
                    "FAILED",
                    ex.getMessage(),
                    durationMs,
                    req,
                    null,
                    null,
                    null
            ));
        } finally {
            isRunning.set(false);
        }
    }

    private ModeResult runMode(String experimentId, PaymentMode mode, ExperimentRunRequest req) throws Exception {
        // Reset bank and apply chaos
        bankClient.reset();
        if (req.getChaos() != null) {
            bankClient.updateChaosConfig(req.getChaos());
        }

        String prefix = "EXP-" + experimentId.substring(0, 8) + "-" + mode.name() + "-";
        int count = req.getCount();
        int concurrency = req.getConcurrency();
        double dupRate = req.getDuplicateSubmitRate();
        int dupCount = (int) Math.round(count * dupRate);

        ExecutorService pool = Executors.newFixedThreadPool(concurrency);
        List<Callable<Void>> tasks = new ArrayList<>();

        for (int i = 1; i <= count; i++) {
            String orderRef = prefix + i;
            boolean isDuplicate = (i <= dupCount);

            if (isDuplicate) {
                if (mode == PaymentMode.PROTECTED) {
                    String idempKey = "KEY-" + orderRef;
                    tasks.add(() -> {
                        paymentService.createPayment(
                                new CreatePaymentRequest(orderRef, new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED),
                                idempKey
                        );
                        return null;
                    });
                    tasks.add(() -> {
                        paymentService.createPayment(
                                new CreatePaymentRequest(orderRef, new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED),
                                idempKey
                        );
                        return null;
                    });
                } else {
                    // NAIVE mode: send without idempotency key so two payments are created
                    tasks.add(() -> {
                        paymentService.createPayment(
                                new CreatePaymentRequest(orderRef, new BigDecimal("100.00"), "INR", PaymentMode.NAIVE),
                                null
                        );
                        return null;
                    });
                    tasks.add(() -> {
                        paymentService.createPayment(
                                new CreatePaymentRequest(orderRef, new BigDecimal("100.00"), "INR", PaymentMode.NAIVE),
                                null
                        );
                        return null;
                    });
                }
            } else {
                if (mode == PaymentMode.PROTECTED) {
                    String idempKey = "KEY-" + orderRef;
                    tasks.add(() -> {
                        paymentService.createPayment(
                                new CreatePaymentRequest(orderRef, new BigDecimal("100.00"), "INR", PaymentMode.PROTECTED),
                                idempKey
                        );
                        return null;
                    });
                } else {
                    tasks.add(() -> {
                        paymentService.createPayment(
                                new CreatePaymentRequest(orderRef, new BigDecimal("100.00"), "INR", PaymentMode.NAIVE),
                                null
                        );
                        return null;
                    });
                }
            }
        }

        // Shuffle tasks so duplicates fire interleaved across worker threads
        Collections.shuffle(tasks);

        List<Future<Void>> futures = pool.invokeAll(tasks);
        for (Future<Void> f : futures) {
            try {
                f.get();
            } catch (ExecutionException ignored) {
            }
        }
        pool.shutdown();

        // Wait until all payments reach terminal states or timeout
        long startTime = System.currentTimeMillis();
        long waitLimitMs = this.maxWaitMs;

        while (System.currentTimeMillis() - startTime < waitLimitMs) {
            long inFlight = paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.INITIATED)
                    + paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.PROCESSING)
                    + paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.RETRYING);

            // In PROTECTED mode, UNKNOWN payments are resolved by reconciliation
            long unknowns = paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.UNKNOWN);

            if (mode == PaymentMode.PROTECTED) {
                // If there are still unknowns, allow time for reconciliation worker (grace-ms = 6000ms)
                if (inFlight == 0 && unknowns == 0) {
                    break;
                }
            } else {
                // In NAIVE mode, payments never go to UNKNOWN; only inFlight matters
                if (inFlight == 0) {
                    break;
                }
            }

            Thread.sleep(500);
        }

        // Collect stats from payments table
        long paymentsCreated = paymentRepository.countByMerchantRefPrefix(prefix);
        long success = paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.SUCCESS);
        long deadLettered = paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.DEAD_LETTERED);
        long stuckUnknown = paymentRepository.countByMerchantRefPrefixAndStatus(prefix, PaymentStatus.UNKNOWN);
        long retriedSuccess = paymentRepository.countRetriedSuccessByPrefix(prefix);
        long allRetried = paymentRepository.countAllRetriedByPrefix(prefix);
        double retrySuccessRate = allRetried > 0 ? (double) retriedSuccess / allRetried : 0.0;
        Double avgRecovery = paymentRepository.calculateAvgRecoveryMsByPrefix(prefix);
        double avgRecoveryMs = avgRecovery != null ? avgRecovery : 0.0;

        Double avgLat = paymentAttemptRepository.calculateAvgLatencyMsByPrefix(prefix);
        double avgLatencyMs = avgLat != null ? avgLat : 0.0;
        Double p95Lat = paymentAttemptRepository.calculateP95LatencyMsByPrefix(prefix);
        double p95LatencyMs = p95Lat != null ? p95Lat : 0.0;

        // Collect ground-truth stats from mock-bank
        BankStatsResponse bankStats = bankClient.getStats();
        long duplicateOrdersCount = bankStats != null ? bankStats.duplicateOrdersCount() : 0;
        BigDecimal overchargedAmount = bankStats != null && bankStats.overchargedAmount() != null
                ? bankStats.overchargedAmount() : BigDecimal.ZERO;

        long ordersSucceeded = paymentRepository.countOrdersSucceededByPrefix(prefix);
        long ordersFailed = Math.max(0, count - ordersSucceeded);

        log.info("Mode {} complete: orders={}, created={}, success={}, deadLettered={}, stuckUnknown={}, dupOrders={}, overcharged={}, ordersSucceeded={}, ordersFailed={}, avgLatencyMs={}, p95LatencyMs={}",
                mode, count, paymentsCreated, success, deadLettered, stuckUnknown, duplicateOrdersCount, overchargedAmount, ordersSucceeded, ordersFailed, avgLatencyMs, p95LatencyMs);

        return new ModeResult(
                count,
                (int) paymentsCreated,
                success,
                deadLettered,
                stuckUnknown,
                duplicateOrdersCount,
                overchargedAmount,
                retrySuccessRate,
                avgRecoveryMs,
                avgLatencyMs,
                p95LatencyMs,
                ordersSucceeded,
                ordersFailed
        );
    }

    private ExperimentDelta computeDelta(ModeResult naive, ModeResult prot) {
        int paymentsCreatedDelta = naive.paymentsCreated() - prot.paymentsCreated();
        long duplicateOrdersDelta = naive.duplicateOrdersCount() - prot.duplicateOrdersCount();
        BigDecimal overchargedDelta = naive.overchargedAmount().subtract(prot.overchargedAmount());
        long ordersSucceededDelta = prot.ordersSucceeded() - naive.ordersSucceeded();
        long deadLetteredDelta = naive.deadLettered() - prot.deadLettered();
        long stuckUnknownDelta = naive.stuckUnknown() - prot.stuckUnknown();

        return new ExperimentDelta(
                paymentsCreatedDelta,
                duplicateOrdersDelta,
                overchargedDelta,
                ordersSucceededDelta,
                deadLetteredDelta,
                stuckUnknownDelta
        );
    }
}
