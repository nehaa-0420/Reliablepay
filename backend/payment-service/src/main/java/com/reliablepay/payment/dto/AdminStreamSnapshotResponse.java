package com.reliablepay.payment.dto;

import java.util.List;
import java.util.Map;

/**
 * Snapshot payload sent upon initial connection to GET /api/admin/stream.
 */
public record AdminStreamSnapshotResponse(
        Map<String, Long> countsByStatus,
        List<PaymentEventResponse> recentEvents
) {}
