import { StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, LinearGradient, Stop, Pattern, Path, Circle, Rect, Mask } from 'react-native-svg';
import { colors } from '../lib/theme';

// The signature header: deep maroon with a warm glow in the top-right corner and
// a gold jaali (lattice) pattern that fades out towards the bottom.
export default function MaroonBand({ height, rounded = true, children, style }) {
  return (
    <View style={[styles.band, { height }, rounded && styles.rounded, style]}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="glow" cx="88%" cy="-10%" rx="120%" ry="90%" fx="88%" fy="-10%" gradientUnits="objectBoundingBox">
            <Stop offset="0" stopColor="#9A1F22" />
            <Stop offset="0.5" stopColor={colors.maroon} />
            <Stop offset="1" stopColor={colors.maroonDeep} />
          </RadialGradient>
          <Pattern id="jaali" width="36" height="36" patternUnits="userSpaceOnUse">
            <Path d="M18 3C25 11 25 11 33 18C25 25 25 25 18 33C11 25 11 25 3 18C11 11 11 11 18 3Z" fill="none" stroke={colors.gold} strokeWidth="1" />
            <Circle cx="18" cy="18" r="2.2" fill={colors.gold} />
            <Circle cx="0" cy="0" r="1.6" fill={colors.gold} />
            <Circle cx="36" cy="0" r="1.6" fill={colors.gold} />
            <Circle cx="0" cy="36" r="1.6" fill={colors.gold} />
            <Circle cx="36" cy="36" r="1.6" fill={colors.gold} />
          </Pattern>
          <LinearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="1" />
            <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.5" />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity="0" />
          </LinearGradient>
          <Mask id="fadeMask">
            <Rect width="100%" height="100%" fill="url(#fade)" />
          </Mask>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#glow)" />
        <Rect width="100%" height="100%" fill="url(#jaali)" opacity={0.16} mask="url(#fadeMask)" />
      </Svg>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  band: { position: 'absolute', left: 0, right: 0, top: 0, overflow: 'hidden', backgroundColor: colors.maroon },
  rounded: { borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
});
