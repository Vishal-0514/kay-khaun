import axios from 'axios';
import { useAuthStore } from '../store/useAuthStore';
import { t, currentLang } from './i18n';
import { serverAway, wakeServer } from './wake';

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100/api';

// Without a timeout, an unreachable server leaves screens spinning forever.
export const api = axios.create({ baseURL, timeout: 15000 });

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // The server writes reasons, notes and meal names in this language.
  config.headers['Accept-Language'] = currentLang();
  return config;
});

// Access tokens last 15 minutes. When one expires, swap the refresh token for a
// new pair once (shared by every request that failed at the same time) and retry.
let refreshing = null;

export function refreshSession() {
  const { refreshToken } = useAuthStore.getState();
  if (!refreshToken) return Promise.reject(new Error('No session'));
  refreshing ??= axios
    .post(`${baseURL}/auth/refresh`, { refreshToken }, { timeout: 15000 })
    .then(({ data }) => {
      useAuthStore.getState().setSession(data);
      return data.accessToken;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    // The server was asleep: wait for it to wake (showing "Waking up Chatora…"), then try once more.
    if (original && serverAway(error) && !original._woken) {
      original._woken = true;
      if ((await wakeServer()) === 'woke') return api(original);
      return Promise.reject(error);
    }
    if (error.response?.data?.code === 'TOKEN_EXPIRED' && !original._retried) {
      original._retried = true;
      try {
        const token = await refreshSession();
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        useAuthStore.getState().clear();
      }
    } else if (error.response?.status === 401 && useAuthStore.getState().accessToken) {
      useAuthStore.getState().clear();
    }
    return Promise.reject(error);
  }
);

// The server's own message when it sent one, otherwise a plain explanation.
export function errorMessage(error) {
  if (error.response?.data?.error) return t(error.response.data.error);
  // No answer, or the tunnel/proxy answered because the server is down.
  if (error.code === 'ECONNABORTED' || !error.response || [502, 503, 504].includes(error.response.status)) return t("Can't reach Kya Khaun right now. Check your internet and try again.");
  return t('Something went wrong. Please try again.');
}
