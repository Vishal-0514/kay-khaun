import { create } from 'zustand';
import { api } from '../lib/api';
import { useCookStore } from './useCookStore';
import { useLocationStore } from './useLocationStore';

const where = () => useLocationStore.getState().forApi();

// Where they are, looked up first if no screen has asked yet (Chat opened
// straight from a link or reminder). Gives up after a few seconds.
async function located() {
  const loc = useLocationStore.getState();
  if (loc.status === 'idle') await Promise.race([loc.locate(), new Promise((r) => setTimeout(r, 4000))]);
  return where();
}

// The current chat with Chatora plus the last set of picks, which the
// Results and Dish screens read. Recipes go to the cook store.
export const useChatStore = create((set, get) => ({
  conversation: null, // { id, title, slip, messages[] }
  picks: [],
  picksSource: null, // { kind: 'chat' | 'mood' | 'pick', label }
  outings: [], // Go Out: places to go, from the last chat that asked
  sending: false,

  async send(text) {
    const { conversation } = get();
    const optimistic = { id: `local-${Date.now()}`, role: 'user', text, pending: true };
    set((s) => ({
      sending: true,
      conversation: s.conversation
        ? { ...s.conversation, messages: [...s.conversation.messages, optimistic] }
        : { id: null, title: 'New chat', slip: null, messages: [optimistic] },
    }));
    try {
      const { data } = await api.post('/chat/messages', { conversationId: conversation?.id ?? undefined, text, location: await located() });
      set({
        conversation: data.conversation,
        ...(data.picks.length ? { picks: data.picks, picksSource: { kind: 'chat', label: data.conversation.slip?.craving } } : null),
      });
      if (data.recipes?.length) useCookStore.getState().setFromChat(data);
      if (data.outings?.length) set({ outings: data.outings });
      return data;
    } catch (err) {
      // Put the chat back as it was so the user can retry.
      set({ conversation });
      throw err;
    } finally {
      set({ sending: false });
    }
  },

  // Snap My Mood: a photo of where they are → a new chat with dishes and places.
  // Returns { unusable, message } when the photo isn't of a place.
  // Snap Your Order: a photo of where they are → { summary, dishes } (half veg, half non-veg).
  async snapOrder(shot) {
    const { data } = await api.post('/mood/order', { image: shot.base64, mediaType: shot.mediaType });
    return data;
  },

  // Restaurants near you for one dish (from Snap Your Order).
  async dishPicks(name, diet) {
    const { data } = await api.post('/chat/quick-picks', { dishName: name, diet: diet ?? 'any', location: await located() });
    set({ picks: data.picks, picksSource: { kind: 'occasion', label: name } });
    return data.picks;
  },

  async snapMood(shot, note) {
    const { data } = await api.post('/mood/snap', { image: shot.base64, mediaType: shot.mediaType, ...(note ? { note } : {}), location: await located() });
    if (data.unusable) return data;
    set({
      conversation: data.conversation,
      picks: data.picks,
      picksSource: { kind: 'chat', label: data.scene?.summary },
      outings: data.outings,
    });
    return data;
  },

  async open(id) {
    const { data } = await api.get(`/chat/${id}`, { params: where() });
    set({ conversation: data.conversation, picks: data.picks, picksSource: { kind: 'chat', label: data.conversation.slip?.craving }, ...(data.outings?.length ? { outings: data.outings } : null) });
    if (data.recipes?.length) useCookStore.getState().setFromChat(data);
  },

  async quickPicks(mood) {
    const { data } = await api.post('/chat/quick-picks', { ...(mood ? { mood } : {}), location: where() });
    set({ picks: data.picks, picksSource: { kind: mood ? 'mood' : 'pick', label: mood ?? null } });
    return data.picks;
  },

  // The festival / season special on Home.
  // With a dish: restaurants near you that serve it ("Sabudana khichdi near you").
  async occasionPicks(occasion, dish) {
    const { data } = await api.post('/chat/quick-picks', { occasion: occasion.id, dish: dish?.id, location: where() });
    set({ picks: data.picks, picksSource: { kind: 'occasion', label: dish?.name ?? occasion.title } });
    return data.picks;
  },

  // Order for a Group: places for everyone ({ people, veg, budgetPerHead, kind, cuisine }).
  async groupPicks(group) {
    const { data } = await api.post('/chat/group-picks', { ...group, location: where() });
    set({ picks: data.picks, picksSource: { kind: 'group', label: 'group', group: data.group } });
    return data.picks;
  },

  // Recent chats: newest first, 20 at a time.
  recent: [],
  recentMore: false,

  async loadRecent() {
    const { data } = await api.get('/chat');
    set({ recent: data.conversations, recentMore: data.more });
  },

  async loadMoreRecent() {
    const last = get().recent.at(-1);
    if (!last) return;
    const { data } = await api.get('/chat', { params: { before: last.updatedAt } });
    set((s) => ({ recent: [...s.recent, ...data.conversations], recentMore: data.more }));
  },

  async removeChat(id) {
    await api.delete(`/chat/${id}`);
    set((s) => ({ recent: s.recent.filter((c) => c.id !== id), ...(s.conversation?.id === id ? { conversation: null } : null) }));
  },

  async clearChats() {
    await api.delete('/chat');
    set({ recent: [], recentMore: false, conversation: null });
  },

  newChat: () => set({ conversation: null }),
  clear: () => set({ conversation: null, picks: [], picksSource: null, outings: [], recent: [], recentMore: false }),
}));
