import { useEffect, useId, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { onSpeechLevel } from '../lib/speak';

// Chatora as a little chef: a female or male face that blinks, listens, thinks
// and moves its mouth with its own voice. The face is drawn once (SVG); the eyes,
// eyebrows and mouth are small views on top so they can move smoothly on every phone.
//   state: 'idle' | 'listening' | 'thinking' | 'speaking'
//   micLevel: 0..1 while listening (how loud you are)

const W = 200;
const H = 220;
const INK = '#2B160F';
const RED = '#C8161D';
const GOLD = '#E8A93A';
const HAIR = { female: ['#4A2A1E', '#1E100B'], male: ['#3A2419', '#1A0E09'] };

function Face({ voice }) {
  const female = voice === 'female';
  const id = `av${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      <Defs>
        <RadialGradient id={`${id}skin`} cx="48%" cy="40%" r="62%">
          <Stop offset="0" stopColor="#F7CDA8" />
          <Stop offset="0.75" stopColor="#E9B087" />
          <Stop offset="1" stopColor="#D99A72" />
        </RadialGradient>
        <LinearGradient id={`${id}hair`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={HAIR[voice][0]} />
          <Stop offset="1" stopColor={HAIR[voice][1]} />
        </LinearGradient>
        <LinearGradient id={`${id}coat`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#ECE3D6" />
        </LinearGradient>
        <LinearGradient id={`${id}hat`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#EFE7DC" />
        </LinearGradient>
      </Defs>

      {/* Long hair behind the shoulders. */}
      {female ? (
        <Path d="M44 104 C38 58 70 40 100 40 C130 40 162 58 156 104 L164 170 C160 188 140 192 130 180 L70 180 C60 192 40 188 36 170 Z" fill={`url(#${id}hair)`} />
      ) : null}

      {/* Chef's coat with a red neckerchief. */}
      <Path d="M22 220 C24 186 56 168 100 168 C144 168 176 186 178 220 Z" fill={`url(#${id}coat)`} stroke="#E4D9CA" strokeWidth={1.5} />
      <Path d="M80 176 L114 220" stroke="#E2D6C6" strokeWidth={2} />
      {[
        [96, 198],
        [104, 211],
        [122, 192],
        [130, 206],
      ].map(([x, y], i) => (
        <Circle key={i} cx={x} cy={y} r={3.2} fill="#E0D4C3" stroke="#CFC1AE" strokeWidth={0.8} />
      ))}
      <Rect x={88} y={144} width={24} height={32} rx={11} fill="#D99A72" />
      <Path d="M78 168 Q100 180 122 168 L124 176 Q100 190 76 176 Z" fill="#FFFFFF" stroke="#E4D9CA" strokeWidth={1.2} />
      <Path d="M86 175 L114 175 L100 194 Z" fill={RED} />
      <Path d="M90 175 L110 175 L100 186 Z" fill="#A81218" opacity={0.35} />
      <Circle cx={100} cy={176} r={5} fill="#A81218" />

      {/* Ears and face. */}
      <Circle cx={49} cy={112} r={10} fill="#E2A67E" />
      <Circle cx={151} cy={112} r={10} fill="#E2A67E" />
      <Path d="M46 108 Q50 112 47 117" stroke="#C98A63" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M154 108 Q150 112 153 117" stroke="#C98A63" strokeWidth={2} fill="none" strokeLinecap="round" />
      <Ellipse cx={100} cy={108} rx={52} ry={56} fill={`url(#${id}skin)`} />

      {female ? (
        <>
          {/* Side-swept fringe, a bindi and gold jhumkas. */}
          <Path d="M48 106 C42 64 72 46 100 46 C130 46 158 62 152 104 C146 86 132 74 112 72 C106 80 96 86 84 86 C72 88 58 96 48 106 Z" fill={`url(#${id}hair)`} />
          <Path d="M66 64 C78 56 92 53 104 54" stroke="#7A5040" strokeWidth={2.4} strokeOpacity={0.55} fill="none" strokeLinecap="round" />
          <Circle cx={100} cy={89} r={2.6} fill={RED} />
          <Path d="M44 122 Q49 117 54 122 L52 128 L46 128 Z" fill={GOLD} />
          <Circle cx={49} cy={131} r={2.4} fill={GOLD} />
          <Path d="M146 122 Q151 117 156 122 L154 128 L148 128 Z" fill={GOLD} />
          <Circle cx={151} cy={131} r={2.4} fill={GOLD} />
          <Path d="M70 103 L65 100 M71 107 L66 106 M130 103 L135 100 M129 107 L134 106" stroke={INK} strokeWidth={1.8} strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* Short hair with a side part, a neat beard and moustache. */}
          <Path d="M48 104 C44 62 70 44 100 44 C132 44 158 60 152 104 C150 92 144 84 134 80 C122 87 104 87 90 79 C78 87 62 92 48 104 Z" fill={`url(#${id}hair)`} />
          <Path d="M90 79 C96 70 110 64 124 64" stroke="#6A4434" strokeWidth={2.2} strokeOpacity={0.6} fill="none" strokeLinecap="round" />
          <Rect x={49} y={98} width={7} height={16} rx={3} fill={HAIR.male[1]} />
          <Rect x={144} y={98} width={7} height={16} rx={3} fill={HAIR.male[1]} />
          <Path d="M56 122 C60 150 80 162 100 162 C120 162 140 150 144 122 C138 138 124 150 100 150 C76 150 62 138 56 122 Z" fill={`url(#${id}hair)`} opacity={0.8} />
          <Path d="M84 131 C90 126 97 128 100 131 C103 128 110 126 116 131 C110 134 105 134 100 133 C95 134 90 134 84 131 Z" fill={HAIR.male[1]} />
        </>
      )}

      {/* Chef's hat, worn at a slight angle. */}
      <G transform="rotate(-6 100 40)">
        <Circle cx={70} cy={30} r={17} fill={`url(#${id}hat)`} stroke="#E6DCCF" strokeWidth={1.2} />
        <Circle cx={130} cy={30} r={17} fill={`url(#${id}hat)`} stroke="#E6DCCF" strokeWidth={1.2} />
        <Circle cx={100} cy={19} r={23} fill={`url(#${id}hat)`} stroke="#E6DCCF" strokeWidth={1.2} />
        <Path d="M60 36 L140 36 L137 52 L63 52 Z" fill={`url(#${id}hat)`} />
        <Path d="M82 34 L81 50 M100 32 L100 50 M118 34 L119 50" stroke="#E6DCCF" strokeWidth={1.6} strokeLinecap="round" />
        <Rect x={60} y={48} width={80} height={13} rx={6.5} fill="#FFFFFF" stroke="#E6DCCF" strokeWidth={1.5} />
        <Circle cx={124} cy={54.5} r={4.2} fill={RED} />
        <Circle cx={124} cy={54.5} r={1.8} fill={GOLD} />
      </G>

      {/* Cheeks, nose and a resting smile (the mouth opens over it). */}
      <Ellipse cx={68} cy={129} rx={10} ry={7} fill="#F08A7E" opacity={0.4} />
      <Ellipse cx={132} cy={129} rx={10} ry={7} fill="#F08A7E" opacity={0.4} />
      <Path d="M97 116 Q100 122 104 119" stroke="#C98A63" strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d="M88 137 Q100 147 112 137" stroke="#8A2E24" strokeWidth={3.4} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export default function ChatoraAvatar({ voice = 'female', state = 'idle', micLevel = 0, size = 220 }) {
  const female = voice === 'female';
  const k = size / W;
  const height = H * k;

  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const mouth = useSharedValue(0);
  const look = useSharedValue(0); // 1 = eyes up and to the side, thinking
  const tilt = useSharedValue(0);
  const mic = useSharedValue(0);
  const brow = useSharedValue(0); // 1 = both brows up (listening)
  const quizzical = useSharedValue(0); // 1 = one brow up (thinking)

  useEffect(() => {
    breath.value = withRepeat(withTiming(1, { duration: 2800, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, [breath]);

  // Blink every few seconds, now and then twice.
  useEffect(() => {
    let timer;
    const next = () => {
      timer = setTimeout(() => {
        const once = withSequence(withTiming(0.1, { duration: 70 }), withTiming(1, { duration: 110 }));
        blink.value = Math.random() < 0.2 ? withSequence(once, withTiming(1, { duration: 90 }), once) : once;
        next();
      }, 2200 + Math.random() * 2800);
    };
    next();
    return () => clearTimeout(timer);
  }, [blink]);

  useEffect(() => {
    look.value = withTiming(state === 'thinking' ? 1 : 0, { duration: 380, easing: Easing.out(Easing.cubic) });
    tilt.value = withSpring(state === 'thinking' ? 5 : state === 'listening' ? -4 : 0, { damping: 14, stiffness: 90 });
    brow.value = withSpring(state === 'listening' ? 1 : state === 'speaking' ? 0.35 : 0, { damping: 12, stiffness: 120 });
    quizzical.value = withSpring(state === 'thinking' ? 1 : 0, { damping: 12, stiffness: 120 });
  }, [state, look, tilt, brow, quizzical]);

  useEffect(() => {
    mic.value = withTiming(state === 'listening' ? micLevel : 0, { duration: 140 });
  }, [state, micLevel, mic]);

  // The mouth follows Chatora's voice. Phones report how loud the voice is;
  // where they don't (the browser), it moves to a natural talking rhythm.
  const lastSample = useRef(0);
  useEffect(() => {
    if (state !== 'speaking') {
      mouth.value = withTiming(0, { duration: 160 });
      return undefined;
    }
    const off = onSpeechLevel((level) => {
      lastSample.current = Date.now();
      mouth.value = withTiming(level, { duration: 70 });
    });
    let open = false;
    const rhythm = setInterval(() => {
      if (Date.now() - lastSample.current < 400) return;
      open = !open;
      mouth.value = withTiming(open ? 0.35 + Math.random() * 0.6 : Math.random() * 0.15, { duration: 90 + Math.random() * 60 });
    }, 140);
    return () => {
      off();
      clearInterval(rhythm);
    };
  }, [state, mouth]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * breath.value - 3 * mouth.value }, { rotate: `${tilt.value}deg` }, { scale: 1 + 0.03 * mic.value }],
  }));
  const eye = useAnimatedStyle(() => ({
    transform: [{ translateX: 4 * look.value }, { translateY: -5 * look.value }, { scaleY: blink.value }],
  }));
  const leftBrow = useAnimatedStyle(() => ({
    transform: [{ translateY: (-4 * brow.value - 5 * quizzical.value) * k }, { rotate: `${2 - 10 * quizzical.value}deg` }],
  }));
  const rightBrow = useAnimatedStyle(() => ({
    transform: [{ translateY: -4 * brow.value * k }, { rotate: '-2deg' }],
  }));
  const mouthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mouth.value, [0, 0.08, 0.15], [0, 0, 1], 'clamp'),
    height: (3 + 17 * mouth.value) * k,
    marginTop: -((3 + 17 * mouth.value) * k) / 2,
  }));

  const at = (x, y, w, h) => ({ left: (x - w / 2) * k, top: (y - h / 2) * k, width: w * k, height: h * k });
  const eyeBox = (x) => [styles.eye, at(x, 108, 14, 17), { borderRadius: 8 * k }, eye];
  const browBox = (x, style) => [styles.brow, at(x, 93, 22, female ? 3.4 : 5), { borderRadius: 3 * k }, style];
  const shine = { width: 5 * k, height: 5 * k, borderRadius: 3 * k, top: 2.5 * k, right: 2 * k };
  const glint = { width: 2.2 * k, height: 2.2 * k, borderRadius: 2 * k, bottom: 3 * k, left: 2.5 * k, opacity: 0.7 };

  return (
    <Animated.View style={[{ width: size, height }, body]} aria-hidden>
      <Face voice={voice} />
      <Animated.View style={browBox(80, leftBrow)} />
      <Animated.View style={browBox(120, rightBrow)} />
      <Animated.View style={eyeBox(80)}>
        <View style={[styles.shine, shine]} />
        <View style={[styles.shine, glint]} />
      </Animated.View>
      <Animated.View style={eyeBox(120)}>
        <View style={[styles.shine, shine]} />
        <View style={[styles.shine, glint]} />
      </Animated.View>
      <Animated.View style={[styles.mouth, { left: 88 * k, top: 141 * k, width: 24 * k, borderRadius: 12 * k }, mouthStyle]}>
        <View style={[styles.teeth, { height: '24%' }]} />
        <View style={[styles.tongue, { height: '45%', borderRadius: 10 * k }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eye: { position: 'absolute', backgroundColor: INK },
  brow: { position: 'absolute', backgroundColor: '#2A150D' },
  shine: { position: 'absolute', backgroundColor: '#FFFFFF' },
  mouth: { position: 'absolute', backgroundColor: '#6E1A17', overflow: 'hidden', justifyContent: 'space-between' },
  teeth: { backgroundColor: '#FFFDF8', marginHorizontal: '14%', borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },
  tongue: { backgroundColor: '#E86F6A', marginHorizontal: '18%' },
});
