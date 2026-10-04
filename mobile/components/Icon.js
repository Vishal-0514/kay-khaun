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
