import axios from 'axios';

const apiBase = import.meta.env.VITE_API_URL || '';

const client = axios.create({
  baseURL: `${apiBase}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Helper to check if a JWT is expired
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    if (payload.exp) {
      // Add a 10-second buffer for clock skew
      return payload.exp < Math.floor(Date.now() / 1000) - 10;
    }
  } catch (e) {
    return true;
  }
  return false;
};

// Automatically acquire token if not present or expired
export const ensureAuthToken = async () => {
  let token = localStorage.getItem('astra_token');
  if (token && !isTokenExpired(token)) return token;

  try {
    const res = await axios.post(`${apiBase}/api/v1/auth/token`, {
      username: 'operator@astra.demo',
      password: 'AstraOps2024!',
    });
    token = res.data.access_token;
    localStorage.setItem('astra_token', token);
    localStorage.setItem('astra_role', res.data.role);
    return token;
  } catch (err) {
    console.error('Auto-login failed:', err);
    return null;
  }
};

client.interceptors.request.use(async (config) => {
  const token = await ensureAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 Unauthorized errors by flushing the token and retrying once
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response && error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      localStorage.removeItem('astra_token');
      const newToken = await ensureAuthToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        // Update authorization header on the original request and retry
        return client(originalRequest);
      }
    }
    return Promise.reject(error);
  }
);

export default client;

