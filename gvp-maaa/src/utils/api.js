import axios from 'axios';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_BACKEND_URL;
const rawBaseUrl = configuredBaseUrl || 'http://localhost:8000';
const baseURL = rawBaseUrl ? (rawBaseUrl.endsWith('/') ? rawBaseUrl.slice(0, -1) : rawBaseUrl) : '';

const api = axios.create({
  baseURL,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('access_token');
      window.dispatchEvent(new CustomEvent('placement-auth-error', { detail: 'Session expired. Please login again.' }));
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
export const getToken = () => localStorage.getItem('access_token');
