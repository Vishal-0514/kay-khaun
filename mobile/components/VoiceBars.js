import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

// Five soft bars that rise with your voice and breathe gently while it's quiet
// (the browser doesn't report loudness, so the breathing alone shows it's live).
const SHAPE = [0.55, 0.85, 1, 0.75, 0.5];

function Bar({ i, level, breath, color, height }) {
  const style = useAnimatedStyle(() => {
    const idle = 0.18 + 0.14 * Math.sin((breath.value + i * 0.22) * Math.PI * 2) ** 2;
    const h = Math.max(idle, level.value * SHAPE[i]);
    return { height: 4 + (height - 4) * h };
  });
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

export default function VoiceBars({ level = 0, color, height = 28 }) {
  const lvl = useSharedValue(0);
  const breath = useSharedValue(0);
  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);
  }, [breath]);
  useEffect(() => {
    lvl.value = withTiming(level, { duration: 160, easing: Easing.out(Easing.quad) });
  }, [level, lvl]);
  return (
    <View style={[styles.row, { height }]} aria-hidden>
      {SHAPE.map((_, i) => (
        <Bar key={i} i={i} level={lvl} breath={breath} color={color} height={height} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  bar: { width: 4, borderRadius: 2 },
});
