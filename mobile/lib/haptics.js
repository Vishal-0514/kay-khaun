import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

// A small tap felt in the hand when something important happens. Phones only,
// and never allowed to break the action it accompanies.
const run = (fn) => {
  if (Platform.OS === 'web') return;
  fn().catch(() => {});
};

// Light tick: toggles, choices, removing a row.
export const tap = () => run(() => Haptics.selectionAsync());
// Firmer tap: sending a message, starting to listen, swapping a meal.
export const press = () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
// Done: saved, plan ready.
export const success = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
// Didn't work.
export const failure = () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
