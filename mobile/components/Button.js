import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { PressScale, Sheen } from './Motion';
import { colors, fonts, radius, shadow } from '../lib/theme';

// variant: 'primary' (red), 'outline' (white with ink border), 'gold', 'link'
// sheen: a slow sweep of light across the button now and then (for the one main action on a screen).
export default function Button({ title, onPress, variant = 'primary', icon, loading = false, disabled = false, sheen = false, style }) {
  const v = variants[variant];
  const off = disabled || loading;
  return (
    <PressScale
      role="button"
      aria-disabled={off}
      aria-busy={loading}
      onPress={onPress}
      disabled={off}
      style={[styles.base, v.box, off && styles.disabled, style]}
    >
      {sheen && !off ? (
        <View pointerEvents="none" style={styles.sheenClip}>
          <Sheen />
        </View>
      ) : null}
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, v.text]}>{title}</Text>
        </View>
      )}
    </PressScale>
  );
}

const variants = {
  primary: { box: { backgroundColor: colors.red, ...shadow.red }, text: { color: '#FFFFFF' } },
  outline: { box: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink }, text: { color: colors.ink } },
  gold: { box: { backgroundColor: colors.gold }, text: { color: colors.maroon, fontFamily: fonts.bold } },
  link: { box: { height: 44, backgroundColor: 'transparent' }, text: { color: colors.ink, textDecorationLine: 'underline' } },
};

const styles = StyleSheet.create({
  base: { height: 52, borderRadius: radius.button, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { fontFamily: fonts.semibold, fontSize: 16 },
  disabled: { opacity: 0.5 },
  sheenClip: { ...StyleSheet.absoluteFillObject, borderRadius: radius.button, overflow: 'hidden' },
});
