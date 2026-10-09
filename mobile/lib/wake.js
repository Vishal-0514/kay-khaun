import axios from 'axios';
import { create } from 'zustand';

// The server sleeps when nobody has used it for a while and takes up to a
// minute to wake. Instead of failing, the app waits for it: after a moment it
// shows "Waking up Chatora…" (components/WakingUp.js), then carries on.

const baseURL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4100/api';
const SHOW_AFTER_MS = 1500; // a quick answer never flashes the screen
const GIVE_UP_MS = 75000;

// offline: the app couldn't reach the server on launch (shows Try again).
export const useWake = create(() => ({ waking: false, slow: false, offline: false }));

const pause = (ms) => new Promise((r) => setTimeout(r, ms));

async function healthy() {
  try {
    const { data } = await axios.get(`${baseURL}/health`, { timeout: 8000 });
    return data?.db === 'connected';
  } catch {
    return false;
  }
}

let waiting = null;

// 'up': it was already awake (so a failure had another cause);
// 'woke': it was asleep and answers now; 'offline': it never answered.
// Every caller shares the same wait.
export function wakeServer() {
  waiting ??= (async () => {
    const show = setTimeout(() => useWake.setState({ waking: true }), SHOW_AFTER_MS);
    const slow = setTimeout(() => useWake.setState({ slow: true }), 30000);
    const start = Date.now();
    try {
      // A slow first answer means it was only just starting up.
      if (await healthy()) return Date.now() - start < 3000 ? 'up' : 'woke';
      while (Date.now() - start < GIVE_UP_MS) {
        await pause(1500);
        if (await healthy()) return 'woke';
      }
      return 'offline';
    } finally {
      clearTimeout(show);
      clearTimeout(slow);
      useWake.setState({ waking: false, slow: false });
      waiting = null;
    }
  })();
  return waiting;
}

// Start the server waking without showing anything (nobody is waiting on it yet).
export function warmUp() {
  axios.get(`${baseURL}/health`, { timeout: 60000 }).catch(() => {});
}

// Did this request fail because the server wasn't there (asleep or starting)?
export const serverAway = (error) => error.code === 'ECONNABORTED' || !error.response || [502, 503, 504].includes(error.response.status);
