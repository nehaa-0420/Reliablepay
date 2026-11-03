#!/usr/bin/env node
/**
 * scripts/run_handoff_benchmarks.js
 * Runs the Demo preset experiment 3 times, captures raw JSONs,
 * validates 0 duplicates in PROTECTED mode, and generates summary CSV & Markdown.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8080';
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'adminpassword';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
const RESULTS_DIR = path.join(__dirname, '..', 'docs', 'handoff', 'results');

let bearerToken = null;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureAuthenticated() {
  if (bearerToken) return;
  if (ADMIN_TOKEN) {
    bearerToken = ADMIN_TOKEN;
    return;
  }
  try {
    const res = await fetch(`${BASE_URL}/api/auth/admin/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD })
    });
    if (res.ok) {
      const data = await res.json();
      bearerToken = data.token;
      console.log('✓ Admin login successful. Bearer token acquired.');
    } else {
      console.warn(`Admin login returned status ${res.status}`);
    }
  } catch (err) {
    console.warn(`Admin login attempt failed: ${err.message}`);
  }
}

async function request(endpoint, options = {}) {
  await ensureAuthenticated();
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    ...(bearerToken ? { 'Authorization': `Bearer ${bearerToken}` } : {}),
    ...(ADMIN_TOKEN ? { 'X-Admin-Token': ADMIN_TOKEN } : {}),
    ...(options.headers || {})
  };

  const res = await fetch(url, { ...options, headers });
  if (res.status === 204) return null;
  const contentType = res.headers.get('content-type') || '';
  const data = contentType.includes('application/json') ? await res.json() : await res.text();
  if (!res.ok) {
    const msg = (data && data.message) || data || `HTTP ${res.status}`;
    throw new Error(`${options.method || 'GET'} ${endpoint} failed: ${msg}`);
  }
  return data;
}

async function runSingleExperiment(runNumber) {
  console.log(`\n======================================================================`);
  console.log(`Starting Benchmark Run ${runNumber} of 3`);
  console.log(`======================================================================`);

  // 1. Purge DB
  console.log(`[Run ${runNumber}] Resetting database...`);
  try {
    await request('/api/admin/reset', { method: 'POST' });
    console.log(`[Run ${runNumber}] Database purged.`);
  } catch (err) {
    console.warn(`[Run ${runNumber}] Admin reset notice: ${err.message}`);
  }

  // 2. Set Chaos
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
  console.log(`[Run ${runNumber}] Demo chaos applied (timeout 0.3, error 0.1, latency 500ms).`);

  // 3. Launch experiment
  const payload = {
    count: 60,
    concurrency: 10,
    duplicateSubmitRate: 0.2,
    chaos: demoChaos
  };
  const launch = await request('/api/experiments/run', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  const expId = launch.experimentId || launch.id;
  console.log(`[Run ${runNumber}] Experiment dispatched: ID ${expId}`);

  // 4. Poll
  let status = 'RUNNING';
  let pollAttempts = 0;
  let data = null;

  while (status === 'RUNNING' && pollAttempts < 150) {
    await sleep(2000);
    pollAttempts++;
    data = await request(`/api/experiments/${expId}`);
    status = data.status;
    process.stdout.write(`\r[Run ${runNumber}] Polling [${pollAttempts}] Status: ${status} (~${pollAttempts * 2}s elapsed)...`);
  }
  console.log('');

  if (status !== 'DONE' || !data) {
    throw new Error(`Run ${runNumber} (${expId}) did not complete. Status: ${status} (Error: ${data?.errorMessage || 'unknown'})`);
  }

  console.log(`[Run ${runNumber}] Finished in ${data.durationMs}ms`);

  const protDups = data.protectedMode?.duplicateOrdersCount ?? 0;
  if (protDups > 0) {
    const incidentPath = path.join(__dirname, '..', 'docs', 'INCIDENT_PROTECTED_DUPLICATE.md');
    const incidentContent = `# INCIDENT REPORT: PROTECTED Mode Produced Duplicate Charges\n\n` +
      `Date: ${new Date().toISOString()}\n` +
      `Experiment ID: ${expId}\n` +
      `Run Number: ${runNumber}\n` +
      `Protected Duplicates Count: ${protDups}\n\n` +
      `Full Experiment JSON:\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\`\n`;
    fs.writeFileSync(incidentPath, incidentContent, 'utf8');
    console.error(`CRITICAL SAFETY FAILURE: PROTECTED mode recorded ${protDups} duplicates! Written to docs/INCIDENT_PROTECTED_DUPLICATE.md`);
    process.exit(1);
  }

  // Save raw json
  if (!fs.existsSync(RESULTS_DIR)) {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
  }
  const rawPath = path.join(RESULTS_DIR, `demo_run_${runNumber}.json`);
  fs.writeFileSync(rawPath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`[Run ${runNumber}] Raw JSON saved to ${rawPath}`);

  return data;
}

function calcStats(values) {
  const nums = values.map(Number);
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const sum = nums.reduce((a, b) => a + b, 0);
  const mean = sum / nums.length;
  return { min, max, mean };
}

async function main() {
  const runs = [];
  for (let i = 1; i <= 3; i++) {
    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      attempts++;
      try {
        const res = await runSingleExperiment(i);
        runs.push(res);
        success = true;
      } catch (err) {
        console.warn(`[Run ${i}] Attempt ${attempts} failed: ${err.message}`);
        if (attempts >= 3) throw err;
        console.log(`[Run ${i}] Retrying in 5 seconds...`);
        await sleep(5000);
      }
    }
  }

  const metrics = [
    { key: 'duplicateOrdersCount', label: 'Duplicate Orders Count', isCurrency: false, isPercent: false },
    { key: 'overchargedAmount', label: 'Overcharged Amount (INR)', isCurrency: true, isPercent: false },
    { key: 'retrySuccessRate', label: 'Retry Success Rate (%)', isCurrency: false, isPercent: true },
    { key: 'avgRecoveryMs', label: 'Avg Recovery Time (ms)', isCurrency: false, isPercent: false },
    { key: 'avgLatencyMs', label: 'Avg Latency (ms)', isCurrency: false, isPercent: false },
    { key: 'p95LatencyMs', label: 'P95 Latency (ms)', isCurrency: false, isPercent: false },
  ];

  const summary = {};

  for (const m of metrics) {
    const naiveVals = runs.map(r => r.naive[m.key] ?? 0);
    const protVals = runs.map(r => r.protectedMode[m.key] ?? 0);
    summary[m.key] = {
      label: m.label,
      naive: calcStats(naiveVals),
      prot: calcStats(protVals),
      isCurrency: m.isCurrency,
      isPercent: m.isPercent
    };
  }

  const machine = `${os.type()} ${os.release()} (${os.arch()}), Node ${process.version}`;
  const dateStr = new Date().toISOString();
  const configStr = `count=60, concurrency=10, duplicateSubmitRate=0.2, timeoutRate=0.3, errorRate=0.1, latencyMs=500`;

  // Write CSV
  let csv = `Metric,NAIVE_Run1,NAIVE_Run2,NAIVE_Run3,NAIVE_Mean,NAIVE_Min,NAIVE_Max,PROTECTED_Run1,PROTECTED_Run2,PROTECTED_Run3,PROTECTED_Mean,PROTECTED_Min,PROTECTED_Max\n`;
  for (const m of metrics) {
    const s = summary[m.key];
    const n1 = runs[0].naive[m.key] ?? 0;
    const n2 = runs[1].naive[m.key] ?? 0;
    const n3 = runs[2].naive[m.key] ?? 0;
    const p1 = runs[0].protectedMode[m.key] ?? 0;
    const p2 = runs[1].protectedMode[m.key] ?? 0;
    const p3 = runs[2].protectedMode[m.key] ?? 0;
    csv += `"${m.label}",${n1},${n2},${n3},${s.naive.mean.toFixed(2)},${s.naive.min},${s.naive.max},${p1},${p2},${p3},${s.prot.mean.toFixed(2)},${s.prot.min},${s.prot.max}\n`;
  }
  const csvPath = path.join(RESULTS_DIR, 'results_summary.csv');
  fs.writeFileSync(csvPath, csv, 'utf8');
  console.log(`\nCSV summary written to: ${csvPath}`);

  // Write Markdown
  let md = `# ReliablePay — Demo Preset Benchmark Results (3 Replications)

- **Date**: ${dateStr}
- **Machine**: ${machine}
- **Configuration**: \`${configStr}\`
- **Replications**: 3 consecutive runs with database reset between runs
- **Safety Invariant**: PROTECTED mode produced **0** duplicate debits across all runs (Zero Financial Loss).

## 1. Summary Statistics Table

| Metric | NAIVE (Mean) | NAIVE (Min - Max) | PROTECTED (Mean) | PROTECTED (Min - Max) | Delta / Improvement |
| :--- | :---: | :---: | :---: | :---: | :---: |
`;

  for (const m of metrics) {
    const s = summary[m.key];
    let nMeanStr = s.naive.mean.toFixed(2);
    let nMinMaxStr = `${s.naive.min} - ${s.naive.max}`;
    let pMeanStr = s.prot.mean.toFixed(2);
    let pMinMaxStr = `${s.prot.min} - ${s.prot.max}`;

    if (s.isCurrency) {
      nMeanStr = `₹${s.naive.mean.toFixed(2)}`;
      nMinMaxStr = `₹${s.naive.min.toFixed(2)} - ₹${s.naive.max.toFixed(2)}`;
      pMeanStr = `₹${s.prot.mean.toFixed(2)}`;
      pMinMaxStr = `₹${s.prot.min.toFixed(2)} - ₹${s.prot.max.toFixed(2)}`;
    } else if (s.isPercent) {
      nMeanStr = `${(s.naive.mean * 100).toFixed(1)}%`;
      nMinMaxStr = `${(s.naive.min * 100).toFixed(1)}% - ${(s.naive.max * 100).toFixed(1)}%`;
      pMeanStr = `${(s.prot.mean * 100).toFixed(1)}%`;
      pMinMaxStr = `${(s.prot.min * 100).toFixed(1)}% - ${(s.prot.max * 100).toFixed(1)}%`;
    }

    let delta = '';
    if (m.key === 'duplicateOrdersCount') {
      delta = `100% Elimination (${s.naive.mean.toFixed(1)} -> 0)`;
    } else if (m.key === 'overchargedAmount') {
      delta = `₹${(s.naive.mean - s.prot.mean).toFixed(2)} Protected`;
    } else if (m.key === 'retrySuccessRate') {
      delta = `+${((s.prot.mean - s.naive.mean) * 100).toFixed(1)}%`;
    } else {
      delta = `Reconciliation trade-off`;
    }

    md += `| **${m.label}** | ${nMeanStr} | ${nMinMaxStr} | **${pMeanStr}** | **${pMinMaxStr}** | ${delta} |\n`;
  }

  md += `\n## 2. Individual Run Details

| Run | Experiment ID | NAIVE Dups (Loss) | PROTECTED Dups (Loss) | NAIVE P95 Latency | PROTECTED P95 Latency | Duration |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: |
`;

  runs.forEach((r, idx) => {
    const id = r.experimentId || r.id;
    const nDups = r.naive?.duplicateOrdersCount ?? 0;
    const nLoss = `₹${Number(r.naive?.overchargedAmount ?? 0).toFixed(2)}`;
    const pDups = r.protectedMode?.duplicateOrdersCount ?? 0;
    const pLoss = `₹${Number(r.protectedMode?.overchargedAmount ?? 0).toFixed(2)}`;
    const nP95 = `${Math.round(r.naive?.p95LatencyMs ?? 0)} ms`;
    const pP95 = `${Math.round(r.protectedMode?.p95LatencyMs ?? 0)} ms`;
    const dur = `${(r.durationMs / 1000).toFixed(1)}s`;
    md += `| Run ${idx + 1} | \`${id}\` | ${nDups} (${nLoss}) | **${pDups} (${pLoss})** | ${nP95} | ${pP95} | ${dur} |\n`;
  });

  md += `\n## 3. Raw Data Files
- [demo_run_1.json](demo_run_1.json)
- [demo_run_2.json](demo_run_2.json)
- [demo_run_3.json](demo_run_3.json)
- [results_summary.csv](results_summary.csv)
`;

  const mdPath = path.join(RESULTS_DIR, 'results_summary.md');
  fs.writeFileSync(mdPath, md, 'utf8');
  console.log(`Markdown summary written to: ${mdPath}`);
  console.log(`\nAll 3 benchmark runs completed successfully!`);
}

main().catch((err) => {
  console.error('\nBenchmark execution failed:', err);
  process.exit(1);
});
