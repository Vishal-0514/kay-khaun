import { useId } from 'react';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

// Food pictures for Home, drawn in code: each dish is shown at a 45° angle like a
// food photo (plates and bowls with depth, soft shadows, glossy highlights and
// steam), so it stays sharp at any size and needs no photos or licences.
//   <FoodArt name="thali" size={120} />
// Names: thali, biryani, burger, kadai, coffee, scene, noodles, breakfast,
// masala, chai, rajma, samosa, butterChicken.

// The same "random" spread every time, so the art never jumps between renders.
function scatter(count, seed = 7) {
  let s = seed;
  const rand = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  return Array.from({ length: count }, () => {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(rand());
    return { x: Math.cos(a) * r, y: Math.sin(a) * r, rot: rand() * 180, pick: rand() };
  });
}

// ---------- shared pieces ----------

// A soft shadow that fades out at the edge.
function Shadow({ g, cx, cy, rx, ry, o = 1 }) {
  return <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={g('shadow')} opacity={o} />;
}

// A round plate seen at an angle: edge, rim, and the well in the middle.
function Plate({ g, cx = 60, cy = 78, rx = 54, steel = false }) {
  const ry = rx * 0.48;
  return (
    <G>
      <Shadow g={g} cx={cx + 2} cy={cy + ry * 0.45} rx={rx * 1.04} ry={ry * 1.05} />
      <Ellipse cx={cx} cy={cy + 3.2} rx={rx} ry={ry} fill={steel ? '#9D978F' : '#D8CEC0'} />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={g(steel ? 'steelRim' : 'plateRim')} />
      <Ellipse cx={cx} cy={cy + 1.6} rx={rx * 0.76} ry={ry * 0.72} fill={g(steel ? 'steelWell' : 'plateWell')} />
      <Path
        d={`M${cx - rx * 0.86} ${cy - ry * 0.32} A${rx * 0.93} ${ry * 0.9} 0 0 1 ${cx - rx * 0.1} ${cy - ry * 0.92}`}
        stroke="#FFFFFF"
        strokeWidth={1.6}
        strokeOpacity={0.9}
        fill="none"
        strokeLinecap="round"
      />
    </G>
  );
}

const MATERIAL = {
  white: { body: 'matWhite', rim: '#FFFFFF', foot: '#CFC5B7', lip: '#E8DFD3' },
  steel: { body: 'matSteel', rim: '#F2F1EF', foot: '#8E8880', lip: '#C9C5BF' },
  copper: { body: 'matCopper', rim: '#F2B06E', foot: '#6E2E0E', lip: '#C9783D' },
  clay: { body: 'matClay', rim: '#D98E62', foot: '#6E2A12', lip: '#B4603A' },
  black: { body: 'matBlack', rim: '#6B6461', foot: '#151212', lip: '#3A3433' },
};

// A bowl seen at an angle. Its contents (children) are clipped to the opening.
function Bowl({ g, id, cx, cy, rx, h, mat = 'white', fill, band, children, shadow = true }) {
  const m = MATERIAL[mat];
  const ry = rx * 0.4;
  const clip = `${id}${Math.round(cx)}x${Math.round(cy)}`;
  return (
    <G>
      {shadow ? <Shadow g={g} cx={cx + 2} cy={cy + h + 1} rx={rx * 0.95} ry={ry * 0.75} /> : null}
      <Path
        d={`M${cx - rx} ${cy} C${cx - rx} ${cy + h * 0.95} ${cx - rx * 0.55} ${cy + h} ${cx} ${cy + h} C${cx + rx * 0.55} ${cy + h} ${cx + rx} ${cy + h * 0.95} ${cx + rx} ${cy} Z`}
        fill={g(m.body)}
      />
      <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={m.rim} />
      {band ? <Ellipse cx={cx} cy={cy} rx={rx * 0.985} ry={ry * 0.96} fill="none" stroke={band} strokeWidth={2.2} /> : null}
      <Ellipse cx={cx} cy={cy + ry * 0.06} rx={rx * 0.92} ry={ry * 0.84} fill={m.lip} />
      <Defs>
        <ClipPath id={clip}>
          <Ellipse cx={cx} cy={cy + ry * 0.1} rx={rx * 0.9} ry={ry * 0.8} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Ellipse cx={cx} cy={cy + ry * 0.12} rx={rx * 0.9} ry={ry * 0.8} fill={fill} />
        {children}
      </G>
      <Path d={`M${cx - rx * 0.92} ${cy - ry * 0.1} A${rx * 0.95} ${ry * 0.95} 0 0 1 ${cx - rx * 0.25} ${cy - ry * 0.92}`} stroke="#FFFFFF" strokeOpacity={0.75} strokeWidth={1.2} fill="none" strokeLinecap="round" />
    </G>
  );
}

// A coriander leaf (or mint, in a darker green).
function Leaf({ x, y, s = 1, rot = 0, color = '#3F9A43' }) {
  return (
    <G transform={`translate(${x} ${y}) rotate(${rot}) scale(${s})`}>
      <Path d="M0 -4 C2.5 -4 3.8 -1.5 2.6 0.6 C3.8 1.8 2.4 4 0 3.6 C-2.4 4 -3.8 1.8 -2.6 0.6 C-3.8 -1.5 -2.5 -4 0 -4 Z" fill={color} />
      <Path d="M0 -3 L0 3" stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={0.5} />
    </G>
  );
}

// Rising steam: soft white curls.
function Steam({ x, y, h = 22, o = 0.7 }) {
  return (
    <G opacity={o}>
      {[-7, 0, 7].map((dx, i) => (
        <Path
          key={i}
          d={`M${x + dx} ${y} C${x + dx - 4} ${y - h * 0.3} ${x + dx + 4} ${y - h * 0.55} ${x + dx} ${y - h * (0.85 + i * 0.08)}`}
          stroke="#CDBFB0"
          strokeWidth={2.4}
          strokeLinecap="round"
          fill="none"
          opacity={i === 1 ? 0.9 : 0.6}
        />
      ))}
    </G>
  );
}

