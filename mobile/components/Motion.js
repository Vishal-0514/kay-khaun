import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import Animated, { Easing, FadeIn, FadeInDown, FadeInLeft, FadeInRight, FadeOut, LinearTransition, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

// The app's motion language: calm and smooth, never bouncy.
//  - things glide a few pixels into place while fading in, on one soft ease-out
//    curve (fast start, long gentle settle — no springs, no overshoot)
//  - headlines are revealed like a curtain: they slide up from behind an edge
//  - the main button catches a slow sweep of gold light now and then
//  - "alive" things breathe light instead of bouncing
// Reanimated follows the phone's "reduce motion" setting automatically.

const CURVE = [0.22, 1, 0.36, 1]; // "ease-out-quint": quick start, silky landing
const STAGGER = 80;

// Entering animation: fade in while gliding 25px into place (or just fade).
// Built on the library's fade presets with our curve, because only those run
// the same on phones and in the web preview (custom worklets, keyframes and
// custom start values misbehave on web).
function glide({ delay = 0, dx = 0, dy = 1, duration = 650 }) {
  const preset = dx > 0 ? FadeInRight : dx < 0 ? FadeInLeft : dy ? FadeInDown : FadeIn;
  return preset.delay(delay).duration(duration).easing(Easing.bezier(CURVE[0], CURVE[1], CURVE[2], CURVE[3]));
}

// n-th item of a group glides up into place; `base` delays the whole group.
export const rise = (n = 0, base = 0) => glide({ delay: base + n * STAGGER });
// Cards that sit over the maroon band settle more slowly.
export const riseUp = (n = 0, base = 0) => glide({ delay: base + n * STAGGER, dy: 32, duration: 800 });
// Just a slow fade, for big hero pieces.
export const appear = (n = 0, base = 0) => glide({ delay: base + n * STAGGER, dy: 0, duration: 900 });
// Sideways glides: chat bubbles, steps.
export const fromRight = (delay = 0) => glide({ delay, dx: 28, dy: 0, duration: 520 });
export const fromLeft = (delay = 0) => glide({ delay, dx: -28, dy: 0, duration: 520 });
// Bottom sheets and action bars: a long, slow settle.
export const sheetUp = (delay = 0) => glide({ delay, dy: 80, duration: 900 });
export const leave = FadeOut.duration(200);
// When items are added or removed, the rest slide smoothly to their new places.
// (On web the library fakes this with a scale-from-zero, which looks like a pop, so it's off there.)
export const smoothLayout = Platform.OS === 'web' ? undefined : LinearTransition.duration(320);

export function Rise({ n = 0, base = 0, style, children, ...rest }) {
  return (
    <Animated.View entering={rise(n, base)} style={style} {...rest}>
      {children}
    </Animated.View>
  );
}

// Curtain reveal: the text slides up from behind an invisible edge.
export function Reveal({ delay = 0, style, children }) {
  const [height, setHeight] = useState(0);
  const y = useSharedValue(1);
  useEffect(() => {
    if (!height) return;
    y.value = withDelay(delay, withTiming(0, { duration: 900, easing: Easing.bezier(CURVE[0], CURVE[1], CURVE[2], CURVE[3]) }));
  }, [height, delay, y]);
  const animated = useAnimatedStyle(() => ({ opacity: height ? 1 : 0, transform: [{ translateY: y.value * height }] }));
  return (
    <View style={[{ overflow: 'hidden' }, style]}>
      <Animated.View onLayout={(e) => setHeight(e.nativeEvent.layout.height)} style={animated}>
        {children}
      </Animated.View>
    </View>
  );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Drop-in Pressable that settles down a touch while pressed — no wobble back.
export function PressScale({ scaleTo = 0.97, style, onPressIn, onPressOut, disabled, children, ...rest }) {
  const t = useSharedValue(0);
  const animated = useAnimatedStyle(() => ({ opacity: 1 - t.value * 0.12, transform: [{ scale: 1 - t.value * (1 - scaleTo) }] }));
  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      onPressIn={(e) => {
        t.value = withTiming(1, { duration: 110 });
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        t.value = withTiming(0, { duration: 260, easing: Easing.out(Easing.quad) });
        onPressOut?.(e);
      }}
      // Animated styles must be plain values, so a ({ pressed }) style is read once.
      style={[typeof style === 'function' ? style({ pressed: false }) : style, animated]}
    >
      {children}
    </AnimatedPressable>
  );
}

// A soft halo that slowly brightens and dims behind something (the mic).
export function Glow({ size, color, style }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [t]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.12 + 0.28 * t.value }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style, animated]}
    />
  );
}

// Drifts up and down forever, fading a little — for sparkles.
export function Float({ distance = 8, duration = 2600, delay = 0, style, children }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delay, withRepeat(withTiming(1, { duration, easing: Easing.inOut(Easing.sin) }), -1, true));
  }, [delay, duration, t]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.4 + 0.6 * t.value, transform: [{ translateY: -distance * t.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

// "Chatora is typing": three dots that shimmer in turn (they don't jump).
function Dot({ i, color }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(i * 180, withRepeat(withSequence(withTiming(1, { duration: 420 }), withTiming(0, { duration: 420 }), withTiming(0, { duration: 180 })), -1));
  }, [i, t]);
  const animated = useAnimatedStyle(() => ({ opacity: 0.25 + 0.75 * t.value }));
  return <Animated.View style={[{ width: 7, height: 7, borderRadius: 4, backgroundColor: color }, animated]} />;
}

export function TypingDots({ color }) {
  return (
    <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center', height: 14 }}>
      {[0, 1, 2].map((i) => (
        <Dot key={i} i={i} color={color} />
      ))}
    </View>
  );
}

// A slow band of light that sweeps across its parent every few seconds.
// Put it as the last child of a button with overflow: 'hidden'.
export function Sheen({ every = 4200, delay = 1200, color = '#FFFFFF' }) {
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);
  useEffect(() => {
    if (!width) return;
    t.value = withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.quad) }), withTiming(1, { duration: every }), withTiming(0, { duration: 0 })), -1));
  }, [width, delay, every, t]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: -120 + t.value * (width + 240) }, { skewX: '-20deg' }] }));
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Animated.View style={[{ position: 'absolute', top: -10, bottom: -10, width: 80 }, animated]}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color} stopOpacity="0" />
              <Stop offset="0.5" stopColor={color} stopOpacity="0.35" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#sheen)" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// Smoothly glides a value (tab indicator, switch pill) — no spring.
export function glideTo(value) {
  'worklet';
  return withTiming(value, { duration: 420, easing: Easing.bezier(0.22, 1, 0.36, 1) });
}
