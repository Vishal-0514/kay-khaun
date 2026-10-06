import Svg, { Path, Rect, Circle } from 'react-native-svg';

// Line icons used across the app (24×24 grid, round caps). Shapes match the design file.
const shapes = {
  back: [['path', 'M15 18l-6-6 6-6']],
  close: [['path', 'M6 6l12 12M18 6L6 18']],
  arrow: [['path', 'M5 12h14M13 6l6 6-6 6']],
  check: [['path', 'M5 12.5l4.5 4.5L19 7.5']],
  chevron: [['path', 'M9 6l6 6-6 6']],
  mic: [['rect', { x: 9, y: 3, width: 6, height: 12, rx: 3 }], ['path', 'M5 11a7 7 0 0 0 14 0M12 18v3']],
  phone: [['rect', { x: 7, y: 2.5, width: 10, height: 19, rx: 2.5 }], ['path', 'M11 18.5h2']],
  mail: [['rect', { x: 3, y: 5, width: 18, height: 14, rx: 2 }], ['path', 'M3.5 6l8.5 7 8.5-7']],
  flame: [['path', 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3.5 2-4.5 0 2 1 3 2 3 0-3-1-5 1-8.5z']],
  spark: [['path', 'M12 3l1.9 6.1L20 11l-6.1 1.9L12 19l-1.9-6.1L4 11l6.1-1.9z']],
  user: [['circle', { cx: 12, cy: 8, r: 4 }], ['path', 'M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6']],
  home: [['path', 'M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z']],
  chat: [['path', 'M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z']],
  bag: [['path', 'M5 8h14l-1 13H6z'], ['path', 'M9 8V6a3 3 0 0 1 6 0v2']],
  pot: [['path', 'M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z'], ['path', 'M2 10h2M20 10h2M9 6c0-1 1-1.5 1-2.5M14 6c0-1 1-1.5 1-2.5']],
  clock: [['circle', { cx: 12, cy: 12, r: 9 }], ['path', 'M12 7v5l3 2']],
  rupee: [['path', 'M7 4h10M7 9h10M9 4c4 0 6 2 6 5s-2 5-6 5H7l8 7']],
  heart: [['path', 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z']],
  star: [['path', 'M12 3l2.7 5.6 6.1.8-4.5 4.2 1.2 6L12 16.8l-5.5 2.8 1.2-6L3.2 9.4l6.1-.8z']],
  bowl: [['path', 'M3 11h18a9 9 0 0 1-18 0z'], ['path', 'M8 7c0-1 1-1.5 1-2.5M12 7c0-1 1-1.5 1-2.5M16 7c0-1 1-1.5 1-2.5']],
  leaf: [['path', 'M5 19C5 10 11 4 20 4c0 9-6 15-15 15z'], ['path', 'M5 19l8-8']],
  cart: [['path', 'M3 6h12v9H3z'], ['path', 'M15 9h3.5l2.5 3v3h-6'], ['circle', { cx: 7, cy: 17.5, r: 1.8 }], ['circle', { cx: 17, cy: 17.5, r: 1.8 }]],
  sweet: [['path', 'M6 12h12l-1.5 8h-9z'], ['path', 'M5 12a7 7 0 0 1 14 0'], ['path', 'M12 5V3']],
  type: [['path', 'M4 7V5h16v2M12 5v14M9 19h6']],
  camera: [['path', 'M4 8h3l2-3h6l2 3h3v11H4z'], ['circle', { cx: 12, cy: 13, r: 3.5 }]],
  pin: [['path', 'M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z'], ['circle', { cx: 12, cy: 9.5, r: 2.5 }]],
  moon: [['path', 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z']],
  send: [['path', 'M4 12l16-8-6 16-2.5-6.5z']],
  plus: [['path', 'M12 5v14M5 12h14']],
  route: [['circle', { cx: 6, cy: 18, r: 2.5 }], ['circle', { cx: 18, cy: 6, r: 2.5 }], ['path', 'M8.5 18H15a3 3 0 0 0 0-6H9a3 3 0 0 1 0-6h6.5']],
  external: [['path', 'M7 17L17 7M9 7h8v8']],
  pause: [['path', 'M9 6v12M15 6v12']],
  play: [['path', 'M8 5.5v13l11-6.5z']],
  image: [['rect', { x: 3, y: 4, width: 18, height: 16, rx: 2 }], ['circle', { cx: 9, cy: 10, r: 2 }], ['path', 'M21 16l-5-5-9 9']],
  people: [['circle', { cx: 9, cy: 8, r: 3.5 }], ['path', 'M2.5 20c1-3.5 3.5-5.5 6.5-5.5s5.5 2 6.5 5.5'], ['path', 'M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.7.8 2.9 2.5 3.5 5.2']],
  restart: [['path', 'M4 12a8 8 0 1 0 2.3-5.7'], ['path', 'M4 4v4.5h4.5']],
  basket: [['path', 'M3 10h18l-2 10H5z'], ['path', 'M8 10l3-6M16 10l-3-6M9 14v3M15 14v3']],
};

export default function Icon({ name, size = 20, color = '#2B0F0B', strokeWidth = 2 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
      {shapes[name].map(([kind, d], i) => {
        if (kind === 'path') return <Path key={i} d={d} />;
        if (kind === 'rect') return <Rect key={i} {...d} />;
        return <Circle key={i} {...d} />;
      })}
    </Svg>
  );
}

export function DietMark({ type: diet, size = 14 }) {
  const veg = diet === 'veg';
  const c = veg ? '#1E8E3E' : '#8B3A1A';
  return (
    <Svg width={size} height={size} viewBox="0 0 14 14">
      <Rect x={0.75} y={0.75} width={12.5} height={12.5} rx={2.5} fill="#FFFFFF" stroke={c} strokeWidth={1.5} />
      {veg ? <Circle cx={7} cy={7} r={3} fill={c} /> : <Path d="M7 3.5l3.5 6.5h-7z" fill={c} />}
    </Svg>
  );
}