// A paneer (or chicken) cube with a lit top and shaded sides.
function Cube({ x, y, s = 7, top = '#FFF5E2', front = '#F1D9AE', side = '#DDBB84', rot = 0, char = '#B87A3A' }) {
  const d = s * 0.38;
  return (
    <G transform={`rotate(${rot} ${x} ${y})`}>
      <Path d={`M${x} ${y} L${x + s} ${y} L${x + s} ${y + s * 0.72} L${x} ${y + s * 0.72} Z`} fill={front} />
      <Path d={`M${x + s} ${y} L${x + s + d} ${y - d * 0.8} L${x + s + d} ${y + s * 0.72 - d * 0.8} L${x + s} ${y + s * 0.72} Z`} fill={side} />
      <Path d={`M${x} ${y} L${x + d} ${y - d * 0.8} L${x + s + d} ${y - d * 0.8} L${x + s} ${y} Z`} fill={top} />
      <Ellipse cx={x + s * 0.3} cy={y + s * 0.35} rx={s * 0.12} ry={s * 0.08} fill={char} opacity={0.55} />
    </G>
  );
}

// A glossy round thing (cherry tomato, bean, chunk) with a highlight.
function Gloss({ cx, cy, r, fill, hi = 0.65 }) {
  return (
    <G>
      <Circle cx={cx} cy={cy} r={r} fill={fill} />
      <Ellipse cx={cx - r * 0.35} cy={cy - r * 0.4} rx={r * 0.35} ry={r * 0.22} fill="#FFFFFF" opacity={hi} />
    </G>
  );
}

function RiceMound({ g, cx, cy, w, h, seed = 3 }) {
  return (
    <G>
      <Path d={`M${cx - w} ${cy} C${cx - w} ${cy - h * 1.1} ${cx + w} ${cy - h * 1.1} ${cx + w} ${cy} C${cx + w * 0.6} ${cy + h * 0.35} ${cx - w * 0.6} ${cy + h * 0.35} ${cx - w} ${cy} Z`} fill={g('rice')} />
      {scatter(Math.round(w * 2.2), seed).map((p, i) => {
        const x = cx + p.x * w * 0.85;
        const y = cy - h * 0.35 + p.y * h * 0.55;
        return <Ellipse key={i} cx={x} cy={y} rx={1.7} ry={0.7} fill={p.pick > 0.5 ? '#E7DECC' : '#FFFFFF'} transform={`rotate(${p.rot} ${x} ${y})`} />;
      })}
    </G>
  );
}

// ---------- dishes ----------

function Thali({ g, id }) {
  return (
    <G>
      <Plate g={g} cx={60} cy={80} rx={56} steel />
      <Bowl g={g} id={id} cx={33} cy={67} rx={16} h={9} mat="steel" fill={g('dal')} shadow={false}>
        {scatter(5, 4).map((p, i) => (
          <Circle key={i} cx={34 + p.x * 9} cy={68 + p.y * 3} r={0.9} fill={i % 2 ? '#C8161D' : '#2F7D32'} />
        ))}
        <Leaf x={36} y={67} s={0.5} />
      </Bowl>
      <Bowl g={g} id={id} cx={60} cy={62} rx={16} h={9} mat="steel" fill={g('curry')} shadow={false}>
        <Cube x={53} y={64} s={5} rot={-8} />
        <Cube x={61} y={65} s={5} rot={10} />
        <Path d="M50 64 C55 61 62 66 69 62" stroke="#FFF1DC" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      </Bowl>
      <Bowl g={g} id={id} cx={87} cy={67} rx={15} h={9} mat="steel" fill={g('raita')} shadow={false}>
        {scatter(8, 6).map((p, i) => (
          <Circle key={i} cx={86 + p.x * 8} cy={68 + p.y * 3} r={0.7} fill={i % 3 ? '#4E9A3A' : '#C8161D'} />
        ))}
      </Bowl>
      <RiceMound g={g} cx={40} cy={92} w={17} h={11} />
      <Leaf x={42} y={84} s={0.6} rot={30} />
      {/* folded rotis */}
      <Path d="M66 94 C66 82 98 80 100 92 C92 98 72 99 66 94 Z" fill="#C98942" />
      <Path d="M64 90 C64 79 96 77 98 88 C90 94 70 95 64 90 Z" fill={g('roti')} />
      {scatter(10, 11).map((p, i) => (
        <Ellipse key={i} cx={81 + p.x * 12} cy={86 + p.y * 3} rx={1.5} ry={0.8} fill="#A15F22" opacity={0.7} />
      ))}
      <Bowl g={g} id={id} cx={60} cy={84} rx={6} h={4} mat="steel" fill="#B8331B" shadow={false}>
        <Circle cx={59} cy={84} r={1.3} fill="#E8A33A" />
      </Bowl>
      {/* salad */}
      <Ellipse cx={52} cy={100} rx={5} ry={2.6} fill="#E2412D" />
      <Ellipse cx={52} cy={100} rx={3.6} ry={1.8} fill="#F27A62" />
      <Ellipse cx={60} cy={102} rx={4} ry={2.1} fill="#6FA845" />
      <Ellipse cx={60} cy={102} rx={2.8} ry={1.4} fill="#D8EDBB" />
      <Ellipse cx={68} cy={100} rx={4.2} ry={2} fill="none" stroke="#C77FA6" strokeWidth={1.2} />
    </G>
  );
}

function Kadai({ g, id }) {
  return (
    <G>
      <Steam x={60} y={44} h={26} />
      <Path d="M6 58 C2 56 2 66 8 66 L16 64" stroke="#2A2524" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Path d="M114 58 C118 56 118 66 112 66 L104 64" stroke="#2A2524" strokeWidth={4} fill="none" strokeLinecap="round" />
      <Bowl g={g} id={id} cx={60} cy={60} rx={48} h={34} mat="black" fill={g('curry')}>
        <Path d="M30 62 C40 56 56 64 66 58 C74 54 84 60 90 57" stroke="#FFF1DC" strokeWidth={2.2} fill="none" strokeLinecap="round" opacity={0.9} />
        <Cube x={30} y={60} s={9} rot={-6} />
        <Cube x={50} y={66} s={9} rot={8} />
        <Cube x={70} y={58} s={9} rot={-12} />
        <Cube x={84} y={66} s={8} rot={6} />
        <Cube x={44} y={55} s={7} rot={14} />
        {[
          [62, 68, 20],
          [38, 70, -30],
          [80, 56, 50],
        ].map(([x, y, r], i) => (
          <G key={i} transform={`rotate(${r} ${x} ${y})`}>
            <Rect x={x - 4} y={y - 2.5} width={8} height={5} rx={1.6} fill="#3E9441" />
            <Rect x={x - 3} y={y - 2} width={4} height={1.4} rx={0.7} fill="#7CC35E" />
          </G>
        ))}
        <Path d="M58 52 C61 50 66 51 68 53" stroke="#F3D9E4" strokeWidth={2} fill="none" strokeLinecap="round" />
        <Leaf x={48} y={62} s={0.9} rot={10} />
        <Leaf x={76} y={64} s={0.8} rot={-30} />
        <Leaf x={64} y={58} s={0.7} rot={60} />
        <Path d="M22 64 C30 70 42 72 48 70" stroke="#2F8A36" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <Ellipse cx={60} cy={52} rx={22} ry={3} fill="#FFFFFF" opacity={0.2} />
      </Bowl>
    </G>
  );
}

