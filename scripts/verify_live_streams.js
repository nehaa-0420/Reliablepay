const http = require('http');

const BASE_URL = process.env.PAYMENT_SERVICE_URL || 'http://localhost:8080';
const username = process.env.ADMIN_USERNAME;
const password = process.env.ADMIN_PASSWORD;

if (!username || !password) {
  console.error('Error: ADMIN_USERNAME and ADMIN_PASSWORD environment variables are required.');
  console.error('Usage: ADMIN_USERNAME=<username> ADMIN_PASSWORD=<password> node scripts/verify_live_streams.js');
  process.exit(1);
}

async function main() {
  console.log('--- Step 1: Admin Login & JWT Acquisition ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (!loginRes.ok) {
    throw new Error(`Admin login failed with status ${loginRes.status}: ${await loginRes.text()}`);
  }
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Admin login successful. Token acquired.');

  console.log('\n--- Step 2: Configure Chaos (timeoutRate=0.4, errorRate=0.2) ---');
  const chaosRes = await fetch(`${BASE_URL}/api/chaos`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      timeoutRate: 0.4,
      errorRate: 0.2,
      channelFailureRate: 0.0,
      chargeOnTimeoutProbability: 0.5,
      latencyMs: 50
    })
  });
  const chaosData = await chaosRes.json();
  console.log('Chaos configured:', JSON.stringify(chaosData));

  console.log('\n--- Step 3: Connect to Admin SSE Stream ---');
  const adminStreamEvents = [];
  const adminRes = await fetch(`${BASE_URL}/api/admin/stream`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  const adminReader = adminRes.body.getReader();
  const decoder = new TextDecoder();

  // Background reader for admin stream
  (async () => {
    let buffer = '';
    while (true) {
      const { value, done } = await adminReader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const part of parts) {
        if (part.trim()) {
          adminStreamEvents.push(part.trim());
          if (part.includes('event:transition')) {
            console.log('[ADMIN STREAM EVENT RECEIVED]');
            console.log(part.trim());
          }
        }
      }
    }
  })().catch(() => {});

  // Wait 500ms for admin stream snapshot
  await new Promise(r => setTimeout(r, 500));

  console.log('\n--- Step 4: Create a New Payment Under Chaos ---');
  const idempKey = 'live-stream-' + Date.now();
  const createRes = await fetch(`${BASE_URL}/api/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempKey
    },
    body: JSON.stringify({
      merchantRef: 'MERCH-STREAM-CHAOS',
      amount: 450.00,
      currency: 'INR',
      mode: 'PROTECTED'
    })
  });
  const payment = await createRes.json();
  console.log('Created payment:', payment.id, 'Status:', payment.status);

  console.log('\n--- Step 5: Connect to Customer Payment SSE Stream ---');
  const payRes = await fetch(`${BASE_URL}/api/payments/${payment.id}/stream`);
  const payReader = payRes.body.getReader();
  const payStreamEvents = [];

  const payPromise = (async () => {
    let buffer = '';
    while (true) {
      const { value, done } = await payReader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n\n');
      buffer = parts.pop();
      for (const part of parts) {
        if (part.trim()) {
          payStreamEvents.push(part.trim());
          if (part.includes('event:transition') || part.includes('event:snapshot')) {
            console.log('[CUSTOMER PAYMENT STREAM EVENT RECEIVED]');
            console.log(part.trim());
          }
        }
      }
      // If we got transition events or timeout, break after seeing transitions
      if (payStreamEvents.some(e => e.includes('event:transition'))) {
        break;
      }
    }
  })();

  // Also if already finished or after waiting a few seconds
  await Promise.race([
    payPromise,
    new Promise(r => setTimeout(r, 6000))
  ]);

  // Give another second to capture subsequent transitions if any
  await new Promise(r => setTimeout(r, 1500));

  console.log('\n=== SUMMARY OF CAPTURED LIVE STREAM EVENTS ===');
  console.log('\nCustomer Stream (/api/payments/' + payment.id + '/stream):');
  payStreamEvents.forEach((ev, i) => console.log(`[Event ${i+1}]\n${ev}\n`));

  console.log('\nAdmin Stream (/api/admin/stream transitions):');
  adminStreamEvents.filter(e => e.includes('event:transition')).forEach((ev, i) => console.log(`[Transition ${i+1}]\n${ev}\n`));

  adminReader.cancel();
  payReader.cancel();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
