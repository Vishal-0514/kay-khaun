import { create } from 'zustand';
import { api } from '../lib/api';
import { useLocationStore } from './useLocationStore';

export const MEAL_KEYS = ['breakfast', 'lunch', 'snack', 'dinner'];

// The day plan: one pick per meal plus a few swaps each. `choice` remembers
// which option is showing for each meal (0 = the planned pick).
export const usePlanStore = create((set, get) => ({
  plan: null,
  choice: {},
  loading: false,
  settings: { budget: null, mood: 'balanced', meals: MEAL_KEYS },

  async make(changes = {}) {
    const settings = { ...get().settings, ...changes };
    set({ settings, loading: true });
    try {
      const { data } = await api.post('/plan', {
        ...(settings.budget ? { budget: settings.budget } : {}),
        mood: settings.mood,
        meals: settings.meals,
        location: useLocationStore.getState().forApi(),
      });
      // Remember the budget the server chose from the taste profile.
      set({ plan: data.plan, choice: {}, settings: { ...settings, budget: data.plan.budget } });
      return data.plan;
    } finally {
      set({ loading: false });
    }
  },

  swap(meal) {
    const m = get().plan?.meals.find((x) => x.meal === meal);
    if (!m) return;
    const count = 1 + m.options.length;
    set((s) => ({ choice: { ...s.choice, [meal]: ((s.choice[meal] ?? 0) + 1) % count } }));
  },
}));

// What's showing for a meal right now.
export const shownPick = (m, choice) => [m.pick, ...m.options][choice[m.meal] ?? 0];

// Sum of what's showing, or null for real places (no dish prices).
export function dayTotal(plan, choice) {
  if (!plan?.meals.length) return null;
  const picks = plan.meals.map((m) => shownPick(m, choice));
  if (picks.some((p) => p.price == null)) return null;
  return picks.reduce((s, p) => s + p.price, 0);
}

// Every dish in the plan, so the Dish screen can open any of them.
export const planDish = (plan, id) => plan?.meals.flatMap((m) => [m.pick, ...m.options]).find((p) => p.id === id) ?? null;