function Burger({ g }) {
  return (
    <G>
      <Shadow g={g} cx={60} cy={106} rx={52} ry={8} />
      {/* fries in a carton */}
      {[
        [78, 34, -12],
        [84, 30, -5],
        [90, 32, 3],
        [96, 36, 11],
        [81, 40, -8],
        [93, 40, 7],
        [87, 36, 0],
      ].map(([x, y, r], i) => (
        <Rect key={i} x={x} y={y} width={5.5} height={38} rx={1.5} fill={g('fry')} stroke="#D9A21E" strokeWidth={0.5} transform={`rotate(${r} ${x + 3} ${y + 19})`} />
      ))}
      <Path d="M72 60 L108 60 L103 104 L77 104 Z" fill={g('carton')} />
      <Path d="M72 60 Q81 67 90 60 Q99 67 108 60 L107 66 Q99 73 90 66 Q81 73 73 66 Z" fill="#F05A4F" />
      <Path d="M77 72 L79 102" stroke="#FFFFFF" strokeOpacity={0.3} strokeWidth={2} />
      {/* burger */}
      <Path d="M14 91 C14 103 22 106 34 106 L70 106 C80 106 86 103 86 91 Z" fill={g('bunLow')} />
      <Rect x={11} y={78} width={78} height={14} rx={7} fill={g('patty')} />
      {scatter(16, 9).map((p, i) => (
        <Circle key={i} cx={18 + i * 4.2} cy={84 + p.y * 2.5} r={0.9} fill="#2A0F06" opacity={0.6} />
      ))}
      <Path d="M12 77 L88 77 L86 81 L74 81 L69 91 L64 81 L36 81 L30 89 L25 81 L12 81 Z" fill={g('cheese')} />
      <Rect x={13} y={70} width={74} height={7} rx={3.5} fill="#D83A2A" />
      <Rect x={18} y={71} width={30} height={2} rx={1} fill="#F07A64" opacity={0.7} />
      <Path d="M8 71 Q13 62 18 70 Q23 62 28 70 Q33 62 38 70 Q43 62 48 70 Q53 62 58 70 Q63 62 68 70 Q73 62 78 70 Q83 62 88 70 Q91 64 93 71 L90 75 L11 75 Z" fill={g('lettuce')} />
      <Path d="M9 69 C9 32 91 32 91 69 Z" fill={g('bun')} />
      <Path d="M20 54 C25 44 38 39 50 39" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={3.5} fill="none" strokeLinecap="round" />
      {[
        [28, 52, 20],
        [40, 45, -10],
        [53, 48, 30],
        [65, 44, -25],
        [76, 53, 10],
        [46, 57, -30],
        [34, 60, 0],
        [62, 58, 15],
        [72, 62, -15],
      ].map(([x, y, r], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={2.3} ry={1.2} fill="#FFF3D8" stroke="#E2B36B" strokeWidth={0.4} transform={`rotate(${r} ${x} ${y})`} />
      ))}
    </G>
  );
}

function Coffee({ g }) {
  return (
    <G>
      <Steam x={46} y={48} h={24} />
      <Shadow g={g} cx={48} cy={88} rx={40} ry={12} />
      <Ellipse cx={46} cy={84} rx={36} ry={14} fill="#E4DACC" />
      <Ellipse cx={46} cy={82} rx={36} ry={14} fill={g('plateRim')} />
      <Ellipse cx={46} cy={82} rx={22} ry={8} fill="#EFE8DE" />
      {/* cup */}
      <Path d="M68 62 C78 60 80 74 66 76" stroke="#F4EEE6" strokeWidth={5} fill="none" strokeLinecap="round" />
      <Path d="M68 62 C78 60 80 74 66 76" stroke="#D9CEC0" strokeWidth={1} fill="none" />
      <Path d="M24 56 C24 74 32 84 46 84 C60 84 68 74 68 56 Z" fill={g('matWhite')} />
      <Ellipse cx={46} cy={56} rx={22} ry={8.5} fill="#FFFFFF" />
      <Ellipse cx={46} cy={57} rx={19} ry={7} fill={g('coffee')} />
      <Path d="M46 62.5 C40 59.5 39.5 56 42.6 55 C44.4 54.5 46 55.6 46 56.8 C46 55.6 47.6 54.5 49.4 55 C52.5 56 52 59.5 46 62.5 Z" fill="#F6E4CC" />
      <Path d="M30 60 C31 70 36 78 44 80" stroke="#FFFFFF" strokeOpacity={0.6} strokeWidth={2.4} fill="none" strokeLinecap="round" />
      {/* spoon */}
      <Path d="M62 88 L80 94" stroke="#B7B2AB" strokeWidth={2} strokeLinecap="round" />
      <Ellipse cx={59} cy={87} rx={3.5} ry={2} fill="#CFCAC3" transform="rotate(18 59 87)" />
      {/* croissant */}
      <G transform="translate(92 96) rotate(-14)">
        <Shadow g={g} cx={0} cy={7} rx={24} ry={5} />
        <Ellipse cx={-20} cy={3} rx={6} ry={4} fill="#C9782C" transform="rotate(35 -20 3)" />
        <Ellipse cx={20} cy={3} rx={6} ry={4} fill="#C9782C" transform="rotate(-35 20 3)" />
        <Ellipse cx={-12} cy={-1} rx={8.5} ry={8} fill={g('croissant')} transform="rotate(25 -12 -1)" />
        <Ellipse cx={12} cy={-1} rx={8.5} ry={8} fill={g('croissant')} transform="rotate(-25 12 -1)" />
        <Ellipse cx={0} cy={-3} rx={9.5} ry={10} fill={g('croissant')} />
        <Path d="M-5 -11 Q0 -3 -4 6 M5 -11 Q0 -3 4 6 M-16 -6 Q-11 0 -14 6 M16 -6 Q11 0 14 6" stroke="#A65A1C" strokeWidth={1.1} fill="none" />
        <Ellipse cx={-3} cy={-8} rx={4} ry={2} fill="#FFE2A6" opacity={0.7} />
      </G>
    </G>
  );
}

