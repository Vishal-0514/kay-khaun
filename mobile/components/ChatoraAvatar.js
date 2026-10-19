import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
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
// and moves its mouth with its own voice. The face is drawn once (SVG); the eyes
// and mouth are small views on top so they can move smoothly on every phone.
//   state: 'idle' | 'listening' | 'thinking' | 'speaking'
//   micLevel: 0..1 while listening (how loud you are)

const W = 200;
const H = 220;
const SKIN = '#E8B48C';
const SKIN_SHADE = '#D39A72';
const HAIR = '#2E1A14';
const INK = '#2B0F0B';
const KURTA = { female: '#B0242B', male: '#7A1A20' };
const GOLD = '#E8A93A';

function Face({ voice }) {
  const female = voice === 'female';
  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${W} ${H}`}>
      {female ? (
        <Path d="M46 104 C40 60 70 40 100 40 C130 40 160 60 154 104 L162 176 C152 192 132 190 126 176 L74 176 C68 190 48 192 38 176 Z" fill={HAIR} />
      ) : null}
      <Path d="M36 220 C38 186 64 170 100 170 C136 170 162 186 164 220 Z" fill={KURTA[voice]} />
      <Path d="M82 172 Q100 198 118 172" stroke={GOLD} strokeWidth={4} fill="none" strokeLinecap="round" />
      <Rect x={87} y={146} width={26} height={32} rx={10} fill={SKIN_SHADE} />
      <Circle cx={49} cy={112} r={10} fill={SKIN_SHADE} />
      <Circle cx={151} cy={112} r={10} fill={SKIN_SHADE} />
      <Ellipse cx={100} cy={108} rx={52} ry={56} fill={SKIN} />
      {female ? (
        <>
          <Path d="M48 106 C44 66 72 50 100 50 C128 50 156 66 152 106 C142 88 126 76 106 74 C112 82 110 90 103 94 C96 82 80 76 62 86 C56 92 51 98 48 106 Z" fill={HAIR} />
          <Circle cx={49} cy={127} r={4.5} fill={GOLD} />
          <Circle cx={151} cy={127} r={4.5} fill={GOLD} />
        </>
      ) : (
        <Path d="M48 102 C44 64 70 46 100 46 C132 46 158 62 152 102 C148 90 140 82 128 79 C118 87 100 85 88 77 C78 85 62 88 48 102 Z" fill={HAIR} />
      )}
      {/* Chef's hat, worn at a slight angle. */}
      <G transform="rotate(-6 100 40)">
        <Circle cx={74} cy={34} r={16} fill="#FFFFFF" />
        <Circle cx={126} cy={34} r={16} fill="#FFFFFF" />
        <Circle cx={100} cy={24} r={21} fill="#FFFFFF" />
        <Rect x={62} y={40} width={76} height={17} rx={7} fill="#FFFFFF" stroke="#EADFD0" strokeWidth={2} />
      </G>
      {female ? (
        <>
          <Circle cx={138} cy={64} r={7} fill={GOLD} />
          <Circle cx={138} cy={64} r={3} fill="#FFF4E6" />
        </>
      ) : null}
      <Path
        d={female ? 'M71 92 Q80 86 89 91 M111 91 Q120 86 129 92' : 'M70 92 Q80 87 90 91 M110 91 Q120 87 130 92'}
        stroke={HAIR}
        strokeWidth={female ? 3 : 5}
        strokeLinecap="round"
        fill="none"
      />
      <Circle cx={69} cy={128} r={9} fill="#F08A7E" opacity={0.45} />
      <Circle cx={131} cy={128} r={9} fill="#F08A7E" opacity={0.45} />
      <Path d="M97 117 Q100 122 104 119" stroke={SKIN_SHADE} strokeWidth={2.5} strokeLinecap="round" fill="none" />
      <Path d="M88 136 Q100 146 112 136" stroke="#7A2A22" strokeWidth={3.5} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

export default function ChatoraAvatar({ voice = 'female', state = 'idle', micLevel = 0, size = 220 }) {
  const k = size / W;
  const height = H * k;

  const breath = useSharedValue(0);
  const blink = useSharedValue(1);
  const mouth = useSharedValue(0);
  const look = useSharedValue(0); // 1 = eyes up and to the side, thinking
  const tilt = useSharedValue(0);
  const mic = useSharedValue(0);

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
  }, [state, look, tilt]);

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
  const mouthStyle = useAnimatedStyle(() => ({
    opacity: interpolate(mouth.value, [0, 0.08, 0.15], [0, 0, 1], 'clamp'),
    height: (3 + 17 * mouth.value) * k,
    marginTop: -((3 + 17 * mouth.value) * k) / 2,
  }));

  const at = (x, y, w, h) => ({ left: (x - w / 2) * k, top: (y - h / 2) * k, width: w * k, height: h * k });
  const eyeBox = (x) => [styles.eye, at(x, 108, 13, 16), { borderRadius: 8 * k }, eye];

  return (
    <Animated.View style={[{ width: size, height }, body]} aria-hidden>
      <Face voice={voice} />
      <Animated.View style={eyeBox(80)}>
        <View style={[styles.shine, { width: 4.5 * k, height: 4.5 * k, borderRadius: 3 * k, top: 2.5 * k, right: 2 * k }]} />
      </Animated.View>
      <Animated.View style={eyeBox(120)}>
        <View style={[styles.shine, { width: 4.5 * k, height: 4.5 * k, borderRadius: 3 * k, top: 2.5 * k, right: 2 * k }]} />
      </Animated.View>
      <Animated.View style={[styles.mouth, { left: 88 * k, top: 140 * k, width: 24 * k, borderRadius: 12 * k }, mouthStyle]}>
        <View style={[styles.tongue, { height: '45%', borderRadius: 10 * k }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  eye: { position: 'absolute', backgroundColor: INK },
  shine: { position: 'absolute', backgroundColor: '#FFFFFF' },
  mouth: { position: 'absolute', backgroundColor: '#6E1A17', overflow: 'hidden', justifyContent: 'flex-end' },
  tongue: { backgroundColor: '#E86F6A', marginHorizontal: '18%' },
});
