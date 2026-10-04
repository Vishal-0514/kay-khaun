import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow } from '../lib/theme';

// variant: 'primary' (red), 'outline' (white with ink border), 'gold', 'link'
export default function Button({ title, onPress, variant = 'primary', icon, loading = false, disabled = false, style }) {
  const v = variants[variant];
  const off = disabled || loading;
  return (
    <Pressable
      role="button"
      aria-disabled={off}
      aria-busy={loading}
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [styles.base, v.box, off && styles.disabled, pressed && !off && styles.pressed, style]}
    >
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <View style={styles.row}>
          {icon}
          <Text style={[styles.label, v.text]}>{title}</Text>
        </View>
      )}
    </Pressable>
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
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.5 },
});