function Biryani({ g, id }) {
  const clip = `${id}rice`;
  return (
    <G>
      <Steam x={60} y={34} h={24} />
      <Shadow g={g} cx={62} cy={104} rx={46} ry={9} />
      {/* handi */}
      <Path d="M20 50 C8 70 20 104 60 104 C100 104 112 70 100 50 Z" fill={g('matCopper')} />
      <Path d="M24 62 C34 72 86 72 96 62" stroke="#F4B57A" strokeOpacity={0.5} strokeWidth={2} fill="none" />
      <Path d="M26 86 C30 96 44 100 52 100" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Ellipse cx={60} cy={50} rx={42} ry={15} fill="#F2B06E" />
      <Ellipse cx={60} cy={51} rx={38} ry={13} fill="#A9581F" />
      <Defs>
        <ClipPath id={clip}>
          <Ellipse cx={60} cy={51.5} rx={36} ry={12} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Ellipse cx={60} cy={52} rx={36} ry={12} fill={g('saffron')} />
        {scatter(130, 13).map((p, i) => {
          const x = 60 + p.x * 34;
          const y = 50 + p.y * 11;
          return (
            <Ellipse
              key={i}
              cx={x}
              cy={y}
              rx={2.1}
              ry={0.8}
              fill={p.pick < 0.45 ? '#FFFDF5' : p.pick < 0.7 ? '#FFF0C7' : p.pick < 0.88 ? '#F2A23A' : '#E07B22'}
              transform={`rotate(${p.rot} ${x} ${y})`}
            />
          );
        })}
      </G>
      {/* chicken leg, egg, onions, mint */}
      <Path d="M36 44 C30 40 32 30 40 30 C48 30 52 38 48 44 C45 48 40 48 36 44 Z" fill={g('chicken')} />
      <Path d="M48 36 L58 30" stroke="#F4E6D0" strokeWidth={3.4} strokeLinecap="round" />
      <Circle cx={59} cy={29.5} r={2.4} fill="#F4E6D0" />
      <Path d="M37 37 C39 34 43 33 46 35" stroke="#E0A060" strokeWidth={1.4} fill="none" strokeLinecap="round" />
      <Ellipse cx={76} cy={46} rx={9} ry={5.6} fill="#FFFFFF" />
      <Ellipse cx={76} cy={45.5} rx={4.6} ry={3.2} fill={g('yolk')} />
      <Ellipse cx={74.8} cy={44.6} rx={1.4} ry={0.8} fill="#FFF2B8" />
      {[
        [52, 52, 56, 49],
        [66, 54, 70, 52],
        [44, 54, 46, 51],
        [84, 52, 88, 54],
      ].map(([a, b, c, d], i) => (
        <Path key={i} d={`M${a} ${b} Q${(a + c) / 2 + 1.5} ${(b + d) / 2 - 2} ${c} ${d}`} stroke="#7A3C14" strokeWidth={1.6} fill="none" strokeLinecap="round" />
      ))}
      <Leaf x={58} y={48} s={0.9} rot={20} color="#2F8A36" />
      <Leaf x={64} y={44} s={0.8} rot={-40} color="#2F8A36" />
      <Leaf x={88} y={48} s={0.8} rot={30} color="#2F8A36" />
      <Path d="M70 56 L73 52 M50 57 L48 54" stroke="#E8461A" strokeWidth={0.9} strokeLinecap="round" />
    </G>
  );
}

