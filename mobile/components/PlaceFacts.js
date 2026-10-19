import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { travelText } from '../lib/directions';
import { colors, fonts, space } from '../lib/theme';
import { t } from '../lib/i18n';

// One line of facts for a place to go: "★ 4.6 · 12 min by car · 3.1 km · Open now".
export default function PlaceFacts({ place, light = false }) {
  const ink = light ? colors.cream : colors.ink;
  return (
    <View style={styles.facts}>
      {place.rating ? (
        <View style={styles.fact}>
          <Icon name="star" size={13} color={colors.gold} />
          <Text style={[styles.factText, { color: ink }]}>{place.rating.toFixed(1)}</Text>
        </View>
      ) : null}
      <View style={styles.fact}>
        <Icon name="route" size={13} color={light ? colors.creamMuted : colors.muted} />
        <Text style={[styles.factText, { color: ink }]}>{travelText(place)}</Text>
      </View>
      {place.travelMin ? <Text style={[styles.factText, { color: light ? colors.creamMuted : colors.muted }]}>{t('{n} km', { n: place.distanceKm })}</Text> : null}
      {place.openNow ? <Text style={[styles.open, light && { color: '#8FE0AE' }]}>{t('Open now')}</Text> : null}
    </View>
  );
}


const styles = StyleSheet.create({
  facts: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  factText: { fontFamily: fonts.semibold, fontSize: 13 },
  open: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
});
