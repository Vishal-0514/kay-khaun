import { create } from 'zustand';
import { api } from '../lib/api';

// The user's own food data: ♡ saved dishes, history (what they opened in
// Zomato / Swiggy, saved day plans) and what taste learning picked up.

const FIELDS = ['id', 'source', 'name', 'restaurant', 'area', 'cuisine', 'diet', 'price', 'eta', 'rating', 'ratingCount', 'spice', 'spiceLabel', 'distanceKm', 'priceLabel', 'ideas', 'links'];

// The parts of a pick worth keeping (the server checks them again).
export function toItem(pick) {
  const item = {};
  for (const k of FIELDS) if (pick[k] != null) item[k] = pick[k];
  if (item.links) item.links = Object.fromEntries(Object.entries(item.links).filter(([, v]) => v));
  return item;
}

export const useMeStore = create((set, get) => ({
  saved: [], // newest first
  history: [],
  historyMore: false,
  historyLoaded: false,
  learned: null, // { enabled, cuisines: [{ name, strength }], signals, notForMe }

  isSaved: (id) => get().saved.some((s) => s.id === id),

  async loadSaved() {
    const { data } = await api.get('/me/saved');
    set({ saved: data.items });
  },

  // ♡ on / off, shown straight away and undone if the server says no.
  async toggleSave(pick) {
    const was = get().isSaved(pick.id);
    const item = toItem(pick);
    set((s) => ({ saved: was ? s.saved.filter((x) => x.id !== pick.id) : [{ ...item, savedAt: new Date().toISOString() }, ...s.saved] }));
    try {
      if (was) await api.delete(`/me/saved/${encodeURIComponent(pick.id)}`);
      else await api.put('/me/saved', { item });
      return !was;
    } catch (err) {
      set((s) => ({ saved: was ? [{ ...item, savedAt: new Date().toISOString() }, ...s.saved] : s.saved.filter((x) => x.id !== pick.id) }));
      throw err;
    }
  },

  // opened / ordered / not_for_me. Never blocks the screen; learning is a bonus.
  track(kind, pick, app) {
    const item = toItem(pick);
    api
      .post('/me/activity', { kind, item, ...(app ? { app } : {}) })
      .then(({ data }) => {
        if (data.recorded && kind === 'ordered') {
          const entry = { id: `local-${Date.now()}`, kind, at: new Date().toISOString(), item, app };
          set((s) => ({ history: [entry, ...s.history] }));
        }
      })
      .catch(() => {});
  },

  async notForMe(pick) {
    set((s) => ({ saved: s.saved.filter((x) => x.id !== pick.id) }));
    await api.post('/me/activity', { kind: 'not_for_me', item: toItem(pick) });
  },

  async loadHistory({ more = false } = {}) {
    const last = get().history.at(-1);
    const params = more && last ? { before: last.at } : {};
    const { data } = await api.get('/me/history', { params });
    set((s) => ({ history: more ? [...s.history, ...data.entries] : data.entries, historyMore: data.more, historyLoaded: true }));
  },

  async savePlan(plan) {
    const { data } = await api.post('/me/history/plan', plan);
    set((s) => ({ history: [data.entry, ...s.history] }));
    return data.entry;
  },

  async removeHistory(id) {
    const before = get().history;
    set({ history: before.filter((e) => e.id !== id) });
    try {
      if (!String(id).startsWith('local-')) await api.delete(`/me/history/${id}`);
    } catch (err) {
      set({ history: before });
      throw err;
    }
  },

  async clearHistory() {
    await api.delete('/me/history');
    set({ history: [], historyMore: false });
  },

  async loadLearned() {
    const { data } = await api.get('/me/learned');
    set({ learned: data.learned });
  },

  async clearLearned() {
    const { data } = await api.delete('/me/learned');
    // Orders are part of what was learned, so they leave History too.
    set((s) => ({ learned: data.learned, history: s.history.filter((e) => e.kind !== 'ordered') }));
  },

  clear: () => set({ saved: [], history: [], historyMore: false, historyLoaded: false, learned: null }),
}));

// Last few different dishes they opened in an order app: Home's "Order again".
export function orderAgain(history, limit = 4) {
  const seen = new Set();
  const out = [];
  for (const e of history) {
    if (e.kind !== 'ordered' || !e.item || seen.has(e.item.id)) continue;
    seen.add(e.item.id);
    out.push(e);
    if (out.length === limit) break;
  }
  return out;
}

// Any dish the Dish screen might be asked to open from Saved or History.
export function meDish(state, id) {
  return (
    state.saved.find((s) => s.id === id) ??
    state.history.flatMap((e) => (e.item ? [e.item] : e.plan?.meals.map((m) => m.item) ?? [])).find((x) => x.id === id) ??
    null
  );
}