// A sunset café window: what "where you are" looks like.
function Scene({ g, id }) {
  const clip = `${id}win`;
  return (
    <G>
      <Shadow g={g} cx={60} cy={108} rx={50} ry={6} />
      <Defs>
        <ClipPath id={clip}>
          <Rect x={10} y={10} width={100} height={98} rx={18} />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${clip})`}>
        <Rect x={10} y={10} width={100} height={98} fill={g('sky')} />
        <Circle cx={72} cy={58} r={22} fill="#FFE7A8" opacity={0.35} />
        <Circle cx={72} cy={58} r={12} fill="#FFF3CF" />
        {/* city */}
        <Path d="M10 74 L18 74 L18 62 L26 62 L26 70 L32 70 L32 56 L40 56 L40 72 L48 72 L48 66 L56 66 L56 76 L66 76 L66 60 L74 60 L74 74 L82 74 L82 64 L92 64 L92 72 L100 72 L100 58 L110 58 L110 86 L10 86 Z" fill="#7A3A5E" />
        {[
          [20, 65],
          [35, 60],
          [35, 66],
          [69, 64],
          [69, 70],
          [86, 68],
          [104, 62],
          [104, 70],
          [51, 70],
        ].map(([x, y], i) => (
          <Rect key={i} x={x} y={y} width={2.2} height={2.2} rx={0.4} fill="#FFD27A" />
        ))}
        {/* window frame */}
        <Rect x={10} y={10} width={100} height={78} fill="none" stroke="#FFF4E6" strokeWidth={4} />
        <Path d="M60 10 L60 88 M10 46 L110 46" stroke="#FFF4E6" strokeWidth={3} />
        {/* plant */}
        <Path d="M16 88 C12 70 20 62 26 58 M18 88 C22 74 30 72 34 70 M20 88 C16 78 10 76 8 74" stroke="#2F7A3A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <Ellipse cx={26} cy={58} rx={5} ry={2.4} fill="#3F9A43" transform="rotate(-40 26 58)" />
        <Ellipse cx={34} cy={70} rx={5} ry={2.4} fill="#3F9A43" transform="rotate(-20 34 70)" />
        <Ellipse cx={9} cy={74} rx={5} ry={2.4} fill="#3F9A43" transform="rotate(30 9 74)" />
        {/* table */}
        <Rect x={10} y={88} width={100} height={20} fill={g('wood')} />
        <Rect x={10} y={88} width={100} height={2.4} fill="#C98A5A" />
        {/* cup on the table */}
        <Ellipse cx={74} cy={98} rx={12} ry={3.4} fill="#5A2A16" opacity={0.35} />
        <Path d="M64 84 C64 94 68 98 74 98 C80 98 84 94 84 84 Z" fill={g('matWhite')} />
        <Ellipse cx={74} cy={84} rx={10} ry={3.4} fill="#FFFFFF" />
        <Ellipse cx={74} cy={84.6} rx={8.4} ry={2.6} fill={g('coffee')} />
        <Path d="M84 86 C90 86 90 93 83 93" stroke="#FFFFFF" strokeWidth={2.2} fill="none" />
        <Path d="M71 80 C69 77 73 75 71 72 M77 80 C75 77 79 75 77 72" stroke="#FFFFFF" strokeOpacity={0.8} strokeWidth={1.4} fill="none" strokeLinecap="round" />
        <Ellipse cx={42} cy={98} rx={13} ry={3.6} fill="#FFFFFF" />
        <Path d="M33 96 C36 91 46 90 50 95 Z" fill={g('croissant')} />
      </G>
      {['M18 26 L18 18 L26 18', 'M94 18 L102 18 L102 26', 'M18 92 L18 100 L26 100', 'M94 100 L102 100 L102 92'].map((d, i) => (
        <Path key={i} d={d} stroke="#FFFFFF" strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </G>
  );
}

function Noodles({ g, id }) {
  const heap = `${id}heap`;
  return (
    <G>
      <Steam x={54} y={44} h={20} o={0.55} />
      <Bowl g={g} id={id} cx={54} cy={66} rx={42} h={30} mat="white" fill={g('noodle')} band="#C8161D">
        {Array.from({ length: 10 }, (_, i) => (
          <Path
            key={i}
            d={`M${14} ${58 + i * 2.4} C${28} ${52 + i * 2.4} ${40} ${66 + i * 2.4} ${54} ${58 + i * 2.4} C${66} ${51 + i * 2.4} ${78} ${66 + i * 2.4} ${96} ${58 + i * 2.4}`}
            stroke={i % 2 ? '#F7D877' : '#EDBE4A'}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </Bowl>
      {/* a heap of noodles rising above the rim */}
      <Defs>
        <ClipPath id={heap}>
          <Path d="M22 64 C26 44 82 44 86 64 Z" />
        </ClipPath>
      </Defs>
      <G clipPath={`url(#${heap})`}>
        <Path d="M22 64 C26 44 82 44 86 64 Z" fill="#E9B84A" />
        {Array.from({ length: 9 }, (_, i) => (
          <Path
            key={i}
            d={`M${18} ${46 + i * 2.4} C${32} ${40 + i * 2.4} ${42} ${54 + i * 2.4} ${56} ${46 + i * 2.4} C${68} ${39 + i * 2.4} ${78} ${54 + i * 2.4} ${92} ${46 + i * 2.4}`}
            stroke={i % 2 ? '#F9E08E' : '#F0C65A'}
            strokeWidth={2.4}
            fill="none"
            strokeLinecap="round"
          />
        ))}
      </G>
      <Path d="M36 56 L46 52" stroke="#F07A2A" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M60 60 L70 55" stroke="#F07A2A" strokeWidth={2.4} strokeLinecap="round" />
      <Path d="M48 62 L54 56" stroke="#3E9441" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M68 50 L74 47" stroke="#D83A2A" strokeWidth={2.2} strokeLinecap="round" />
      {[
        [42, 50],
        [58, 54],
        [74, 60],
      ].map(([x, y], i) => (
        <Ellipse key={i} cx={x} cy={y} rx={2.4} ry={1.4} fill="none" stroke="#3E9441" strokeWidth={1.3} />
      ))}
      <Path d="M54 58 L106 22" stroke={g('chopstick')} strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M60 62 L112 30" stroke={g('chopstick')} strokeWidth={3.6} strokeLinecap="round" />
      {/* music notes */}
      <G transform="translate(96 30)">
        <Path d="M0 0 L0 -15 L11 -18 L11 -4" stroke="#C8161D" strokeWidth={2.6} fill="none" strokeLinejoin="round" />
        <Ellipse cx={-2.8} cy={0.4} rx={3.6} ry={2.8} fill="#C8161D" transform="rotate(-20 -2.8 0.4)" />
        <Ellipse cx={8.2} cy={-3.6} rx={3.6} ry={2.8} fill="#C8161D" transform="rotate(-20 8.2 -3.6)" />
      </G>
      <G transform="translate(80 18) rotate(-10)">
        <Path d="M0 0 L0 -11 Q5 -9 7 -5" stroke="#E8A93A" strokeWidth={2.2} fill="none" strokeLinecap="round" />
        <Ellipse cx={-2.4} cy={0.3} rx={3} ry={2.3} fill="#E8A93A" transform="rotate(-20 -2.4 0.3)" />
      </G>
      <Path d="M108 46 L110 42 L112 46 L116 48 L112 50 L110 54 L108 50 L104 48 Z" fill="#E8A93A" opacity={0.8} />
    </G>
  );
}

