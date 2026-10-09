import { StyleSheet } from 'react-native';
import { PressScale } from './Motion';
import Icon from './Icon';
import { toast } from './Toast';
import { useMeStore } from '../store/useMeStore';
import { errorMessage } from '../lib/api';
import { notify } from '../lib/notify';
import { colors, radius } from '../lib/theme';
import { t } from '../lib/i18n';
import { success, tap } from '../lib/haptics';

// ♡ save / unsave a pick. onDark for the maroon band; otherwise a 52px tile.
export default function HeartButton({ pick, onDark = false, size = onDark ? 44 : 52 }) {
  const saved = useMeStore((s) => s.saved.some((x) => x.id === pick?.id));
  const toggleSave = useMeStore((s) => s.toggleSave);

  async function press() {
    try {
      const now = await toggleSave(pick);
      if (now) success();
      else tap();
      toast(now ? t('Saved — find it in Profile → Saved') : t('Removed from Saved'), now ? 'heart' : 'check');
    } catch (err) {
      notify(t("Couldn't save"), errorMessage(err));
    }
  }

  const ink = onDark ? (saved ? colors.gold : colors.cream) : colors.red;
  return (
    <PressScale
      scaleTo={0.88}
      role="button"
      aria-label={saved ? t('Remove {name} from Saved', { name: pick?.name }) : t('Save {name}', { name: pick?.name })}
      aria-pressed={saved}
      onPress={press}
      hitSlop={4}
      style={[
        styles.base,
        { width: size, height: size, borderRadius: onDark ? size / 2 : radius.button },
        onDark ? styles.dark : styles.light,
        saved && (onDark ? styles.darkOn : styles.lightOn),
      ]}
    >
      <Icon name="heart" size={22} color={ink} fill={saved ? ink : 'none'} strokeWidth={saved ? 2.2 : 2} />
    </PressScale>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  light: { backgroundColor: colors.surface, borderColor: colors.hair },
  lightOn: { backgroundColor: colors.redSoft, borderColor: colors.redSoft },
  dark: { backgroundColor: 'rgba(255,255,255,0.12)', borderColor: 'rgba(255,255,255,0.2)' },
  darkOn: { backgroundColor: 'rgba(232,169,58,0.18)', borderColor: 'rgba(232,169,58,0.5)' },
});
