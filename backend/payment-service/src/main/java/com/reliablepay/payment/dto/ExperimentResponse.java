package com.reliablepay.payment.dto;

public record ExperimentResponse(
        String id,
        String status, // RUNNING, DONE, FAILED
        String errorMessage,
        Long durationMs,
        ExperimentRunRequest config,
        ModeResult naive,
        ModeResult protectedMode,
        ExperimentDelta delta
) {}