function Breakfast({ g }) {
  return (
    <G>
      <Plate g={g} cx={60} cy={78} rx={56} />
      {/* toast, lying on the plate */}
      <G transform="matrix(1 0 0 0.6 0 34)">
      <Path d="M66 70 C64 60 70 54 78 56 C82 50 94 50 96 58 C102 60 102 68 98 72 L94 94 L70 96 Z" fill="#B86A24" />
      <Path d="M69.5 71 C68 63 72 59 78 60 C82 55 92 55 93 61 C98 62 98 68 95 71 L92 91 L72 93 Z" fill={g('toast')} />
      <Rect x={76} y={70} width={10} height={7} rx={1.8} fill="#FFE38A" transform="rotate(-8 81 73)" />
      <Rect x={77} y={70.5} width={5} height={2} rx={1} fill="#FFF6CF" transform="rotate(-8 81 73)" />
      </G>
      {/* egg */}
      <Path d="M20 72 C18 62 32 56 42 60 C52 58 60 66 54 74 C52 82 30 84 22 80 C18 78 18 75 20 72 Z" fill="#FFFFFF" />
      <Path d="M24 79 C32 82 46 81 52 76" stroke="#E9E1D4" strokeWidth={1.2} fill="none" />
      <Ellipse cx={38} cy={69} rx={8.5} ry={6.5} fill={g('yolk')} />
      <Ellipse cx={35.5} cy={66.5} rx={3} ry={1.6} fill="#FFF1B8" />
      {/* avocado */}
      <Ellipse cx={40} cy={92} rx={15} ry={9} fill="#3F6B22" transform="rotate(-10 40 92)" />
      <Ellipse cx={40} cy={91.5} rx={13} ry={7.6} fill={g('avocado')} transform="rotate(-10 40 92)" />
      <Ellipse cx={38} cy={92} rx={5} ry={3.6} fill="#7A4A22" />
      <Ellipse cx={36.8} cy={91} rx={1.8} ry={1} fill="#C08A5A" />
      {/* tomatoes and herbs */}
      <Gloss cx={66} cy={98} r={4.4} fill="#E2412D" />
      <Gloss cx={74} cy={100} r={4} fill="#D9352A" />
      <Path d="M64 94 L66 95.5 L68 94 M72 96.5 L74 97.8 L76 96.5" stroke="#2F7D32" strokeWidth={1.1} fill="none" strokeLinecap="round" />
      <Leaf x={58} y={92} s={0.8} rot={20} />
      <Leaf x={56} y={86} s={0.6} rot={-30} />
    </G>
  );
}

const SPICES = [
  { fill: '#C3321E', light: '#E25A3C' }, // chilli
  { fill: '#E8A317', light: '#F7C750' }, // turmeric
  { fill: '#8A5A2E', light: '#B3824E', seeds: true }, // cumin
  { fill: '#B39552', light: '#D3BC80' }, // coriander
  { fill: '#2E211B', light: '#56443A', seeds: true }, // mustard
  { fill: '#6B3A1F', light: '#94603C' }, // garam masala
];

function Masala({ g, id }) {
  return (
    <G>
      <Shadow g={g} cx={61} cy={96} rx={56} ry={18} />
      {/* steel dabba with depth */}
      <Path d="M6 66 L6 76 C6 92 114 92 114 76 L114 66 Z" fill={g('matSteel')} />
      <Ellipse cx={60} cy={66} rx={54} ry={24} fill="#F2F1EF" />
      <Ellipse cx={60} cy={67} rx={50} ry={21.5} fill={g('steelWell')} />
      {SPICES.map((s, i) => {
        const a = (i / SPICES.length) * Math.PI * 2 - Math.PI / 2;
        const x = 60 + Math.cos(a) * 31;
        const y = 67 + Math.sin(a) * 12.5;
        return (
          <Bowl key={i} g={g} id={id} cx={x} cy={y} rx={11} h={5} mat="steel" fill={s.fill} shadow={false}>
            <Ellipse cx={x - 2} cy={y - 1} rx={6} ry={2} fill={s.light} opacity={0.8} />
            {scatter(s.seeds ? 12 : 6, 20 + i).map((p, j) =>
              s.seeds ? (
                <Ellipse key={j} cx={x + p.x * 8} cy={y + p.y * 3} rx={1.3} ry={0.55} fill={s.light} transform={`rotate(${p.rot} ${x + p.x * 8} ${y + p.y * 3})`} />
              ) : (
                <Circle key={j} cx={x + p.x * 8} cy={y + p.y * 3} r={0.6} fill={s.light} />
              )
            )}
          </Bowl>
        );
      })}
      <Bowl g={g} id={id} cx={60} cy={67} rx={11} h={5} mat="steel" fill="#E7E0C6" shadow={false}>
        {[
          [56, 66, 30],
          [62, 66, -20],
          [59, 68.5, 80],
        ].map(([x, y, r], i) => (
          <Ellipse key={i} cx={x} cy={y} rx={3.4} ry={1.6} fill="#7FA65A" stroke="#5E8A3E" strokeWidth={0.4} transform={`rotate(${r} ${x} ${y})`} />
        ))}
      </Bowl>
    </G>
  );
}

function Chai({ g }) {
  return (
    <G>
      <Plate g={g} cx={50} cy={84} rx={46} />
      {/* parathas, stacked */}
      {[8, 4, 0].map((dy, i) => (
        <G key={i}>
          <Ellipse cx={48} cy={80 + dy} rx={32} ry={13} fill="#B9702C" />
          <Ellipse cx={48} cy={78 + dy} rx={32} ry={13} fill={g('roti')} />
        </G>
      ))}
      {scatter(14, 31).map((p, i) => (
        <Ellipse key={i} cx={48 + p.x * 26} cy={78 + p.y * 9} rx={i % 4 ? 1.8 : 2.8} ry={i % 4 ? 1 : 1.5} fill="#9C5A22" opacity={0.7} />
      ))}
      {[0, 1, 2].map((i) => (
        <Path key={i} d={`M${24 + i * 3} ${74 + i * 3} C${36} ${70 + i * 3} ${56} ${72 + i * 3} ${70 - i * 3} ${78 + i * 3}`} stroke="#C27F34" strokeWidth={1.1} fill="none" strokeLinecap="round" opacity={0.6} />
      ))}
      <Path d="M42 70 L54 68 L56 75 L44 77 Z" fill="#FFE38A" />
      <Path d="M42 70 L54 68 L55 70.5 L43 72.5 Z" fill="#FFF3C4" />
      <Path d="M44 77 C44 81 48 82 50 80" stroke="#FFE38A" strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.85} />
      {/* kulhad of chai */}
      <Steam x={96} y={34} h={20} o={0.6} />
      <Shadow g={g} cx={97} cy={70} rx={16} ry={4.5} />
      <Path d="M83 40 L87 66 C88 70 106 70 107 66 L111 40 Z" fill={g('matClay')} />
      <Path d="M86 50 C92 53 102 53 108 50" stroke="#E9A47C" strokeOpacity={0.5} strokeWidth={1.4} fill="none" />
      <Ellipse cx={97} cy={40} rx={14} ry={5} fill="#D98E62" />
      <Ellipse cx={97} cy={40.5} rx={11.6} ry={3.8} fill={g('chai')} />
      <Ellipse cx={97} cy={40.5} rx={11.6} ry={3.8} fill="none" stroke="#EBD0AD" strokeWidth={1.2} strokeDasharray="3 2" />
    </G>
  );
}

