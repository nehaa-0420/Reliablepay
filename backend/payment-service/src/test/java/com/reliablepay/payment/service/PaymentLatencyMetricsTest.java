package com.reliablepay.payment.service;

import com.reliablepay.payment.client.BankClient;
import com.reliablepay.payment.client.BankStatsResponse;
import com.reliablepay.payment.dto.MetricsSummaryResponse;
import com.reliablepay.payment.repository.PaymentAttemptRepository;
import com.reliablepay.payment.repository.PaymentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class PaymentLatencyMetricsTest {

    private PaymentRepository paymentRepository;
    private PaymentAttemptRepository paymentAttemptRepository;
    private BankClient bankClient;
    private MetricsService metricsService;

    @BeforeEach
    void setUp() {
        paymentRepository = mock(PaymentRepository.class);
        paymentAttemptRepository = mock(PaymentAttemptRepository.class);
        bankClient = mock(BankClient.class);
        metricsService = new MetricsService(paymentRepository, paymentAttemptRepository, bankClient);

        when(paymentRepository.countByStatusGrouped()).thenReturn(Collections.emptyList());
    }

    @Test
    @DisplayName("MetricsSummaryResponse includes avgLatencyMs and p95LatencyMs from PaymentAttemptRepository")
    void summaryIncludesLatencyMetrics() {
        when(paymentAttemptRepository.calculateAvgLatencyMs()).thenReturn(142.5);
        when(paymentAttemptRepository.calculateP95LatencyMs()).thenReturn(380.0);
        when(bankClient.getStats()).thenReturn(new BankStatsResponse(10L, 0L, 0L, 0L, BigDecimal.ZERO));

        MetricsSummaryResponse summary = metricsService.getSummary();

        assertThat(summary.avgLatencyMs()).isEqualTo(142.5);
        assertThat(summary.p95LatencyMs()).isEqualTo(380.0);
        verify(paymentAttemptRepository).calculateAvgLatencyMs();
        verify(paymentAttemptRepository).calculateP95LatencyMs();
    }

    @Test
    @DisplayName("MetricsSummaryResponse defaults null latency metrics to 0.0")
    void summaryDefaultsNullLatencyToZero() {
        when(paymentAttemptRepository.calculateAvgLatencyMs()).thenReturn(null);
        when(paymentAttemptRepository.calculateP95LatencyMs()).thenReturn(null);

        MetricsSummaryResponse summary = metricsService.getSummary();

        assertThat(summary.avgLatencyMs()).isEqualTo(0.0);
        assertThat(summary.p95LatencyMs()).isEqualTo(0.0);
    }
}
