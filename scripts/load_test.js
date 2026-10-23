/**
 * ReliablePay - High Concurrency Load Test Runner
 * Equivalent to Apache JMeter Test Plan: docs/jmeter/payment-load.jmx
 * Workload: 100 concurrent simulated users ramping up over 10 seconds.
 * Each request sends a unique Idempotency-Key (UUID) to POST /api/payments.
 * Measures throughput (req/sec), error rate, p50, p90, p95, and p99 latency.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const BASE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8080';
const NUM_USERS = 100;
const RAMP_UP_SECONDS = 10;
const TOTAL_DURATION_SECONDS = 25;

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function percentile(sortedArr, p) {
    if (sortedArr.length === 0) return 0;
    const index = Math.ceil((p / 100) * sortedArr.length) - 1;
    return sortedArr[Math.max(0, Math.min(index, sortedArr.length - 1))];
}

async function runVirtualUser(userId, startDelayMs, testEndTime, results) {
    await sleep(startDelayMs);

    while (Date.now() < testEndTime) {
        const idempotencyKey = crypto.randomUUID();
        const paymentPayload = {
            amount: (Math.random() * 200 + 10).toFixed(2),
            currency: 'INR',
            orderRef: `ORD-LOAD-U${userId}-${crypto.randomUUID().slice(0, 8)}`,
            merchantRef: `MERCH-LOAD-${crypto.randomUUID().slice(0, 8)}`,
            mode: 'PROTECTED'
        };

        const reqStart = Date.now();
        try {
            const res = await fetch(`${BASE_URL}/api/payments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Idempotency-Key': idempotencyKey
                },
                body: JSON.stringify(paymentPayload)
            });

            const latency = Date.now() - reqStart;
            const success = res.status === 201 || res.status === 200;
            results.push({
                timestamp: reqStart,
                status: res.status,
                latency,
                success
            });
        } catch (err) {
            const latency = Date.now() - reqStart;
            results.push({
                timestamp: reqStart,
                status: 0,
                latency,
                success: false,
                error: err.message
            });
        }

        // Small pacing between requests per user (~50ms - 150ms)
        await sleep(Math.floor(Math.random() * 100) + 50);
    }
}

async function main() {
    console.log('======================================================================');
    console.log('ReliablePay: Apache JMeter Equivalent Load Test');
    console.log(`Endpoint: POST ${BASE_URL}/api/payments`);
    console.log(`Virtual Users: ${NUM_USERS} | Ramp-Up: ${RAMP_UP_SECONDS}s | Total Test Duration: ${TOTAL_DURATION_SECONDS}s`);
    console.log('======================================================================\n');

    // Warm-up check
    try {
        const health = await fetch(`${BASE_URL}/actuator/health`);
        const hJson = await health.json();
        console.log(`Health check: ${JSON.stringify(hJson)}`);
    } catch (e) {
        console.error('Cannot connect to payment-service:', e.message);
        process.exit(1);
    }

    const testStartTime = Date.now();
    const testEndTime = testStartTime + (TOTAL_DURATION_SECONDS * 1000);
    const results = [];

    console.log(`Starting ramp-up of ${NUM_USERS} virtual users across ${RAMP_UP_SECONDS} seconds...`);
    const userPromises = [];
    const intervalBetweenUsers = (RAMP_UP_SECONDS * 1000) / NUM_USERS;

    for (let i = 0; i < NUM_USERS; i++) {
        const startDelayMs = i * intervalBetweenUsers;
        userPromises.push(runVirtualUser(i + 1, startDelayMs, testEndTime, results));
    }

    // Progress reporter
    const reporter = setInterval(() => {
        const elapsedSec = ((Date.now() - testStartTime) / 1000).toFixed(1);
        const reqCount = results.length;
        const currentRps = (reqCount / (elapsedSec > 0 ? elapsedSec : 1)).toFixed(1);
        process.stdout.write(`\r[${elapsedSec}s / ${TOTAL_DURATION_SECONDS}s] Completed requests: ${reqCount} (~${currentRps} req/s)...`);
    }, 1000);

    await Promise.all(userPromises);
    clearInterval(reporter);
    console.log('\n\nLoad test execution complete. Aggregating metrics...');

    const totalDurationMs = Date.now() - testStartTime;
    const totalRequests = results.length;
    const successfulRequests = results.filter(r => r.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const errorRatePct = totalRequests > 0 ? ((failedRequests / totalRequests) * 100).toFixed(2) : '0.00';
    const throughputRps = ((totalRequests / totalDurationMs) * 1000).toFixed(2);

    const latencies = results.map(r => r.latency).sort((a, b) => a - b);
    const minLatency = latencies.length > 0 ? latencies[0] : 0;
    const maxLatency = latencies.length > 0 ? latencies[latencies.length - 1] : 0;
    const sumLatency = latencies.reduce((a, b) => a + b, 0);
    const avgLatency = latencies.length > 0 ? (sumLatency / latencies.length).toFixed(1) : 0;
    const p50Latency = percentile(latencies, 50);
    const p90Latency = percentile(latencies, 90);
    const p95Latency = percentile(latencies, 95);
    const p99Latency = percentile(latencies, 99);

    const report = {
        testParameters: {
            endpoint: '/api/payments',
            virtualUsers: NUM_USERS,
            rampUpSeconds: RAMP_UP_SECONDS,
            totalDurationSeconds: TOTAL_DURATION_SECONDS,
            totalDurationMs
        },
        throughputRps: parseFloat(throughputRps),
        totalRequests,
        successfulRequests,
        failedRequests,
        errorRatePct: parseFloat(errorRatePct),
        latencies: {
            minMs: minLatency,
            avgMs: parseFloat(avgLatency),
            maxMs: maxLatency,
            p50Ms: p50Latency,
            p90Ms: p90Latency,
            p95Ms: p95Latency,
            p99Ms: p99Latency
        }
    };

    console.log('\n' + '='.repeat(70));
    console.log('LOAD TEST SUMMARY REPORT');
    console.log('='.repeat(70));
    console.log(`Total Requests Sent : ${totalRequests}`);
    console.log(`Successful (201/200): ${successfulRequests}`);
    console.log(`Failed / Errors     : ${failedRequests}`);
    console.log(`Error Rate          : ${errorRatePct}%`);
    console.log(`Throughput          : ${throughputRps} req/sec`);
    console.log(`Latency Avg         : ${avgLatency} ms`);
    console.log(`Latency Min         : ${minLatency} ms`);
    console.log(`Latency P50         : ${p50Latency} ms`);
    console.log(`Latency P90         : ${p90Latency} ms`);
    console.log(`Latency P95         : ${p95Latency} ms`);
    console.log(`Latency P99         : ${p99Latency} ms`);
    console.log(`Latency Max         : ${maxLatency} ms`);
    console.log('='.repeat(70));

    const outputPath = path.join(__dirname, 'load_test_results.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\nDetailed report written to ${outputPath}`);
}

main().catch(err => {
    console.error('Fatal load test error:', err);
    process.exit(1);
});
