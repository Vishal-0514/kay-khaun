import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { t } from '../lib/i18n';
import { colors, radius, shadow, space } from '../lib/theme';

// Grey shapes where content is about to appear, breathing softly, so a screen
// keeps its layout while it loads instead of showing a lone spinner.

function useBreath() {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
  }, [v]);
  return useAnimatedStyle(() => ({ opacity: 0.55 + v.value * 0.45 }));
}

export function Bone({ width = '100%', height = 14, round = 7, style }) {
  return <View style={[{ width, height, borderRadius: round, backgroundColor: colors.soft }, style]} />;
}

// The shape of a pick or list card: a round badge and two lines of text.
export function SkeletonCard({ ring = 48, style }) {
  const breath = useBreath();
  return (
    <Animated.View style={[styles.card, breath, style]} aria-hidden>
      <Bone width={ring} height={ring} round={ring / 2} />
      <View style={{ flex: 1, gap: space.sm }}>
        <Bone width="70%" height={16} />
        <Bone width="45%" height={12} />
        <Bone width="55%" height={12} />
      </View>
    </Animated.View>
  );
}

export function SkeletonList({ count = 4, style }) {
  return (
    <View style={[styles.list, style]} role="progressbar" aria-label={t('Loading')} aria-busy>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.base, gap: space.md },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, minHeight: 88, ...shadow.card },
});
