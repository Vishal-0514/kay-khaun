import { create } from 'zustand';
import { api } from '../lib/api';
import { useCookStore } from './useCookStore';
import { useLocationStore } from './useLocationStore';

const where = () => useLocationStore.getState().forApi();

// The current chat with Chatora plus the last set of picks, which the
// Results and Dish screens read. Recipes go to the cook store.
export const useChatStore = create((set, get) => ({
  conversation: null, // { id, title, slip, messages[] }
  picks: [],
  picksSource: null, // { kind: 'chat' | 'mood' | 'pick', label }
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
      const { data } = await api.post('/chat/messages', { conversationId: conversation?.id ?? undefined, text, location: where() });
      set({
        conversation: data.conversation,
        ...(data.picks.length ? { picks: data.picks, picksSource: { kind: 'chat', label: data.conversation.slip?.craving } } : null),
      });
      if (data.recipes?.length) useCookStore.getState().setFromChat(data);
      return data;
    } catch (err) {
      // Put the chat back as it was so the user can retry.
      set({ conversation });
      throw err;
    } finally {
      set({ sending: false });
    }
  },

  async open(id) {
    const { data } = await api.get(`/chat/${id}`, { params: where() });
    set({ conversation: data.conversation, picks: data.picks, picksSource: { kind: 'chat', label: data.conversation.slip?.craving } });
    if (data.recipes?.length) useCookStore.getState().setFromChat(data);
  },

  async quickPicks(mood) {
    const { data } = await api.post('/chat/quick-picks', { ...(mood ? { mood } : {}), location: where() });
    set({ picks: data.picks, picksSource: { kind: mood ? 'mood' : 'pick', label: mood ?? null } });
    return data.picks;
  },

  // The festival / season special on Home.
  async occasionPicks(occasion) {
    const { data } = await api.post('/chat/quick-picks', { occasion: occasion.id, location: where() });
    set({ picks: data.picks, picksSource: { kind: 'occasion', label: occasion.title } });
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
  clear: () => set({ conversation: null, picks: [], picksSource: null, recent: [], recentMore: false }),
}));
