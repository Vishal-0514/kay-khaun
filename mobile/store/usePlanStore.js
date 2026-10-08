import { create } from 'zustand';
import { api } from '../lib/api';
import { useLocationStore } from './useLocationStore';
import { toItem, useMeStore } from './useMeStore';

export const MEAL_KEYS = ['breakfast', 'lunch', 'snack', 'dinner'];
export const MEAL_INFO = {
  breakfast: { label: 'Breakfast', time: '8 – 10 am' },
  lunch: { label: 'Lunch', time: '1 – 2 pm' },
  snack: { label: 'Evening snack', time: '5 – 6 pm' },
  dinner: { label: 'Dinner', time: '8 – 9 pm' },
};

const NOTE_DELAY_MS = 900;
let noteTimer = null;
let noteRequest = 0;

// The day plan: one pick per meal plus a few swaps each.
//   choice: which option is showing per meal (0 = the planned pick)
//   cook:   meals they'll cook at home instead (the pick's home recipe)
//   note:   Chatora's line about what's showing; noteStale while it's being redone
export const usePlanStore = create((set, get) => ({
  plan: null,
  choice: {},
  cook: {},
  note: null,
  noteStale: false,
  loading: false,
  savedAt: null, // set when this exact day is saved to History
  settings: { budget: null, mood: 'balanced', meals: MEAL_KEYS, people: 1, veg: false },

  async make(changes = {}) {
    const settings = { ...get().settings, ...changes };
    set({ settings, loading: true });
    try {
      const { data } = await api.post('/plan', {
        ...(settings.budget ? { budget: settings.budget } : {}),
        mood: settings.mood,
        meals: settings.meals,
        people: settings.people,
        veg: settings.veg,
        location: useLocationStore.getState().forApi(),
      });
      clearTimeout(noteTimer);
      // Remember the budget the server chose from the taste profile.
      set({ plan: data.plan, choice: {}, cook: {}, note: data.plan.note, noteStale: false, savedAt: null, settings: { ...settings, budget: data.plan.budget } });
      return data.plan;
    } finally {
      set({ loading: false });
    }
  },

  swap(meal) {
    const m = get().plan?.meals.find((x) => x.meal === meal);
    if (!m) return;
    const count = 1 + m.options.length;
    set((s) => ({ choice: { ...s.choice, [meal]: ((s.choice[meal] ?? 0) + 1) % count }, savedAt: null }));
    get().refreshNote();
  },

  toggleCook(meal) {
    set((s) => ({ cook: { ...s.cook, [meal]: !s.cook[meal] }, savedAt: null }));
    get().refreshNote();
  },

  // Chatora re-describes the day once they stop changing things.
  refreshNote() {
    set({ noteStale: true });
    clearTimeout(noteTimer);
    noteTimer = setTimeout(async () => {
      const { plan, choice, cook } = get();
      if (!plan) return;
      const id = ++noteRequest;
      try {
        const { data } = await api.post('/plan/note', {
          budget: plan.budget,
          people: plan.people ?? 1,
          moodLabel: plan.moodLabel,
          meals: plan.meals.map((m) => {
            const pick = shownPick(m, choice);
            if (cook[m.meal] && pick.home) return { label: m.label, cook: true, name: pick.home.name };
            return { label: m.label, cook: false, name: pick.name, restaurant: pick.restaurant, price: pick.price ?? null, priceLabel: pick.priceLabel ?? null, cuisine: pick.cuisine ?? null };
          }),
        });
        if (id === noteRequest) set({ note: data.note, noteStale: false });
      } catch {
        if (id === noteRequest) set({ noteStale: false });
      }
    }, NOTE_DELAY_MS);
  },

  // "Save this day" → History, with each meal's swaps so it reopens fully.
  async saveDay() {
    const { plan, choice, cook } = get();
    const ref = (h) => (h ? { id: h.id, name: h.name, time: h.time, level: h.level } : null);
    const meals = plan.meals.map((m) => {
      const pick = shownPick(m, choice);
      const cooking = Boolean(cook[m.meal] && pick.home);
      const others = [m.pick, ...m.options].filter((o) => o.id !== pick.id).slice(0, 3);
      return {
        meal: m.meal,
        label: m.label,
        cook: cooking,
        item: toItem(pick),
        recipe: cooking ? ref(pick.home) : null,
        home: ref(pick.home),
        options: others.map((o) => ({ item: toItem(o), home: ref(o.home) })),
      };
    });
    const entry = await useMeStore.getState().savePlan({ budget: plan.budget, total: dayTotal(plan, choice, cook), moodLabel: plan.moodLabel, meals });
    set({ savedAt: entry.at });
    return entry;
  },

  // Reopen a day saved in History, exactly as it was.
  openSaved(entry) {
    clearTimeout(noteTimer);
    const p = entry.plan;
    const meals = p.meals.map((m) => ({
      meal: m.meal,
      label: m.label,
      time: MEAL_INFO[m.meal]?.time ?? '',
      pick: { ...m.item, home: m.home ?? m.recipe ?? null },
      options: (m.options ?? []).map((o) => ({ ...o.item, home: o.home ?? null })),
    }));
    set({
      plan: { budget: p.budget, moodLabel: p.moodLabel, mood: null, meals, spent: p.total, overBudget: false },
      choice: {},
      cook: Object.fromEntries(p.meals.map((m) => [m.meal, m.cook])),
      note: `Your saved day from ${new Date(entry.at).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}. Tap a meal to order it again, or change anything above for a fresh plan.`,
      noteStale: false,
      savedAt: entry.at,
      settings: { ...get().settings, budget: p.budget, meals: p.meals.map((m) => m.meal) },
    });
  },

  clear: () => {
    clearTimeout(noteTimer);
    set({ plan: null, choice: {}, cook: {}, note: null, noteStale: false, savedAt: null, settings: { budget: null, mood: 'balanced', meals: MEAL_KEYS, people: 1, veg: false } });
  },
}));

// What's showing for a meal right now.
export const shownPick = (m, choice) => [m.pick, ...m.options][choice[m.meal] ?? 0];

// Sum of what's showing (cooked meals are ₹0), or null for real places (no dish prices).
export function dayTotal(plan, choice, cook = {}) {
  if (!plan?.meals.length) return null;
  let total = 0;
  for (const m of plan.meals) {
    const p = shownPick(m, choice);
    if (cook[m.meal] && p.home) continue;
    if (p.price == null) return null;
    total += p.price;
  }
  return total;
}

// Every dish in the plan, so the Dish screen can open any of them.
export const planDish = (plan, id) => plan?.meals.flatMap((m) => [m.pick, ...m.options]).find((p) => p.id === id) ?? null;
