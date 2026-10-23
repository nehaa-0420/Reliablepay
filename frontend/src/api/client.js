const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
// Note: VITE_ADMIN_TOKEN is a demo-level guard, not a full production authentication system.
const ADMIN_TOKEN = import.meta.env.VITE_ADMIN_TOKEN || '';

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };

  if (options.body && typeof options.body === 'object' && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  if (response.status === 204) {
    return null;
  }

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = (data && data.message) || (data && data.error) || (typeof data === 'string' && data) || `HTTP ${response.status}`;
    const err = new Error(errorMsg);
    err.status = response.status;
    err.data = data;
    throw err;
  }

  return data;
}

function getAdminHeaders() {
  const headers = {};
  if (ADMIN_TOKEN) {
    headers['X-Admin-Token'] = ADMIN_TOKEN;
  }
  return headers;
}

export const api = {
  // System Health & Wake-up
  getHealth: () => request('/actuator/health'),
  wakeSystem: () => request('/api/system/wake'),

  // Payments
  getPayments: ({ status, mode, page = 0, size = 10 } = {}) => {
    const params = new URLSearchParams();
    if (status && status !== 'ALL') params.append('status', status);
    if (mode && mode !== 'ALL') params.append('mode', mode);
    params.append('page', page);
    params.append('size', size);
    return request(`/api/payments?${params.toString()}`);
  },

  getPayment: (id) => request(`/api/payments/${id}`),

  getPaymentEvents: (id) => request(`/api/payments/${id}/events`),

  createPayment: (payload, idempotencyKey) => {
    const headers = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return request('/api/payments', {
      method: 'POST',
      headers,
      body: payload
    });
  },

  requeuePayment: (id) => request(`/api/payments/${id}/requeue`, {
    method: 'POST'
  }),

  // Chaos
  getChaosConfig: () => request('/api/chaos'),

  updateChaosConfig: (config) => request('/api/chaos', {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: config
  }),

  // Experiments
  runExperiment: (config) => request('/api/experiments/run', {
    method: 'POST',
    headers: getAdminHeaders(),
    body: config
  }),

  getExperiment: (id) => request(`/api/experiments/${id}`),

  // Metrics
  getMetricsSummary: () => request('/api/metrics/summary'),

  // Admin
  resetSystem: () => request('/api/admin/reset', {
    method: 'POST',
    headers: getAdminHeaders()
  })
};

export default api;
