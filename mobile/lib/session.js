import { api, refreshSession } from './api';
import { readSession } from './tokenStorage';
import { useAuthStore } from '../store/useAuthStore';
import { useChatStore } from '../store/useChatStore';
import { useMeStore } from '../store/useMeStore';
import { usePlanStore } from '../store/usePlanStore';
import { endFirebaseSession } from './firebase';
import { signOutOfGoogle } from './googleSignIn';
import { useWake, wakeServer, warmUp } from './wake';

// On launch: load the saved tokens and fetch the profile. An expired access
// token is refreshed by the API client; if that fails too, the user starts signed out.
export async function restoreSession() {
  const saved = await readSession();
  const auth = useAuthStore.getState();
  useWake.setState({ offline: false });
  try {
    if (!saved?.refreshToken) {
      // Signed out: quietly start waking the server, so signing in is quick.
      warmUp();
      return;
    }
    // Make sure the server is awake first (shows "Waking up Chatora…" if not).
    if ((await wakeServer()) === 'offline') {
      useWake.setState({ offline: true });
      return;
    }
    auth.setSession(saved);
    if (!saved.accessToken) await refreshSession();
    const { data } = await api.get('/profile');
    auth.setUser(data.user);
  } catch (err) {
    // Rejected: sign out. Unreachable: keep the session and offer Try again.
    if (err.response) auth.clear();
    else useWake.setState({ offline: true });
  } finally {
    auth.setReady();
  }
}

export async function signOut() {
  const { refreshToken, clear } = useAuthStore.getState();
  clear();
  useChatStore.getState().clear();
  useMeStore.getState().clear();
  usePlanStore.getState().clear();
  if (refreshToken) api.post('/auth/logout', { refreshToken }).catch(() => {});
  // So the next Google sign-in shows the account picker again.
  endFirebaseSession();
  signOutOfGoogle();
}

// Where a signed-in user belongs: first-timers finish "Your taste" first.
export function homeRouteFor(user) {
  return user?.onboarded ? '/home' : '/taste';
}
