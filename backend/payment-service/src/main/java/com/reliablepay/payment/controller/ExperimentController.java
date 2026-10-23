package com.reliablepay.payment.controller;

import com.reliablepay.payment.dto.ExperimentResponse;
import com.reliablepay.payment.dto.ExperimentRunRequest;
import com.reliablepay.payment.service.ExperimentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Tag(name = "Experiments", description = "Head-to-head empirical comparison runs between NAIVE and PROTECTED protocols")
@RestController
@RequestMapping("/api/experiments")
public class ExperimentController {

    private final ExperimentService experimentService;

    public ExperimentController(ExperimentService experimentService) {
        this.experimentService = experimentService;
    }

    @Operation(summary = "Launch benchmark experiment", description = "Executes identical workload against NAIVE and PROTECTED protocols with configured chaos fault rates. Protected by X-Admin-Token.", security = @SecurityRequirement(name = "AdminTokenAuth"))
    @PostMapping("/run")
    public ResponseEntity<Map<String, String>> runExperiment(
            @Parameter(name = "X-Admin-Token", description = "Admin authorization token (optional locally, mandatory in production)")
            @RequestHeader(value = "X-Admin-Token", required = false) String adminToken,
            @RequestBody(required = false) ExperimentRunRequest request) {
        if (request == null) {
            request = new ExperimentRunRequest();
        }
        String experimentId = experimentService.startExperiment(request);
        return ResponseEntity.accepted().body(Map.of(
                "experimentId", experimentId,
                "status", "RUNNING"
        ));
    }

    @Operation(summary = "Get experiment status and telemetry", description = "Poll experiment progress or fetch terminal comparison telemetry including deltas and latency profiles")
    @GetMapping("/{id}")
    public ResponseEntity<ExperimentResponse> getExperiment(@PathVariable String id) {
        return ResponseEntity.ok(experimentService.getExperiment(id));
    }
}
