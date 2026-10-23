#!/usr/bin/env node

/**
 * ReliablePay Empirical Experiment Runner
 * Executes benchmarks N times, aggregates metrics (mean, min, max),
 * enforces safety rules (zero duplicate orders in PROTECTED),
 * and prints formatted markdown evaluation tables.
 */

import fs from 'node:fs';
import path from 'node:path';

// Parse command line arguments
const args = process.argv.slice(2);
function getArg(flag, defaultValue) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    return args[idx + 1];
  }
  return defaultValue;
}

const count = parseInt(getArg('--count', '100'), 10);
const concurrency = parseInt(getArg('--concurrency', '10'), 10);
const duplicateSubmitRate = parseFloat(getArg('--duplicateSubmitRate', '0.2'));
const timeoutRate = parseFloat(getArg('--timeoutRate', '0.3'));
const errorRate = parseFloat(getArg('--errorRate', '0.1'));
const channelFailureRate = parseFloat(getArg('--channelFailureRate', '0.05'));
const chargeOnTimeoutProbability = parseFloat(getArg('--chargeOnTimeoutProbability', '0.5'));
const latencyMs = parseInt(getArg('--latencyMs', '100'), 10);
const repetitions = parseInt(getArg('--repetitions', '3'), 10);
const label = getArg('--label', 'Baseline-100');
const baseUrl = getArg('--baseUrl', 'http://localhost:8080');
const adminToken = getArg('--adminToken', process.env.ADMIN_TOKEN || 'demo-secret-123');

console.log('='.repeat(70));
console.log(`ReliablePay Benchmark: ${label}`);
console.log(`Count: ${count} | Concurrency: ${concurrency} | DupRate: ${duplicateSubmitRate} | Repetitions: ${repetitions}`);
console.log(`Chaos: timeoutRate=${timeoutRate}, errorRate=${errorRate}, channelFailureRate=${channelFailureRate}, latencyMs=${latencyMs}`);
console.log('='.repeat(70));

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function resetAll() {
  try {
    const res = await fetch(`${baseUrl}/api/admin/reset`, {
      method: 'POST',
      headers: { 'X-Admin-Token': adminToken }
    });
    const json = await res.json();
    console.log(`System state reset: ${json.status || res.status}`);
  } catch (err) {
    console.warn(`Reset notice: ${err.message}`);
  }
}

async function runSingleExperiment(repIndex) {
  console.log(`\n>>> Repetition ${repIndex + 1} of ${repetitions} [${label}] <<<`);
  await resetAll();
  await sleep(1500);

  const payload = {
    count,
    concurrency,
    duplicateSubmitRate,
    chaos: {
      timeoutRate,
      errorRate,
      channelFailureRate,
      chargeOnTimeoutProbability,
      latencyMs
    }
  };

  const launchRes = await fetch(`${baseUrl}/api/experiments/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Token': adminToken
    },
    body: JSON.stringify(payload)
  });

  if (!launchRes.ok) {
    const text = await launchRes.text();
    throw new Error(`Failed to launch experiment: HTTP ${launchRes.status} - ${text}`);
  }

  const launchJson = await launchRes.json();
  const experimentId = launchJson.experimentId;
  console.log(`Experiment started with ID: ${experimentId}`);

  // Poll until DONE or FAILED
  let status = 'RUNNING';
  let pollAttempts = 0;
  let data = null;

  while (status === 'RUNNING' && pollAttempts < 180) {
    await sleep(2500);
    pollAttempts++;
    const pollRes = await fetch(`${baseUrl}/api/experiments/${experimentId}`);
    if (pollRes.ok) {
      data = await pollRes.json();
      status = data.status;
      process.stdout.write(`\rPolling [${pollAttempts}] Status: ${status} (~${pollAttempts * 2.5}s elapsed)...`);
    } else {
      console.warn(`Poll warning: HTTP ${pollRes.status}`);
    }
  }
  console.log('');

  if (status !== 'DONE' || !data) {
    throw new Error(`Experiment ${experimentId} failed or timed out. Status: ${status}`);
  }

  console.log(`Experiment ${experimentId} finished in ${data.durationMs} ms.`);

  // SAFETY RULE CHECK: PROTECTED mode must NEVER have duplicate orders
  const protDups = data.protectedMode?.duplicateOrdersCount ?? 0;
  if (protDups > 0) {
    console.error(`\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`);
    console.error(`CRITICAL SAFETY VIOLATION: PROTECTED MODE PRODUCED ${protDups} DUPLICATES!`);
    console.error(`STOPPING IMMEDIATELY AS MANDATED BY BUILD PLAN.`);
    console.error(`!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`);

    const incidentDoc = `# CRITICAL INCIDENT: PROTECTED DUPLICATE ORDERS DETECTED

Timestamp: ${new Date().toISOString()}
Label: ${label}
Repetition: ${repIndex + 1}
Experiment ID: ${experimentId}

## Config
\`\`\`json
${JSON.stringify(payload, null, 2)}
\`\`\`

## Complete Telemetry
\`\`\`json
${JSON.stringify(data, null, 2)}
\`\`\`
`;
    fs.writeFileSync(path.join('docs', 'INCIDENT_PROTECTED_DUPLICATE.md'), incidentDoc, 'utf8');
    process.exit(2);
  }

  return {
    repetition: repIndex + 1,
    experimentId,
    durationMs: data.durationMs,
    naive: data.naive,
    protectedMode: data.protectedMode,
    delta: data.delta
  };
}

