// Design tokens from the approved v5 "Rich classic" design (design/V5*.dc.html).

export const colors = {
  canvas: '#FFFBF4',
  surface: '#FFFFFF',
  soft: '#FBF3E6',
  ink: '#2B0F0B',
  body: '#4A3631',
  muted: '#6E5A52',
  hair: '#EFE4D3',
  red: '#C8161D',
  redSoft: '#FDECEA',
  maroon: '#5C0A0F',
  maroonDeep: '#3A0508',
  gold: '#E8A93A',
  goldSoft: '#FCF1DA',
  goldText: '#86560F',
  green: '#1E7A44',
  greenSoft: '#E7F4EC',
  cream: '#FFF4E6',
  creamMuted: '#F3D6C8',
  vegMark: '#1E8E3E',
  nonvegMark: '#8B3A1A',
};

export const fonts = {
  display: 'Baloo2_600SemiBold',
  displayBold: 'Baloo2_700Bold',
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
};

// 4px base: 4 / 8 / 12 / 16 / 24 / 32 / 48
export const space = { xs: 4, sm: 8, md: 12, base: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { button: 14, card: 20, cardLg: 28, sheet: 32, full: 999 };

export const type = {
  display: { fontFamily: fonts.display, fontSize: 28, lineHeight: 32 },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27 },
  head: { fontFamily: fonts.display, fontSize: 18, lineHeight: 23 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 24 },
  small: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.muted },
  label: { fontFamily: fonts.bold, fontSize: 12, lineHeight: 16, letterSpacing: 1, textTransform: 'uppercase', color: colors.goldText },
};

// The one shadow tier, plus a deeper one for cards that overlap a maroon band.
export const shadow = {
  card: { shadowColor: '#2B0F0B', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  lifted: { shadowColor: '#3A0508', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 16 }, elevation: 8 },
  red: { shadowColor: '#C8161D', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 8 }, elevation: 6 },
};