function Rajma({ g, id }) {
  return (
    <G>
      <Plate g={g} cx={60} cy={80} rx={56} />
      <RiceMound g={g} cx={78} cy={88} w={24} h={16} seed={41} />
      <Leaf x={80} y={76} s={0.8} rot={30} />
      <Bowl g={g} id={id} cx={38} cy={70} rx={24} h={16} mat="white" fill={g('rajma')}>
        {scatter(18, 43).map((p, i) => {
          const x = 38 + p.x * 18;
          const y = 71 + p.y * 6;
          return (
            <G key={i} transform={`rotate(${p.rot} ${x} ${y})`}>
              <Ellipse cx={x} cy={y} rx={3} ry={1.9} fill="#4A1209" />
              <Ellipse cx={x - 0.8} cy={y - 0.6} rx={1.1} ry={0.5} fill="#C0604A" />
            </G>
          );
        })}
        <Path d="M30 69 C33 66 40 67 42 70" stroke="#FFF1DC" strokeWidth={1.8} fill="none" strokeLinecap="round" />
        <Leaf x={46} y={70} s={0.7} rot={20} />
      </Bowl>
      {/* lemon and onion */}
      <Path d="M30 98 L42 90 A13 13 0 0 1 40 106 Z" fill="#E9C834" />
      <Path d="M31.5 98 L41 92 A10 10 0 0 1 39.5 103 Z" fill="#FBE98E" />
      <Ellipse cx={52} cy={102} rx={5.5} ry={2.6} fill="none" stroke="#C77FA6" strokeWidth={1.6} />
      <Ellipse cx={58} cy={99} rx={4.4} ry={2.1} fill="none" stroke="#C77FA6" strokeWidth={1.4} />
      <Path d="M100 96 C104 92 108 90 112 90" stroke="#2F8A36" strokeWidth={2.4} strokeLinecap="round" />
    </G>
  );
}

function Samosa({ g, id }) {
  // A samosa standing on its base: lit front face, shaded side, crimped edge.
  const one = (x, y, s, flip = 1) => (
    <G transform={`translate(${x} ${y}) scale(${s * flip} ${s})`}>
      <Ellipse cx={2} cy={14} rx={22} ry={5} fill="#5A2A0E" opacity={0.22} />
      <Path d="M-2 -18 L-20 12 C-8 16 6 16 14 13 Z" fill={g('samosaFront')} />
      <Path d="M-2 -18 L14 13 C18 11 22 8 22 6 Z" fill={g('samosaSide')} />
      <Path d="M-20 12 C-8 16 6 16 14 13" stroke="#9C5A1E" strokeWidth={1.4} fill="none" strokeDasharray="2 1.6" />
      <Path d="M-2 -18 L14 13" stroke="#B5661F" strokeWidth={0.8} opacity={0.7} />
      {scatter(9, x + y).map((p, i) => (
        <Circle key={i} cx={-5 + p.x * 8} cy={2 + p.y * 7} r={0.8} fill="#C9782B" opacity={0.85} />
      ))}
      <Path d="M-6 -8 L-14 6" stroke="#FFE6B0" strokeWidth={1.4} strokeLinecap="round" opacity={0.7} />
    </G>
  );
  return (
    <G>
      <Plate g={g} cx={60} cy={82} rx={56} />
      {one(40, 70, 0.9)}
      {one(80, 68, 0.9, -1)}
      {one(60, 86, 1)}
      <Bowl g={g} id={id} cx={20} cy={92} rx={10} h={6} mat="steel" fill="#3E8A30" shadow={false}>
        <Ellipse cx={18} cy={91} rx={4} ry={1.4} fill="#6CB04E" />
      </Bowl>
      <Bowl g={g} id={id} cx={100} cy={92} rx={10} h={6} mat="steel" fill="#6E2814" shadow={false}>
        <Ellipse cx={98} cy={91} rx={4} ry={1.4} fill="#9C4423" />
      </Bowl>
      <Leaf x={34} y={96} s={0.8} rot={-20} color="#2F8A36" />
    </G>
  );
}

function ButterChicken({ g, id }) {
  return (
    <G>
      {/* naan leaning behind */}
      <G transform="translate(88 58) rotate(28)">
        <Shadow g={g} cx={2} cy={30} rx={18} ry={5} />
        <Path d="M0 -34 C18 -32 22 -6 20 14 C18 30 -18 30 -20 14 C-22 -6 -18 -32 0 -34 Z" fill={g('naan')} />
        {scatter(16, 51).map((p, i) => (
          <Ellipse key={i} cx={p.x * 15} cy={p.y * 24 - 4} rx={i % 3 ? 2 : 3.2} ry={i % 3 ? 1.3 : 2} fill={i % 3 ? '#B3702E' : '#6E3612'} opacity={0.8} />
        ))}
        <Path d="M-14 -10 C-10 -24 0 -28 6 -28" stroke="#FFF1C9" strokeOpacity={0.5} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Leaf x={-4} y={-6} s={0.7} rot={30} />
      </G>
      <Steam x={50} y={44} h={20} o={0.6} />
      <Bowl g={g} id={id} cx={50} cy={68} rx={38} h={26} mat="copper" fill={g('butter')}>
        {[
          [36, 66, 10],
          [56, 64, -20],
          [44, 74, 30],
          [64, 72, 0],
          [74, 64, 20],
        ].map(([x, y, r], i) => (
          <G key={i} transform={`rotate(${r} ${x} ${y})`}>
            <Path d={`M${x - 6} ${y} C${x - 5} ${y - 5} ${x + 5} ${y - 5} ${x + 6} ${y} C${x + 7} ${y + 4} ${x - 6} ${y + 5} ${x - 6} ${y} Z`} fill="#B9531F" />
            <Path d={`M${x - 3} ${y - 2} C${x - 1} ${y - 3.5} ${x + 2} ${y - 3.5} ${x + 3} ${y - 2}`} stroke="#E08A4E" strokeWidth={1.2} fill="none" strokeLinecap="round" />
          </G>
        ))}
        <Path d="M26 68 C36 62 52 64 50 70 C48 76 36 72 42 67" stroke="#FFF4E0" strokeWidth={2.4} fill="none" strokeLinecap="round" opacity={0.9} />
        <Leaf x={48} y={64} s={0.8} rot={20} />
        <Leaf x={66} y={68} s={0.8} rot={-40} />
        <Leaf x={34} y={72} s={0.7} rot={60} />
        <Rect x={54} y={58} width={8} height={6} rx={1.6} fill="#FFE28A" transform="rotate(12 58 61)" />
        <Ellipse cx={46} cy={60} rx={14} ry={2} fill="#FFFFFF" opacity={0.22} />
      </Bowl>
    </G>
  );
}

