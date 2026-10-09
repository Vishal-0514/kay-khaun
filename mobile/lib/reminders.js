import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { t } from './i18n';

// Opt-in meal reminders: daily notifications scheduled on the phone itself,
// so nothing is sent to our server. Settings stay on this device.

function loadNotifications() {
  if (Platform.OS === 'web') return null;
  try {
    return require('expo-notifications');
  } catch {
    return null;
  }
}
const N = loadNotifications();
export const remindersSupported = Boolean(N);

const KEY = 'kk-reminders';
const CHANNEL = 'meal-reminders';
const ID = (meal) => `kk-meal-${meal}`;

export const REMINDER_MEALS = [
  { meal: 'breakfast', label: 'Breakfast', times: ['07:30', '08:30', '09:30'], fallback: '08:30', route: '/home' },
  { meal: 'lunch', label: 'Lunch', times: ['12:30', '13:00', '13:30', '14:00'], fallback: '13:00', route: '/home' },
  { meal: 'snack', label: 'Evening snack', times: ['16:30', '17:30', '18:30'], fallback: '17:30', route: '/home' },
  { meal: 'dinner', label: 'Dinner', times: ['19:30', '20:00', '20:30', '21:00'], fallback: '20:00', route: '/home' },
];

const MESSAGES = {
  breakfast: { title: 'Good morning! Kya khaun?', body: "Chatora has breakfast ideas ready — poha, dosa or something new?" },
  lunch: { title: 'Lunch time 🍛', body: 'Tell Chatora your mood and budget, and get your pick in seconds.' },
  snack: { title: 'Chai-time craving?', body: 'Something chatpata for the evening? Chatora has picks near you.' },
  dinner: { title: 'Dinner plans?', body: "Can't decide what to eat tonight? Ask Chatora." },
};

export const defaultReminders = () => Object.fromEntries(REMINDER_MEALS.map((r) => [r.meal, { on: false, time: r.fallback }]));

export const timeLabel = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};

export async function readReminders() {
  try {
    const raw = Platform.OS === 'web' ? window.localStorage.getItem(KEY) : await SecureStore.getItemAsync(KEY);
    return { ...defaultReminders(), ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    return defaultReminders();
  }
}

async function writeReminders(settings) {
  const raw = JSON.stringify(settings);
  if (Platform.OS === 'web') window.localStorage.setItem(KEY, raw);
  else await SecureStore.setItemAsync(KEY, raw);
}

// Asks once; returns true when notifications are allowed.
export async function allowNotifications() {
  if (!N) return false;
  const current = await N.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const asked = await N.requestPermissionsAsync();
  return asked.granted;
}

// Saves the settings and replaces our scheduled reminders with them.
export async function applyReminders(settings) {
  await writeReminders(settings);
  if (!N) return;
  if (Platform.OS === 'android') {
    await N.setNotificationChannelAsync(CHANNEL, { name: t('Meal reminders'), importance: N.AndroidImportance.DEFAULT });
  }
  for (const { meal, route } of REMINDER_MEALS) {
    await N.cancelScheduledNotificationAsync(ID(meal)).catch(() => {});
    const s = settings[meal];
    if (!s?.on) continue;
    const [hour, minute] = s.time.split(':').map(Number);
    await N.scheduleNotificationAsync({
      identifier: ID(meal),
      content: { title: t(MESSAGES[meal].title), body: t(MESSAGES[meal].body), data: { url: route } },
      trigger: { type: N.SchedulableTriggerInputTypes.DAILY, hour, minute, channelId: CHANNEL },
    });
  }
}

// App start: show reminders while the app is open, and open the right screen when one is tapped.
export function listenForReminders(onOpen) {
  if (!N) return () => {};
  N.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  const sub = N.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string') onOpen(url);
  });
  return () => sub.remove();
}
