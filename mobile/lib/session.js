import { api, refreshSession } from './api';
import { readSession } from './tokenStorage';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';

// On launch: load the saved tokens and fetch the profile. An expired access
// token is refreshed by the API client; if that fails too, the user starts signed out.
export async function restoreSession() {
  const saved = await readSession();
  const auth = useAuthStore.getState();
  try {
    if (!saved?.refreshToken) return;
    auth.setSession(saved);
    if (!saved.accessToken) await refreshSession();
    const { data } = await api.get('/profile');
    auth.setUser(data.user);
  } catch (err) {
    // Offline: keep the saved session so the app can retry later. Rejected: sign out.
    if (err.response) auth.clear();
  } finally {
    auth.setReady();
  }
}

export async function signOut() {
  const { refreshToken, clear } = useAuthStore.getState();
  clear();
  useChatStore.getState().clear();
  if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
}

// Where a signed-in user belongs: first-timers finish "Your taste" first.
export function homeRouteFor(user) {
  return user?.onboarded ? '/home' : '/taste';
}
