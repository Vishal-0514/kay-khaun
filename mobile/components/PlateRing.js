import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Circle, Line } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { colors } from '../lib/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// The app's signature circle: a plate rim whose gold-to-red arc shows a share —
// match score, time left on a timer, budget used, ingredients in the fridge.
// The arc sweeps in when it first appears and glides when the value changes;
// `instant` skips that (the cook-mode timer ticks every second).
export default function PlateRing({ size, value, dark = false, ticks = false, instant = false, delay = 150, children }) {
  const sw = Math.max(4, Math.round(size * 0.075));
  const r = (size - sw) / 2 - (ticks ? 10 : 2);
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const id = `ring${size}${dark ? 'd' : ''}`;
  const target = Math.min(1, Math.max(0, value || 0));

  const shown = useSharedValue(instant ? target : 0);
  useEffect(() => {
    shown.value = instant ? target : withDelay(delay, withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) }));
  }, [target, instant, delay, shown]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - shown.value) }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.gold} />
            <Stop offset="1" stopColor={colors.red} />
          </LinearGradient>
        </Defs>
        {ticks &&
          Array.from({ length: 48 }, (_, k) => {
            const a = (k / 48) * Math.PI * 2;
            const r1 = r + sw / 2 + 4;
            const r2 = r1 + (k % 4 === 0 ? 5 : 2.5);
            return (
              <Line key={k} x1={c + Math.cos(a) * r1} y1={c + Math.sin(a) * r1} x2={c + Math.cos(a) * r2} y2={c + Math.sin(a) * r2}
                stroke={dark ? 'rgba(232,169,58,0.55)' : '#E2C79A'} strokeWidth={1.2} />
            );
          })}
        <Circle cx={c} cy={c} r={r + sw / 2 + 1} fill={dark ? 'rgba(255,255,255,0.06)' : colors.surface} />
        <Circle cx={c} cy={c} r={r} fill="none" stroke={dark ? 'rgba(255,255,255,0.12)' : '#F3E8D6'} strokeWidth={sw} />
        <AnimatedCircle cx={c} cy={c} r={r} fill="none" stroke={`url(#${id})`} strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`} animatedProps={arc} transform={`rotate(-90 ${c} ${c})`} />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
