import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon, { DietMark } from '../components/Icon';
import Button from '../components/Button';
import HeartButton from '../components/HeartButton';
import DishMeta, { isPlace } from '../components/DishMeta';
import { PressScale, rise } from '../components/Motion';
import { useMeStore } from '../store/useMeStore';
import { errorMessage } from '../lib/api';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

export default function Saved() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const saved = useMeStore((s) => s.saved);
  const loadSaved = useMeStore((s) => s.loadSaved);
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const bandHeight = 130 + insets.top;

  function load() {
    setState('loading');
    loadSaved()
      .then(() => setState('ready'))
      .catch((err) => {
        setError(errorMessage(err));
        setState('error');
      });
  }
  useEffect(load, [loadSaved]);

  const header = (
    <MaroonBand height={bandHeight}>
      <View style={[styles.header, { marginTop: insets.top + space.base }]}>
        <IconButton name="back" label={t("Back")} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))} />
        <View style={{ flex: 1 }}>
          <Text style={styles.title} role="heading">
            {t("Saved")}
          </Text>
          <Text style={styles.subtitle}>{saved.length ? t(saved.length === 1 ? '{n} pick you loved' : '{n} picks you loved', { n: saved.length }) : t('Dishes and places you ♡')}</Text>
        </View>
      </View>
    </MaroonBand>
  );

  return (
    <View style={styles.root}>
      {header}
      {state === 'loading' && !saved.length ? (
        <ActivityIndicator color={colors.red} style={{ marginTop: bandHeight + space.xl }} />
      ) : state === 'error' && !saved.length ? (
        <View style={[styles.empty, { marginTop: bandHeight }]}>
          <Text style={type.head}>{t("Couldn't load your saved picks")}</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>{error}</Text>
          <Button title={t("Try again")} variant="outline" onPress={load} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        <FlatList
          style={{ marginTop: bandHeight }}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
          data={saved}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIcon}>
                <Icon name="heart" size={30} color={colors.red} />
              </View>
              <Text style={type.head}>{t("Nothing saved yet")}</Text>
              <Text style={[type.small, { textAlign: 'center' }]}>{t("Tap ♡ on any dish or place and it'll wait for you here.")}</Text>
              <Button title={t("Find something to eat")} onPress={() => router.replace('/home')} style={{ alignSelf: 'stretch', marginTop: space.sm }} />
            </View>
          }
          renderItem={({ item, index }) => (
            <Animated.View entering={rise(Math.min(index, 6))} style={styles.card}>
              <PressScale scaleTo={0.98} role="button" aria-label={t('Open {name}', { name: item.name })} onPress={() => router.push(`/dish/${item.id}`)} style={{ flex: 1, gap: 4 }}>
                <View style={styles.nameRow}>
                  {isPlace(item) || !item.diet ? null : <DietMark type={item.diet === 'veg' ? 'veg' : 'nonveg'} />}
                  <Text style={styles.name} numberOfLines={2}>
                    {item.name}
                  </Text>
                </View>
                <Text style={type.small} numberOfLines={1}>
                  {[item.restaurant, item.cuisine !== item.restaurant && item.cuisine].filter(Boolean).join(' · ')}
                </Text>
                {item.price != null || isPlace(item) ? <DishMeta pick={item} /> : null}
              </PressScale>
              <HeartButton pick={item} size={44} />
            </Animated.View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  list: { padding: space.base, gap: space.md, flexGrow: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, ...shadow.card },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink, flexShrink: 1 },
  empty: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