const ART = {
  thali: Thali,
  biryani: Biryani,
  burger: Burger,
  kadai: Kadai,
  coffee: Coffee,
  scene: Scene,
  noodles: Noodles,
  breakfast: Breakfast,
  masala: Masala,
  chai: Chai,
  rajma: Rajma,
  samosa: Samosa,
  butterChicken: ButterChicken,
};

function radial(id, a, b, { cx = '40%', cy = '35%', r = '70%' } = {}) {
  return (
    <RadialGradient key={id} id={id} cx={cx} cy={cy} r={r}>
      <Stop offset="0" stopColor={a} />
      <Stop offset="1" stopColor={b} />
    </RadialGradient>
  );
}

function linear(id, stops, vertical = false) {
  return (
    <LinearGradient key={id} id={id} x1="0" y1="0" x2={vertical ? '0' : '1'} y2={vertical ? '1' : '0'}>
      {stops.map(([offset, color], i) => (
        <Stop key={i} offset={offset} stopColor={color} />
      ))}
    </LinearGradient>
  );
}

export default function FoodArt({ name, size = 120, style }) {
  // Gradient ids must be unique on the page (the web build shares one document).
  const id = `fa${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const g = (n) => `url(#${id}${n})`;
  const Art = ART[name] ?? Thali;
  const d = (n) => `${id}${n}`;
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" style={style} aria-hidden>
      <Defs>
        <RadialGradient id={d('shadow')} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor="#3A1A0E" stopOpacity="0.32" />
          <Stop offset="0.6" stopColor="#3A1A0E" stopOpacity="0.14" />
          <Stop offset="1" stopColor="#3A1A0E" stopOpacity="0" />
        </RadialGradient>
        {linear(d('plateRim'), [['0', '#FFFFFF'], ['0.6', '#F6F1EA'], ['1', '#E4DACC']], true)}
        {radial(d('plateWell'), '#FFFFFF', '#EEE7DC', { cx: '45%', cy: '40%' })}
        {linear(d('steelRim'), [['0', '#FBFBFA'], ['0.55', '#DAD6D0'], ['1', '#B5AFA6']], true)}
        {radial(d('steelWell'), '#F7F6F4', '#CFCAC3', { cx: '45%', cy: '40%' })}
        {linear(d('matWhite'), [['0', '#FFFFFF'], ['0.55', '#F4EEE6'], ['1', '#D9CEC0']])}
        {linear(d('matSteel'), [['0', '#F4F3F1'], ['0.35', '#D5D1CB'], ['0.75', '#A9A39A'], ['1', '#8C867E']])}
        {linear(d('matCopper'), [['0', '#E9A564'], ['0.4', '#C8743A'], ['0.8', '#8E4218'], ['1', '#6E2E0E']])}
        {linear(d('matClay'), [['0', '#DB8C60'], ['0.5', '#B4572F'], ['1', '#7E3016']])}
        {linear(d('matBlack'), [['0', '#6A6361'], ['0.45', '#3A3433'], ['1', '#151212']])}
        {radial(d('dal'), '#F7C653', '#D4891C')}
        {radial(d('curry'), '#F3873A', '#B23A14')}
        {radial(d('butter'), '#F8A85A', '#CC531E')}
        {radial(d('raita'), '#FFFFFF', '#E9E3D6')}
        {radial(d('rajma'), '#A83C22', '#5A180E')}
        {radial(d('saffron'), '#F5B84A', '#FBE6B4', { cx: '50%', cy: '50%', r: '60%' })}
        {radial(d('rice'), '#FFFFFF', '#E9E1D0', { cx: '40%', cy: '30%' })}
        {radial(d('roti'), '#F6D394', '#D69A4E')}
        {radial(d('naan'), '#F6DCA0', '#D49A52')}
        {radial(d('coffee'), '#D9A472', '#7A4220', { cx: '50%', cy: '45%', r: '60%' })}
        {radial(d('chai'), '#D8A779', '#A86E40', { cx: '50%', cy: '45%' })}
        {radial(d('yolk'), '#FFD84E', '#F0920E')}
        {radial(d('avocado'), '#E6EE9A', '#9CC45A', { cx: '45%', cy: '45%' })}
        {radial(d('noodle'), '#F6D67A', '#D9A23A')}
        {radial(d('chicken'), '#D9874A', '#8A3A14')}
        {linear(d('toast'), [['0', '#F2C27A'], ['1', '#D9954A']], true)}
        {linear(d('croissant'), [['0', '#F7C46E'], ['0.6', '#DE8A34'], ['1', '#B4621E']], true)}
        {linear(d('bun'), [['0', '#F6B460'], ['0.7', '#D7782A'], ['1', '#B8601E']], true)}
        {linear(d('bunLow'), [['0', '#E9A252'], ['1', '#B8641F']], true)}
        {linear(d('patty'), [['0', '#7A3A1C'], ['0.5', '#55240E'], ['1', '#3A1608']], true)}
        {linear(d('cheese'), [['0', '#FFD24A'], ['1', '#F0A51A']], true)}
        {linear(d('lettuce'), [['0', '#8FD05A'], ['1', '#3F9A34']], true)}
        {linear(d('fry'), [['0', '#FFE27A'], ['1', '#F2B83A']])}
        {linear(d('carton'), [['0', '#E6372D'], ['0.6', '#C8161D'], ['1', '#9A0F15']])}
        {linear(d('samosaFront'), [['0', '#F6C875'], ['1', '#D98E3A']], true)}
        {linear(d('samosaSide'), [['0', '#D9893A'], ['1', '#A8601E']], true)}
        {linear(d('chopstick'), [['0', '#A06A38'], ['1', '#6E4422']])}
        {linear(d('wood'), [['0', '#A8673E'], ['1', '#6E3A1E']], true)}
        {linear(d('sky'), [['0', '#FFB98A'], ['0.55', '#FF8F78'], ['1', '#C8607A']], true)}
      </Defs>
      <Art g={g} id={id} />
    </Svg>
  );
}
