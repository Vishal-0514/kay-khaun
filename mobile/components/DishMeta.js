import { StyleSheet, Text, View } from 'react-native';
import Icon from './Icon';
import { colors, fonts } from '../lib/theme';

// "₹249 · 22 min" with small icons, used on pick cards and rows.
export default function DishMeta({ price, eta, rating, color = colors.ink }) {
  return (
    <View style={styles.row}>
      <Text style={[styles.price, { color: colors.red }]}>₹{price}</Text>
      <View style={styles.item}>
        <Icon name="clock" size={14} color={colors.muted} />
        <Text style={[styles.text, { color }]}>{eta} min</Text>
      </View>
      {rating ? (
        <View style={styles.item}>
          <Icon name="star" size={13} color={colors.gold} />
          <Text style={[styles.text, { color }]}>{rating}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  price: { fontFamily: fonts.bold, fontSize: 14 },
  text: { fontFamily: fonts.semibold, fontSize: 14 },
});
