import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { rise, riseUp } from '../components/Motion';
import { RELEASES, versionLabel } from '../lib/version';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

// "What's new": shown once after an update, and any time from Settings.
export default function WhatsNew() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [latest, ...older] = RELEASES;
  const bandHeight = 170 + insets.top;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 110 }}>
        <MaroonBand height={bandHeight}>
          <View style={[styles.header, { marginTop: insets.top + space.base }]}>
            <IconButton name="close" label={t('Close')} onDark onPress={close} />
          </View>
          <View style={styles.hero}>
            <Text style={styles.kicker}>{t("What's new in {version}", { version: latest.version })}</Text>
            <Text style={styles.title} role="heading">
              {t(latest.title)}
            </Text>
          </View>
        </MaroonBand>

        <Animated.View entering={riseUp(0, 150)} style={[styles.card, { marginTop: bandHeight - 32 }]}>
          {latest.items.map((item, i) => (
            <Animated.View key={item.text} entering={rise(i, 250)} style={styles.item}>
              <View style={styles.tile}>
                <Icon name={item.icon} size={18} color={colors.red} strokeWidth={1.9} />
              </View>
              <Text style={styles.itemText}>{t(item.text)}</Text>
            </Animated.View>
          ))}
        </Animated.View>

        {older.map((r) => (
          <View key={r.version} style={[styles.card, { marginTop: space.md }]}>
            <Text style={type.label}>{t('Version {version}', { version: r.version })}</Text>
            {r.items.map((item) => (
              <Text key={item.text} style={styles.olderText}>
                • {t(item.text)}
              </Text>
            ))}
          </View>
        ))}
        <Text style={styles.version}>{t('You have version {version}', { version: versionLabel() })}</Text>
      </ScrollView>
      <View style={[styles.bar, { paddingBottom: insets.bottom + space.md }]}>
        <Button title={t('Got it')} onPress={close} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', paddingHorizontal: space.lg },
  hero: { paddingHorizontal: space.lg, marginTop: space.base, gap: 4 },
  kicker: { fontFamily: fonts.bold, fontSize: 12, letterSpacing: 1, textTransform: 'uppercase', color: colors.gold },
  title: { fontFamily: fonts.display, fontSize: 26, lineHeight: 31, color: colors.cream },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, gap: space.md, ...shadow.card },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md },
  tile: { width: 36, height: 36, borderRadius: 12, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center' },
  itemText: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21, color: colors.ink, paddingTop: 6 },
  olderText: { ...type.small },
  version: { ...type.small, fontSize: 12, textAlign: 'center', marginTop: space.lg },
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: space.base, paddingTop: space.md, backgroundColor: colors.canvas, borderTopWidth: 1, borderTopColor: colors.hair },
});
