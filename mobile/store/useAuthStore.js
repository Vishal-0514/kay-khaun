import { create } from 'zustand';
import { saveSession, clearSession } from '../lib/tokenStorage';

export const useAuthStore = create((set, get) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  // false until the saved session (if any) has been checked on launch
  ready: false,

  setSession: ({ accessToken, refreshToken, user }) => {
    saveSession({ accessToken, refreshToken });
    set({ accessToken, refreshToken, user: user ?? get().user });
  },
  setUser: (user) => set({ user }),
  setReady: () => set({ ready: true }),
  clear: () => {
    clearSession();
    set({ accessToken: null, refreshToken: null, user: null });
  },
}));
