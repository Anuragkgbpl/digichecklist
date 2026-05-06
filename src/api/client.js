/**
 * src/api/client.js
 * Centralized API client for the  backend.
 * 
 * When VITE_API_URL is set, calls go to the Express backend.
 * Otherwise falls back to direct Firebase (current behavior).
 */

const API_BASE = import.meta.env.VITE_API_URL || null;

const apiCall = async (method, path, body = null) => {
  if (!API_BASE) return null; // No server configured — caller should use Firebase fallback

  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${API_BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `API error ${res.status}`);
  }
  return res.json();
};

// ── Auth ─────────────────────────────────────────────────────────
export const apiLogin = (loginId, password) =>
  apiCall('POST', '/api/auth/login', { loginId, password });

// ── Dashboard Analytics ──────────────────────────────────────────
export const apiGetDashboardAnalytics = (filters = {}, drillPath = []) => {
  const params = new URLSearchParams({
    ...filters,
    drillPath: JSON.stringify(drillPath)
  });
  return apiCall('GET', `/api/dashboard/analytics?${params}`);
};

// ── Shift Validation ─────────────────────────────────────────────
export const apiValidateShift = (frequency, employeeId) =>
  apiCall('POST', '/api/shifts/validate', { frequency, employeeId });

// ── Submissions ───────────────────────────────────────────────────
export const apiGetSubmissions = () => apiCall('GET', '/api/submissions');

export const apiPostSubmissions = (records, supportItems = [], logEntry = null) =>
  apiCall('POST', '/api/submissions', { records, supportItems, logEntry });

// ── Server Health ─────────────────────────────────────────────────
export const apiHealthCheck = () => apiCall('GET', '/api/health');

export const isApiAvailable = () => !!API_BASE;
