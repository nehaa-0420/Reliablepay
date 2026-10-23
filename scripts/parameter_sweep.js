/**
 * ReliablePay - Automated Parameter Sweep Script
 * Runs parameter sweeps across:
 * 1. Client read timeout (1s, 2s, 3s)
 * 2. Reconciliation grace period (4s, 6s, 8s - all > 3500ms bank timeout sleep)
 * 3. Retry base delay (250ms, 500ms, 1000ms)
 * 4. Max attempts (2, 4, 6)
 *
 * Captures mean and min-max metrics, and writes real telemetry to scripts/sweep_results.json.
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8080';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'demo-secret-123';

const DEFAULTS = {
    bankReadTimeoutMs: 2000,
    reconcileGraceMs: 6000,
    retryBaseDelayMs: 500,
    retryMaxAttempts: 4
};

const SWEEP_CONFIGS = [
    {
        category: 'Baseline Defaults',
        label: 'Baseline Defaults (Timeout 2s, Grace 6s, Delay 500ms, MaxAttempts 4)',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 6000, retryBaseDelayMs: 500, retryMaxAttempts: 4 }
    },
    {
        category: 'Client Read Timeout',
        label: 'Client Timeout 1000ms (1s)',
        params: { bankReadTimeoutMs: 1000, reconcileGraceMs: 6000, retryBaseDelayMs: 500, retryMaxAttempts: 4 }
    },
    {
        category: 'Client Read Timeout',
        label: 'Client Timeout 3000ms (3s)',
        params: { bankReadTimeoutMs: 3000, reconcileGraceMs: 6000, retryBaseDelayMs: 500, retryMaxAttempts: 4 }
    },
    {
        category: 'Reconciliation Grace Period',
        label: 'Grace Period 4000ms (4s)',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 4000, retryBaseDelayMs: 500, retryMaxAttempts: 4 }
    },
    {
        category: 'Reconciliation Grace Period',
        label: 'Grace Period 8000ms (8s)',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 8000, retryBaseDelayMs: 500, retryMaxAttempts: 4 }
    },
    {
        category: 'Retry Base Delay',
        label: 'Retry Base Delay 250ms',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 6000, retryBaseDelayMs: 250, retryMaxAttempts: 4 }
    },
    {
        category: 'Retry Base Delay',
        label: 'Retry Base Delay 1000ms',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 6000, retryBaseDelayMs: 1000, retryMaxAttempts: 4 }
    },
    {
        category: 'Max Attempts',
        label: 'Max Attempts = 2',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 6000, retryBaseDelayMs: 500, retryMaxAttempts: 2 }
    },
    {
        category: 'Max Attempts',
        label: 'Max Attempts = 6',
        params: { bankReadTimeoutMs: 2000, reconcileGraceMs: 6000, retryBaseDelayMs: 500, retryMaxAttempts: 6 }
    }
];

const EXPERIMENT_WORKLOAD = {
    count: 50,
    concurrency: 10,
    duplicateSubmitRate: 0.2,
    chaos: {
        timeoutRate: 0.3,
        errorRate: 0.1,
        channelFailureRate: 0.05,
        chargeOnTimeoutProbability: 0.5,
        latencyMs: 100
    }
};

const REPETITIONS = 2;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function request(url, options = {}) {
    const res = await fetch(url, options);
    const text = await res.text();
    let body;
    try {
        body = JSON.parse(text);
    } catch {
        body = text;
    }
    return { status: res.status, ok: res.ok, body };
}

async function resetSystem() {
    const res = await request(`${BASE_URL}/api/admin/reset`, {
        method: 'POST',
        headers: {
            'X-Admin-Token': ADMIN_TOKEN
        }
    });
    if (!res.ok) {
        throw new Error(`Admin reset failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body;
}

async function updateTuningConfig(params) {
    const res = await request(`${BASE_URL}/api/admin/config`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify(params)
    });
    if (!res.ok) {
        throw new Error(`Update tuning config failed with status ${res.status}: ${JSON.stringify(res.body)}`);
    }
    return res.body;
}

async function runSingleExperiment(config) {
    await resetSystem();
    await sleep(1000);

    const startRes = await request(`${BASE_URL}/api/experiments/run`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': ADMIN_TOKEN
        },
        body: JSON.stringify(config)
    });

    if (!startRes.ok) {
        throw new Error(`Failed to launch experiment: ${JSON.stringify(startRes.body)}`);
    }

    const expId = startRes.body.experimentId || startRes.body.id;
    if (!expId) {
        throw new Error(`Launch response did not contain experimentId: ${JSON.stringify(startRes.body)}`);
    }
    process.stdout.write(`  [${expId.slice(0, 8)}] Polling: `);

    const startTime = Date.now();
    while (true) {
        await sleep(2500);
        const pollRes = await request(`${BASE_URL}/api/experiments/${expId}`);
        if (!pollRes.ok) {
            throw new Error(`Failed to poll experiment status: ${JSON.stringify(pollRes.body)}`);
        }

        const exp = pollRes.body;
        process.stdout.write('.');
        if (exp.status === 'DONE') {
            const elapsed = Date.now() - startTime;
            console.log(` DONE (${elapsed}ms)`);
            return exp;
        } else if (exp.status === 'FAILED') {
            console.log(` FAILED: ${exp.errorMessage}`);
            throw new Error(`Experiment failed: ${exp.errorMessage}`);
        }
    }
}

function calcStats(numbers) {
    if (!numbers || numbers.length === 0) return { mean: 0, min: 0, max: 0 };
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    const sum = numbers.reduce((a, b) => a + b, 0);
    const mean = sum / numbers.length;
    return { mean, min, max };
}

async function main() {
    console.log('======================================================================');
    console.log('ReliablePay: Systematic Parameter Sweep (2 Repetitions Each)');
    console.log(`Workload per run: Count=${EXPERIMENT_WORKLOAD.count}, Concurrency=${EXPERIMENT_WORKLOAD.concurrency}, DupRate=${EXPERIMENT_WORKLOAD.duplicateSubmitRate}`);
    console.log('======================================================================\n');

    const allResults = [];

    for (let cIdx = 0; cIdx < SWEEP_CONFIGS.length; cIdx++) {
        const item = SWEEP_CONFIGS[cIdx];
        console.log(`\n>>> [${cIdx + 1}/${SWEEP_CONFIGS.length}] ${item.category} :: ${item.label} <<<`);
        console.log(`Applying tuning parameters: ${JSON.stringify(item.params)}`);
        await updateTuningConfig(item.params);

        const repResults = [];
        for (let rep = 1; rep <= REPETITIONS; rep++) {
            console.log(` Repetition ${rep} of ${REPETITIONS}:`);
            const exp = await runSingleExperiment(EXPERIMENT_WORKLOAD);
            repResults.push(exp);

            // CRITICAL SAFETY CHECK: If PROTECTED ever produces >0 duplicate orders, halt immediately!
            const protectedDups = exp.protectedMode.duplicateOrdersCount;
            if (protectedDups > 0) {
                console.error('\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                console.error(`FATAL INCIDENT: PROTECTED mode recorded ${protectedDups} duplicate orders!`);
                console.error('Halting parameter sweep immediately per prompt instructions.');
                console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n');

                const incidentReport = `# INCIDENT REPORT: PROTECTED DUPLICATE ORDER DETECTED
Timestamp: ${new Date().toISOString()}
Sweep Configuration: ${item.label} (${JSON.stringify(item.params)})
Repetition: ${rep}
Experiment ID: ${exp.id}

## Telemetry
- NAIVE Duplicate Orders: ${exp.naive.duplicateOrdersCount}
- NAIVE Overcharged: ₹${exp.naive.overchargedAmount}
- PROTECTED Duplicate Orders: ${exp.protectedMode.duplicateOrdersCount}
- PROTECTED Overcharged: ₹${exp.protectedMode.overchargedAmount}

## Raw Experiment JSON
\`\`\`json
${JSON.stringify(exp, null, 2)}
\`\`\`
`;
                fs.writeFileSync(path.join(__dirname, '..', 'docs', 'INCIDENT_PROTECTED_DUPLICATE.md'), incidentReport, 'utf8');
                process.exit(1);
            }
        }

        // Aggregate across repetitions
        const naiveDups = repResults.map(r => r.naive.duplicateOrdersCount);
        const naiveOvercharged = repResults.map(r => r.naive.overchargedAmount);
        const naiveRecovery = repResults.map(r => r.naive.avgRecoveryMs);
        const naiveP95 = repResults.map(r => r.naive.p95LatencyMs);
        const naiveSucceeded = repResults.map(r => r.naive.ordersSucceeded);

        const protDups = repResults.map(r => r.protectedMode.duplicateOrdersCount);
        const protOvercharged = repResults.map(r => r.protectedMode.overchargedAmount);
        const protRecovery = repResults.map(r => r.protectedMode.avgRecoveryMs);
        const protP95 = repResults.map(r => r.protectedMode.p95LatencyMs);
        const protSucceeded = repResults.map(r => r.protectedMode.ordersSucceeded);
        const protUnknown = repResults.map(r => r.protectedMode.paymentsUnknown || 0);

        const summary = {
            category: item.category,
            label: item.label,
            params: item.params,
            naive: {
                duplicateOrders: calcStats(naiveDups),
                overcharged: calcStats(naiveOvercharged),
                recoveryMs: calcStats(naiveRecovery),
                p95LatencyMs: calcStats(naiveP95),
                ordersSucceeded: calcStats(naiveSucceeded)
            },
            protected: {
                duplicateOrders: calcStats(protDups),
                overcharged: calcStats(protOvercharged),
                recoveryMs: calcStats(protRecovery),
                p95LatencyMs: calcStats(protP95),
                ordersSucceeded: calcStats(protSucceeded)
            },
            runs: repResults
        };

        allResults.push(summary);

        console.log(`  --> PROTECTED Duplicates: ${summary.protected.duplicateOrders.mean} [min: ${summary.protected.duplicateOrders.min}, max: ${summary.protected.duplicateOrders.max}]`);
        console.log(`  --> PROTECTED Recovery: ${summary.protected.recoveryMs.mean.toFixed(0)} ms [min: ${summary.protected.recoveryMs.min}, max: ${summary.protected.recoveryMs.max}]`);
        console.log(`  --> PROTECTED P95 Latency: ${summary.protected.p95LatencyMs.mean.toFixed(1)} ms`);
    }

    // Reset back to system defaults
    console.log('\nRestoring default configuration parameters...');
    await updateTuningConfig(DEFAULTS);
    await resetSystem();

    const outputPath = path.join(__dirname, 'sweep_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(allResults, null, 2), 'utf8');
    console.log(`\nAll parameter sweep telemetry successfully written to ${outputPath}`);
}

main().catch(err => {
    console.error('Fatal sweep error:', err);
    process.exit(1);
});