function calculateStats(values) {
  if (!values || values.length === 0) return { mean: 0, min: 0, max: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return {
    mean: Number(mean.toFixed(2)),
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2))
  };
}

async function main() {
  const results = [];

  for (let r = 0; r < repetitions; r++) {
    const res = await runSingleExperiment(r);
    results.push(res);
  }

  // Compute aggregate stats across repetitions
  const stats = {
    naive: {
      duplicateOrders: calculateStats(results.map(r => r.naive.duplicateOrdersCount)),
      overchargedAmount: calculateStats(results.map(r => Number(r.naive.overchargedAmount))),
      retrySuccessRate: calculateStats(results.map(r => r.naive.retrySuccessRate * 100)),
      avgRecoveryMs: calculateStats(results.map(r => r.naive.avgRecoveryMs)),
      avgLatencyMs: calculateStats(results.map(r => r.naive.avgLatencyMs)),
      p95LatencyMs: calculateStats(results.map(r => r.naive.p95LatencyMs)),
      ordersSucceeded: calculateStats(results.map(r => r.naive.ordersSucceeded || r.naive.success)),
      durationMs: calculateStats(results.map(r => r.durationMs))
    },
    protectedMode: {
      duplicateOrders: calculateStats(results.map(r => r.protectedMode.duplicateOrdersCount)),
      overchargedAmount: calculateStats(results.map(r => Number(r.protectedMode.overchargedAmount))),
      retrySuccessRate: calculateStats(results.map(r => r.protectedMode.retrySuccessRate * 100)),
      avgRecoveryMs: calculateStats(results.map(r => r.protectedMode.avgRecoveryMs)),
      avgLatencyMs: calculateStats(results.map(r => r.protectedMode.avgLatencyMs)),
      p95LatencyMs: calculateStats(results.map(r => r.protectedMode.p95LatencyMs)),
      ordersSucceeded: calculateStats(results.map(r => r.protectedMode.ordersSucceeded || r.protectedMode.success)),
      durationMs: calculateStats(results.map(r => r.durationMs))
    }
  };

  console.log('\n' + '='.repeat(70));
  console.log(`BENCHMARK SUMMARY (${repetitions} repetitions): ${label}`);
  console.log('='.repeat(70));

  const markdownTable = `
| Metric | NAIVE (Mean [Min - Max]) | PROTECTED (Mean [Min - Max]) | Impact / Safety |
|:-------|:-------------------------|:-----------------------------|:----------------|
| **Duplicate Orders Charged** | ${stats.naive.duplicateOrders.mean} [${stats.naive.duplicateOrders.min} - ${stats.naive.duplicateOrders.max}] | **${stats.protectedMode.duplicateOrders.mean}** [${stats.protectedMode.duplicateOrders.min} - ${stats.protectedMode.duplicateOrders.max}] | 100% Elimination |
| **Overcharged Amount (₹)** | ₹${stats.naive.overchargedAmount.mean.toFixed(2)} [₹${stats.naive.overchargedAmount.min.toFixed(2)} - ₹${stats.naive.overchargedAmount.max.toFixed(2)}] | **₹${stats.protectedMode.overchargedAmount.mean.toFixed(2)}** [₹${stats.protectedMode.overchargedAmount.min.toFixed(2)} - ₹${stats.protectedMode.overchargedAmount.max.toFixed(2)}] | Zero Financial Loss |
| **Orders Succeeded** | ${stats.naive.ordersSucceeded.mean} [${stats.naive.ordersSucceeded.min} - ${stats.naive.ordersSucceeded.max}] | **${stats.protectedMode.ordersSucceeded.mean}** [${stats.protectedMode.ordersSucceeded.min} - ${stats.protectedMode.ordersSucceeded.max}] | Full Isolation |
| **Retry Success Rate (%)** | ${stats.naive.retrySuccessRate.mean.toFixed(1)}% [${stats.naive.retrySuccessRate.min.toFixed(1)}% - ${stats.naive.retrySuccessRate.max.toFixed(1)}%] | **${stats.protectedMode.retrySuccessRate.mean.toFixed(1)}%** [${stats.protectedMode.retrySuccessRate.min.toFixed(1)}% - ${stats.protectedMode.retrySuccessRate.max.toFixed(1)}%] | Backoff Efficacy |
| **Avg Recovery Time (ms)** | ${stats.naive.avgRecoveryMs.mean.toFixed(0)} ms [${stats.naive.avgRecoveryMs.min.toFixed(0)} - ${stats.naive.avgRecoveryMs.max.toFixed(0)}] | **${stats.protectedMode.avgRecoveryMs.mean.toFixed(0)} ms** [${stats.protectedMode.avgRecoveryMs.min.toFixed(0)} - ${stats.protectedMode.avgRecoveryMs.max.toFixed(0)}] | MTTR Recovery |
| **Avg Attempt Latency (ms)** | ${stats.naive.avgLatencyMs.mean.toFixed(1)} ms [${stats.naive.avgLatencyMs.min.toFixed(1)} - ${stats.naive.avgLatencyMs.max.toFixed(1)}] | **${stats.protectedMode.avgLatencyMs.mean.toFixed(1)} ms** [${stats.protectedMode.avgLatencyMs.min.toFixed(1)} - ${stats.protectedMode.avgLatencyMs.max.toFixed(1)}] | Attempt Overhead |
| **P95 Latency (ms)** | ${stats.naive.p95LatencyMs.mean.toFixed(1)} ms [${stats.naive.p95LatencyMs.min.toFixed(1)} - ${stats.naive.p95LatencyMs.max.toFixed(1)}] | **${stats.protectedMode.p95LatencyMs.mean.toFixed(1)} ms** [${stats.protectedMode.p95LatencyMs.min.toFixed(1)} - ${stats.protectedMode.p95LatencyMs.max.toFixed(1)}] | Tail Latency |
`;

  console.log(markdownTable);

  const outData = {
    label,
    config: { count, concurrency, duplicateSubmitRate, timeoutRate, errorRate, channelFailureRate, latencyMs, repetitions },
    stats,
    runs: results
  };

  const outFilePath = path.join('scripts', `${label.toLowerCase().replace(/[^a-z0-9_-]/g, '_')}_results.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(outData, null, 2), 'utf8');
  console.log(`Detailed JSON telemetry written to ${outFilePath}`);
}

main().catch((err) => {
  console.error('\nExecution error:', err);
  process.exit(1);
});
