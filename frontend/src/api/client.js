export const BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080').replace(/\/+$/, '');

export function getAdminToken() {
  return localStorage.getItem('rp_admin_token') || '';
}

export function setAdminToken(token) {
  if (token) {
    localStorage.setItem('rp_admin_token', token);
  } else {
    localStorage.removeItem('rp_admin_token');
  }
}

export function clearAdminToken() {
  localStorage.removeItem('rp_admin_token');
}

export function getAdminHeaders() {
  const token = getAdminToken();
  const headers = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const token = getAdminToken();

  const headers = {
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
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

  if (response.status === 401) {
    window.dispatchEvent(new CustomEvent('rp_auth_unauthorized'));
  }

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

export const api = {
  // System Health & Wake-up
  getHealth: () => request('/actuator/health'),
  wakeSystem: () => request('/api/system/wake'),
  getBankHealth: () => request('/actuator/health'),
  getAdminConfig: () => request('/api/admin/config'),

  // Auth
  adminLogin: ({ username, password }) => request('/api/auth/admin/login', {
    method: 'POST',
    body: { username, password }
  }),

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
    body: config
  }),

  // Experiments
  runExperiment: (config) => request('/api/experiments/run', {
    method: 'POST',
    body: config
  }),

  getExperiment: (id) => request(`/api/experiments/${id}`),

  // Metrics
  getMetricsSummary: () => request('/api/metrics/summary'),

  // Admin
  resetSystem: () => request('/api/admin/reset', {
    method: 'POST'
  })
};

export default api;
