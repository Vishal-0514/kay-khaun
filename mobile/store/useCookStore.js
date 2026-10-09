import { create } from 'zustand';
import { api } from '../lib/api';

// "Cook at home": what's in the user's kitchen, the recipes that fit it, and
// the recipe they're looking at or cooking.
export const useCookStore = create((set, get) => ({
  catalogue: [], // [{ id, label, aliases, common }]
  scanAvailable: false,
  kitchen: [], // [{ id, label, known, sure }] — sure:false items wait for the user to confirm
  recipes: [],
  source: null, // 'kitchen' | 'chat'
  current: null, // full recipe for the recipe / cook screens

  // Fetched each time: whether scan is on can change (Profile → Use AI).
  async loadCatalogue() {
    const { data } = await api.get('/cook/ingredients');
    set({ catalogue: data.ingredients, scanAvailable: data.scanAvailable });
  },

  // Typed name -> nice label when we know it ("aloo" -> "Potato").
  add(name) {
    const text = name.trim();
    if (!text) return;
    const lower = text.toLowerCase();
    const known = get().catalogue.find((c) => c.label.toLowerCase() === lower || c.aliases.includes(lower) || c.id === lower);
    const item = known ? { id: known.id, label: known.label, known: true, sure: true } : { id: `x-${lower.replace(/\s+/g, '-')}`, label: text, known: false, sure: true };
    set((s) => ({ kitchen: s.kitchen.some((k) => k.id === item.id) ? s.kitchen.map((k) => (k.id === item.id ? { ...k, sure: true } : k)) : [...s.kitchen, item] }));
  },
  remove: (id) => set((s) => ({ kitchen: s.kitchen.filter((k) => k.id !== id) })),
  confirm: (id) => set((s) => ({ kitchen: s.kitchen.map((k) => (k.id === id ? { ...k, sure: true } : k)) })),

  // Photo -> ingredients added to the list (unsure ones marked with "?").
  async scan({ base64, mediaType }) {
    const { data } = await api.post('/cook/scan', { image: base64, mediaType }, { timeout: 60000 });
    set((s) => {
      const have = new Set(s.kitchen.map((k) => k.id));
      return { kitchen: [...s.kitchen, ...data.items.filter((i) => !have.has(i.id))] };
    });
    return data;
  },

  confirmedNames: () => get().kitchen.filter((k) => k.sure !== false).map((k) => k.label),

  async findRecipes() {
    const { data } = await api.post('/cook/recipes', { ingredients: get().confirmedNames() });
    set({ recipes: data.recipes, source: 'kitchen', kitchen: [...data.kitchen.map((k) => ({ ...k, sure: true })), ...get().kitchen.filter((k) => k.sure === false)] });
    return data.recipes;
  },

  // The chat found recipes: keep its kitchen and results.
  setFromChat({ kitchen, recipes }) {
    set({ kitchen: kitchen.map((k) => ({ ...k, sure: true })), recipes, source: 'chat' });
  },

  async openRecipe(id) {
    const have = get()
      .kitchen.filter((k) => k.sure !== false)
      .map((k) => k.id)
      .join(',');
    const { data } = await api.get(`/cook/recipes/${encodeURIComponent(id)}`, { params: { have } });
    set({ current: data.recipe });
    return data.recipe;
  },
}));
