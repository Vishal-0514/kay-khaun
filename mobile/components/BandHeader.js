import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from './MaroonBand';
import IconButton from './IconButton';
import { colors, fonts, space } from '../lib/theme';

// Maroon jaali header with a back button, title and optional subtitle.
// Content below should start at `bandHeight - overlap` to sit over its edge.
export function useBandHeight(base) {
  return base + useSafeAreaInsets().top;
}

export default function BandHeader({ height, title, subtitle, onBack, right }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <MaroonBand height={height}>
      <View style={[styles.row, { marginTop: insets.top + space.base }]}>
        {onBack !== false ? <IconButton name="back" label="Back" onDark onPress={onBack ?? (() => router.back())} /> : <View />}
        {right}
      </View>
      <View style={styles.text}>
        <Text style={styles.title} role="heading">
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </MaroonBand>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  text: { paddingHorizontal: space.lg, marginTop: space.lg },
  title: { fontFamily: fonts.display, fontSize: 28, lineHeight: 33, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.creamMuted, marginTop: space.xs },
});
