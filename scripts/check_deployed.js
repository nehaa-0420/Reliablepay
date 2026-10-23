// scripts/check_deployed.js
// Probe deployed cloud instances on Render & Vercel with 90s timeout and 3 retries

const RENDER_PAYMENT = 'https://reliablepay-payment-service.onrender.com';
const RENDER_BANK = 'https://reliablepay-mock-bank.onrender.com';
const VERCEL_FRONTEND = 'https://reliablepay-demo.vercel.app';
const VERCEL_FALLBACK = 'https://reliablepay-frontend.vercel.app';

async function fetchWithRetry(url, options = {}, retries = 3, timeoutMs = 90000) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const start = Date.now();
    try {
      console.log(`[Attempt ${attempt}/${retries}] Fetching: ${url}...`);
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      const text = await res.text();
      return { status: res.status, headers: res.headers, text, elapsed };
    } catch (err) {
      clearTimeout(timer);
      const elapsed = Date.now() - start;
      console.warn(`  Attempt ${attempt} failed after ${elapsed}ms: ${err.message}`);
      if (attempt === retries) {
        return { error: err.message, elapsed };
      }
      await new Promise(r => setTimeout(r, 2000));
    }
  }
}

async function run() {
  console.log('='.repeat(70));
  console.log('STEP 4: DEPLOYED SYSTEM PROBE (RENDER & VERCEL)');
  console.log('='.repeat(70));

  // 1. Payment Service Health
  console.log('\n--- 1. Payment Service Health: /actuator/health ---');
  const pHealth = await fetchWithRetry(`${RENDER_PAYMENT}/actuator/health`);
  console.log('Result:', JSON.stringify(pHealth));

  // 2. Mock Bank Health
  console.log('\n--- 2. Mock Bank Health: /actuator/health ---');
  const bHealth = await fetchWithRetry(`${RENDER_BANK}/actuator/health`);
  console.log('Result:', JSON.stringify(bHealth));

  // 3. System Wake
  console.log('\n--- 3. System Wake: /api/system/wake ---');
  const wake = await fetchWithRetry(`${RENDER_PAYMENT}/api/system/wake`);
  console.log('Result:', JSON.stringify(wake));

  // 4. Vercel Direct Load
  console.log('\n--- 4. Vercel Direct Load: / ---');
  let vercel = await fetchWithRetry(VERCEL_FRONTEND);
  if (vercel.status === 404) {
    console.log(`Trying alternative: ${VERCEL_FALLBACK}`);
    vercel = await fetchWithRetry(VERCEL_FALLBACK);
  }
  console.log('Result:', JSON.stringify({ status: vercel.status, elapsed: vercel.elapsed, bodySample: (vercel.text || '').substring(0, 100) }));

  // 5. CORS Preflight
  console.log('\n--- 5. CORS Preflight from Vercel Origin ---');
  const cors = await fetchWithRetry(`${RENDER_PAYMENT}/api/payments`, {
    method: 'OPTIONS',
    headers: {
      'Origin': VERCEL_FRONTEND,
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type, Idempotency-Key'
    }
  });
  console.log('Result:', JSON.stringify({
    status: cors.status,
    originHeader: cors.headers?.get ? cors.headers.get('access-control-allow-origin') : null
  }));

  // 6. Reset 401 without Token
  console.log('\n--- 6. Admin Reset 401 Without Token ---');
  const reset401 = await fetchWithRetry(`${RENDER_PAYMENT}/api/admin/reset`, { method: 'POST' });
  console.log('Result:', JSON.stringify({ status: reset401.status, body: reset401.text }));

  // 7. Payment Create + Replay
  console.log('\n--- 7. Payment Create + Replay on Deployed Backend ---');
  const idemKey = 'cloud-idem-' + Date.now();
  const paymentPayload = JSON.stringify({
    merchantRef: 'cloud-test-' + Date.now(),
    amount: 100.00,
    currency: 'INR'
  });
  const headers = { 'Content-Type': 'application/json', 'Idempotency-Key': idemKey };

  const createRes = await fetchWithRetry(`${RENDER_PAYMENT}/api/payments`, { method: 'POST', headers, body: paymentPayload });
  console.log('Create Result:', JSON.stringify({ status: createRes.status, body: createRes.text }));

  const replayRes = await fetchWithRetry(`${RENDER_PAYMENT}/api/payments`, { method: 'POST', headers, body: paymentPayload });
  console.log('Replay Result:', JSON.stringify({ status: replayRes.status, body: replayRes.text }));

  console.log('\n' + '='.repeat(70));
  console.log('DEPLOYED PROBE SUMMARY');
  console.log('='.repeat(70));
}

run();
