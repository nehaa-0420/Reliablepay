#!/usr/bin/env node
/**
 * scripts/prepare_demo.js
 * Automated demo preparation routine for ReliablePay review.
 * 
 * Actions:
 * 1. Resets database (purges old transactions & bank charges).
 * 2. Applies the Demo chaos preset (timeoutRate 0.3, errorRate 0.1, latencyMs 500).
 * 3. Dispatches Quick 60 benchmark trial (NAIVE vs PROTECTED).
 * 4. Polls until completion and outputs the final comparison summary.
 * 5. Leaves chaos config set to Demo preset for live interactive UI testing.
 */

const BASE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8080';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && data.message) || data || `HTTP ${res.status}`;
    throw new Error(`${options.method || 'GET'} ${path} failed: ${msg}`);
  }
  return data;
}

async function prepareDemo() {
  console.log('='.repeat(70));
  console.log('ReliablePay — Automated Demo Preparation Routine');
  console.log(`Target: ${BASE_URL}`);
  console.log('='.repeat(70));

  // 1. Reset Database
  console.log('\n[1/4] Resetting system database (purging old transactions & charges)...');
  try {
    await request('/api/admin/reset', { method: 'POST' });
    console.log('✓ Database purged successfully.');
  } catch (err) {
    console.warn(`! Admin reset notice: ${err.message}. Proceeding...`);
  }

  // 2. Apply Demo Chaos Preset
  console.log('\n[2/4] Applying Demo chaos preset to Mock Bank...');
  const demoChaos = {
    timeoutRate: 0.3,
    errorRate: 0.1,
    channelFailureRate: 0.0,
    chargeOnTimeoutProbability: 0.5,
    latencyMs: 500
  };
  await request('/api/chaos', {
    method: 'PUT',
    body: JSON.stringify(demoChaos)
  });
  console.log('✓ Demo chaos applied: 30% timeouts, 10% errors, 500ms latency.');

  // 3. Launch Quick 60 Experiment
  console.log('\n[3/4] Launching Quick 60 benchmark trial (count=60, concurrency=10, dupRate=0.2)...');
  const launchPayload = {
    count: 60,
    concurrency: 10,
    duplicateSubmitRate: 0.2,
    chaos: demoChaos
  };
  const launchRes = await request('/api/experiments/run', {
    method: 'POST',
    body: JSON.stringify(launchPayload)
  });
  const experimentId = launchRes.experimentId || launchRes.id;
  console.log(`✓ Experiment started with ID: ${experimentId}`);

  // 4. Poll Until Completion
  console.log('\n[4/4] Polling experiment progress...');
  let status = 'RUNNING';
  let pollAttempts = 0;
  let data = null;

  while (status === 'RUNNING' && pollAttempts < 120) {
    await sleep(2000);
    pollAttempts++;
    data = await request(`/api/experiments/${experimentId}`);
    status = data.status;
    process.stdout.write(`\rPolling [${pollAttempts}] Status: ${status} (~${pollAttempts * 2}s elapsed)...`);
  }
  console.log('');

  if (status !== 'DONE' || !data) {
    throw new Error(`Experiment ${experimentId} did not finish cleanly. Status: ${status}`);
  }

  console.log(`✓ Experiment finished in ${data.durationMs} ms.`);

  // Verify SAFETY RULE: PROTECTED must have 0 duplicates
  const naiveDups = data.naive?.duplicateOrdersCount ?? 0;
  const naiveLoss = Number(data.naive?.overchargedAmount ?? 0);
  const protDups = data.protectedMode?.duplicateOrdersCount ?? 0;
  const protLoss = Number(data.protectedMode?.overchargedAmount ?? 0);

  console.log('\n' + '='.repeat(70));
  console.log('BENCHMARK EVALUATION RESULTS');
  console.log('='.repeat(70));
  console.log(`Experiment ID:             ${experimentId}`);
  console.log(`NAIVE Duplicate Orders:    ${naiveDups} debited multiple times (₹${naiveLoss.toFixed(2)} lost)`);
  console.log(`PROTECTED Duplicate Orders:${protDups} (Zero financial loss: ₹${protLoss.toFixed(2)})`);
  console.log(`Prevented Overcharges:     ₹${(naiveLoss - protLoss).toFixed(2)}`);
  console.log(`Direct Comparison URL:     http://localhost:5173/compare/${experimentId}`);
  console.log('='.repeat(70));

  if (protDups > 0) {
    console.error(`CRITICAL SAFETY VIOLATION: PROTECTED MODE PRODUCED ${protDups} DUPLICATES!`);
    process.exit(2);
  }

  // Ensure chaos remains at Demo preset for interactive testing
  await request('/api/chaos', {
    method: 'PUT',
    body: JSON.stringify(demoChaos)
  });
  console.log('\n✓ System left in DEMO chaos configuration for live presentation.\n');
  return data;
}

if (require.main === module) {
  prepareDemo().catch((err) => {
    console.error('\nPrepare demo error:', err.message);
    process.exit(1);
  });
}

module.exports = { prepareDemo };
