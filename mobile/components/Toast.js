import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { create } from 'zustand';
import Icon from './Icon';
import { colors, fonts, radius, shadow, space } from '../lib/theme';

// A quiet confirmation at the bottom ("Saved", "Got it") that fades away on
// its own, so small actions don't need a pop-up.
const useToastStore = create((set) => ({
  toast: null,
  show: (text, icon = 'check') => set({ toast: { text, icon, key: Date.now() } }),
  hide: () => set({ toast: null }),
}));

export const toast = (text, icon) => useToastStore.getState().show(text, icon);

export function ToastHost() {
  const current = useToastStore((s) => s.toast);
  const hide = useToastStore((s) => s.hide);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!current) return undefined;
    const t = setTimeout(hide, 2600);
    return () => clearTimeout(t);
  }, [current, hide]);

  if (!current) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: insets.bottom + 96 }]}>
      <Animated.View key={current.key} entering={FadeInDown.duration(260)} exiting={FadeOut.duration(200)} style={styles.toast} role="status" aria-live="polite">
        <Icon name={current.icon} size={16} color={colors.gold} />
        <Text style={styles.text}>{current.text}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: space.lg },
  toast: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 420, paddingHorizontal: 18, paddingVertical: 12, borderRadius: radius.full, backgroundColor: colors.maroonDeep, ...shadow.lifted },
  text: { fontFamily: fonts.semibold, fontSize: 14, color: colors.cream, flexShrink: 1 },
});
