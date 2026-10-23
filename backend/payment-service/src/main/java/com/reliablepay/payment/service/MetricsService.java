package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankStatsResponse;
import com.reliablepay.payment.dto.MetricsSummaryResponse;
import com.reliablepay.payment.model.PaymentStatus;
import com.reliablepay.payment.repository.PaymentAttemptRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class MetricsService {

    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final BankClient bankClient;

    public MetricsService(PaymentRepository paymentRepository,
                          PaymentAttemptRepository paymentAttemptRepository,
                          BankClient bankClient) {
        this.paymentRepository = paymentRepository;
        this.paymentAttemptRepository = paymentAttemptRepository;
        this.bankClient = bankClient;
    }

    @Transactional(readOnly = true)
    public MetricsSummaryResponse getSummary() {
        List<Object[]> grouped = paymentRepository.countByStatusGrouped();
        Map<String, Long> statusCounts = new HashMap<>();
        for (PaymentStatus s : PaymentStatus.values()) {
            statusCounts.put(s.name(), 0L);
        }
        for (Object[] row : grouped) {
            PaymentStatus st = (PaymentStatus) row[0];
            Long cnt = (Long) row[1];
            statusCounts.put(st.name(), cnt);
        }

        long stuckUnknown = statusCounts.getOrDefault(PaymentStatus.UNKNOWN.name(), 0L);

        long retriedSuccess = paymentRepository.countRetriedSuccess();
        long allRetried = paymentRepository.countAllRetried();
        double retrySuccessRate = allRetried > 0 ? (double) retriedSuccess / allRetried : 0.0;

        Double avgRecovery = paymentRepository.calculateAvgRecoveryMs();
        double avgRecoveryMs = avgRecovery != null ? avgRecovery : 0.0;

        Double avgLat = paymentAttemptRepository.calculateAvgLatencyMs();
        double avgLatencyMs = avgLat != null ? avgLat : 0.0;

        Double p95Lat = paymentAttemptRepository.calculateP95LatencyMs();
        double p95LatencyMs = p95Lat != null ? p95Lat : 0.0;

        long totalCharges = 0;
        long duplicateCharges = 0;
        long duplicateRefsCount = 0;
        long duplicateOrdersCount = 0;
        BigDecimal overchargedAmount = BigDecimal.ZERO;

        try {
            BankStatsResponse bankStats = bankClient.getStats();
            if (bankStats != null) {
                totalCharges = bankStats.totalCharges();
                duplicateCharges = bankStats.duplicateCharges();
                duplicateRefsCount = bankStats.duplicateRefsCount();
                duplicateOrdersCount = bankStats.duplicateOrdersCount();
                overchargedAmount = bankStats.overchargedAmount() != null ? bankStats.overchargedAmount() : BigDecimal.ZERO;
            }
        } catch (Exception ignored) {
        }

        return new MetricsSummaryResponse(
                statusCounts,
                stuckUnknown,
                retrySuccessRate,
                avgRecoveryMs,
                avgLatencyMs,
                p95LatencyMs,
                totalCharges,
                duplicateCharges,
                duplicateRefsCount,
                duplicateOrdersCount,
                overchargedAmount
        );
    }
}
