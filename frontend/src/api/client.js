import axios from 'axios';
import { log } from '../utils/logger';
const api = axios.create({ baseURL: import.meta.env.VITE_BASE_URL || 'http://localhost:3000', timeout: 20000 });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const requestId = crypto.randomUUID();
  config.headers['X-Request-Id'] = requestId;
  config.logMetadata = { requestId, started: performance.now(), method: config.method?.toUpperCase(), path: new URL(config.url, config.baseURL).pathname };
  log('api.request.start', { requestId, method: config.logMetadata.method, path: config.logMetadata.path });
  return config;
});
api.interceptors.response.use(response => {
  const meta = response.config.logMetadata;
  log('api.request.complete', { requestId: response.headers['x-request-id'] || meta?.requestId, method: meta?.method, path: meta?.path, status: response.status, durationMs: Math.round(performance.now() - (meta?.started || 0)) });
  return response;
}, error => {
  const meta = error.config?.logMetadata;
  log(error.code === 'ERR_CANCELED' ? 'api.request.cancelled' : 'api.request.failed', { requestId: error.response?.headers?.['x-request-id'] || meta?.requestId, method: meta?.method, path: meta?.path, status: error.response?.status || 'network-error', reason: error.code === 'ERR_CANCELED' ? 'Superseded request' : errorMessage(error), durationMs: Math.round(performance.now() - (meta?.started || 0)) }, error.code === 'ERR_CANCELED' ? 'info' : 'error');
  return Promise.reject(error);
});
export const errorMessage = error => error.response?.data?.message || error.response?.data?.errors?.[0]?.msg || 'Cannot reach the server. Please retry.';
export default api;
