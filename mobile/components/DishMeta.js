import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fonts } from '../lib/theme';
import { t } from '../lib/i18n';

// One line of facts under a pick.
//   Real nearby place: "★ 4.5 · 1.2 km · ₹100–300"
//   Sample dish:       "₹249 · 22 min"
export const isPlace = (pick) => pick?.source === 'places';
export const shortPrice = (label) => label?.replace(/^About /, '').replace(/ for one$/, '') ?? null;

export default function DishMeta({ pick, price, eta, rating, color = colors.ink }) {
  if (isPlace(pick)) {
    return (
      <View style={styles.row}>
        {pick.rating ? (
          <View style={styles.item}>
            <Icon name="star" size={13} color={colors.gold} />
            <Text style={[styles.text, { color }]}>{pick.rating.toFixed(1)}</Text>
          </View>
        ) : null}
        <View style={styles.item}>
          <Icon name="pin" size={13} color={colors.muted} />
          <Text style={[styles.text, { color }]}>{t('{n} km', { n: pick.distanceKm })}</Text>
        </View>
        {pick.priceLabel ? <Text style={[styles.price, { color: colors.red }]}>{shortPrice(pick.priceLabel)}</Text> : null}
      </View>
    );
  }
  const p = pick ?? { price, eta, rating };
  return (
    <View style={styles.row}>
      {p.source === 'sample' ? <SampleTag /> : null}
      <Text style={[styles.price, { color: colors.red }]}>
        ₹{p.price}
        {p.people > 1 ? <Text style={styles.group}> · {t('₹{price} for {n}', { price: p.groupPrice, n: p.people })}</Text> : null}
      </Text>
      <View style={styles.item}>
        <Icon name="clock" size={14} color={colors.muted} />
        <Text style={[styles.text, { color }]}>{t('{n} min', { n: p.eta })}</Text>
      </View>
      {p.rating ? (
        <View style={styles.item}>
          <Icon name="star" size={13} color={colors.gold} />
          <Text style={[styles.text, { color }]}>{p.rating}</Text>
        </View>
      ) : null}
    </View>
  );
}

// Sample dishes show how picks work; they aren't real restaurants yet.
export function SampleTag() {
  return (
    <View style={styles.sample} aria-label={t('Sample dish, not a real restaurant')}>
      <Text style={styles.sampleText}>{t('Sample')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sample: { paddingHorizontal: 6, height: 18, borderRadius: 5, backgroundColor: colors.soft, borderWidth: 1, borderColor: colors.hair, justifyContent: 'center' },
  sampleText: { fontFamily: fonts.bold, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontFamily: fonts.bold, fontSize: 14 },
  text: { fontFamily: fonts.semibold, fontSize: 14 },
  group: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
});
