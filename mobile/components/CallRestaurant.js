import { StyleSheet, Text } from 'react-native';
import { PressScale } from './Motion';
import Icon from './Icon';
import { callNumber } from '../lib/safeLink';
import { notify } from '../lib/notify';
import { tap } from '../lib/haptics';
import { colors, fonts, radius } from '../lib/theme';
import { t } from '../lib/i18n';

// "Call 022 2414 4422" under the Zomato and Swiggy buttons, for asking about
// the menu, ordering by phone, or booking a table. Hidden when Google has no number.
export default function CallRestaurant({ pick, style }) {
  if (!pick?.phone || !pick?.dial) return null;
  async function call() {
    tap();
    try {
      await callNumber(pick.dial);
    } catch {
      notify(t("Couldn't start the call"), t('The number is {phone}.', { phone: pick.phone }));
    }
  }
  return (
    <PressScale scaleTo={0.97} role="button" aria-label={t('Call {name} on {phone}', { name: pick.name, phone: pick.phone })} onPress={call} style={[styles.call, style]}>
      <Icon name="phoneCall" size={17} color={colors.green} />
      <Text style={styles.label}>{t('Call restaurant')}</Text>
      <Text style={styles.number} numberOfLines={1}>
        {pick.phone}
      </Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  call: { minHeight: 44, paddingHorizontal: 14, borderRadius: radius.button, borderWidth: 1, borderColor: '#CFE6D6', backgroundColor: colors.greenSoft, flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.green },
  number: { flex: 1, textAlign: 'right', fontFamily: fonts.bold, fontSize: 14, color: colors.ink, letterSpacing: 0.3 },
});
