import { Pressable, StyleSheet } from 'react-native';
import Icon from './Icon';
import { colors } from '../lib/theme';

// 44px round button. onDark = translucent version for use on the maroon band.
export default function IconButton({ name, label, onPress, onDark = false }) {
  return (
    <Pressable
      role="button"
      aria-label={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.base, onDark ? styles.dark : styles.light, pressed && { opacity: 0.7 }]}
    >
      <Icon name={name} color={onDark ? colors.cream : colors.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  light: { backgroundColor: colors.surface, borderColor: colors.hair },
  dark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
});
