import { create } from 'zustand';
import { api } from '../lib/api';

// Snap Your Food, Get Your Song: the last songs Chatora picked, and the request
// behind them so "Try other songs" can ask again.
//   request: { image?, mediaType?, dish?: { name, cuisine }, language, note? }
export const SONG_LANGUAGES = [
  { id: 'hindi', label: 'हिंदी' },
  { id: 'english', label: 'English' },
  { id: 'both', label: 'Both' },
];

export const useSongStore = create((set, get) => ({
  moment: null,
  songs: [],
  language: 'both',
  request: null,

  // Returns { unusable, message } when there's no food in the photo.
  async find(request) {
    const { data } = await api.post('/songs', request);
    if (data.unusable) return data;
    set({ moment: data.moment, songs: data.songs, language: data.language, request });
    return data;
  },

  async again(language = get().language) {
    const request = get().request;
    if (!request) return null;
    return get().find({ ...request, language });
  },
}));
