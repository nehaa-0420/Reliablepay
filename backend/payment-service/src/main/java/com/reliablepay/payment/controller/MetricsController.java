package com.reliablepay.payment.controller;

import com.reliablepay.payment.dto.MetricsSummaryResponse;
import com.reliablepay.payment.service.MetricsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Tag(name = "Metrics", description = "System-wide reliability telemetry and live performance metrics")
@RestController
@RequestMapping("/api/metrics")
public class MetricsController {

    private final MetricsService metricsService;

    public MetricsController(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @Operation(summary = "Get metrics summary", description = "Retrieve aggregated state counts, duplicate orders, overcharged amounts, retry success rate, recovery MTTR, and attempt latency percentiles")
    @GetMapping("/summary")
    public ResponseEntity<MetricsSummaryResponse> getSummary() {
        return ResponseEntity.ok(metricsService.getSummary());
    }
}
