import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon, { DietMark } from '../components/Icon';
import PlateRing from '../components/PlateRing';
import Button from '../components/Button';
import { useChatStore } from '../store/useChatStore';
import { notify } from '../lib/notify';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';

const MOOD_TITLE = { spicy: 'Spicy', comfort: 'Comfort', light: 'Light', street: 'Street', sweet: 'Sweet' };

function subtitleFor(source, slip) {
  if (source?.kind === 'mood') return `${MOOD_TITLE[source.label]} picks near you`;
  if (source?.kind === 'pick') return 'Based on your taste profile';
  if (!slip) return 'Order in';
  return [slip.craving, slip.budget && `under ₹${slip.budget}`, slip.time && `${slip.time} min`].filter(Boolean).join(' · ');
}

function Stat({ label, value }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

export default function Results() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const picks = useChatStore((s) => s.picks);
  const source = useChatStore((s) => s.picksSource);
  const slip = useChatStore((s) => s.conversation?.slip);
  const [saved, setSaved] = useState(false);
  const bandHeight = 236 + insets.top;
  const [top, ...rest] = picks;

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: insets.bottom + space.xl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label="Back" onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              Top {picks.length || 5} for you
            </Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitleFor(source, slip)}
            </Text>
          </View>
          <Pressable onPress={() => router.push('/chat')} hitSlop={8}>
            <Text style={styles.edit}>Edit</Text>
          </Pressable>
        </View>
        <View style={styles.segment}>
          <View style={[styles.segItem, styles.segOn]}>
            <Icon name="bag" size={16} color={colors.maroon} />
            <Text style={[styles.segText, { color: colors.maroon, fontFamily: fonts.bold }]}>Order in</Text>
          </View>
          <Pressable style={styles.segItem} onPress={() => notify('Cook at home', 'Recipes from your fridge arrive in the next update.')}>
            <Icon name="pot" size={16} color={colors.cream} />
            <Text style={styles.segText}>Cook at home</Text>
          </Pressable>
        </View>
      </MaroonBand>

      {!top ? (
        <View style={[styles.card, { marginTop: bandHeight - 84, alignItems: 'center' }]}>
          <Text style={type.head}>Nothing to show yet</Text>
          <Text style={[type.small, { marginTop: space.sm, textAlign: 'center' }]}>Tell Chatora what you feel like, and your picks will appear here.</Text>
          <Button title="Ask Chatora" onPress={() => router.replace('/chat')} style={{ marginTop: space.lg, alignSelf: 'stretch' }} />
        </View>
      ) : (
        <>
          <View style={[styles.card, { marginTop: bandHeight - 84 }]}>
            <View style={styles.topRow}>
              <PlateRing size={84} value={top.match / 100}>
                <Text style={styles.match}>{top.match}</Text>
                <Text style={styles.matchLabel}>% match</Text>
              </PlateRing>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.badge}>
                  <Icon name="spark" size={12} color={colors.gold} />
                  <Text style={styles.badgeText}>Chatora's pick</Text>
                </View>
                <View style={styles.nameRow}>
                  <DietMark type={top.diet === 'veg' ? 'veg' : 'nonveg'} />
                  <Text style={styles.name}>{top.name}</Text>
                </View>
                <Text style={type.small}>
                  {top.restaurant}, {top.area}
                </Text>
              </View>
            </View>
            <View style={styles.stats}>
              <Stat label="Price" value={`₹${top.price}`} />
              <Stat label="Arrives in" value={`${top.eta} min`} />
              <Stat label="Rating" value={`${top.rating} ★`} />
            </View>
            <Text style={styles.reason}>{top.reasons.map((r) => r.text).slice(0, 2).join('. ')}.</Text>
            <View style={styles.actions}>
              <Button title="Order now" onPress={() => router.push(`/dish/${top.id}`)} style={{ flex: 1 }} />
              <Pressable role="button" aria-label={saved ? 'Saved' : 'Save'} onPress={() => setSaved((v) => !v)} style={styles.heart}>
                <Icon name="heart" size={22} color={colors.red} strokeWidth={saved ? 2.6 : 2} />
              </Pressable>
            </View>
          </View>

          {rest.length ? (
            <>
              <Text style={[type.head, styles.also]}>Also good</Text>
              <View style={styles.list}>
                {rest.map((p, i) => (
                  <Pressable key={p.id} role="button" onPress={() => router.push(`/dish/${p.id}`)} style={styles.row}>
                    <View style={styles.rank}>
                      <Text style={styles.rankText}>{i + 2}</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={styles.nameRow}>
                        <DietMark type={p.diet === 'veg' ? 'veg' : 'nonveg'} />
                        <Text style={styles.rowName} numberOfLines={1}>
                          {p.name}
                        </Text>
                      </View>
                      <Text style={type.small} numberOfLines={1}>
                        {p.restaurant} · {p.eta} min
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={styles.rowPrice}>₹{p.price}</Text>
                      <Text style={styles.rowMatch}>{p.match}% match</Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg },
  title: { fontFamily: fonts.display, fontSize: 22, lineHeight: 27, color: colors.cream },
  subtitle: { fontFamily: fonts.regular, fontSize: 13, color: colors.creamMuted },
  edit: { fontFamily: fonts.semibold, fontSize: 14, color: colors.gold, textDecorationLine: 'underline' },
  segment: { flexDirection: 'row', gap: 4, marginHorizontal: space.lg, marginTop: space.base, height: 44, padding: 4, borderRadius: radius.full, backgroundColor: 'rgba(255,255,255,0.1)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  segItem: { flex: 1, borderRadius: radius.full, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  segOn: { backgroundColor: colors.gold },
  segText: { fontFamily: fonts.medium, fontSize: 14, color: colors.cream },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.cardLg, padding: 20, ...shadow.lifted },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: space.base },
  match: { fontFamily: fonts.display, fontSize: 28, lineHeight: 30, color: colors.ink },
  matchLabel: { fontFamily: fonts.semibold, fontSize: 10, color: colors.muted },
  badge: { alignSelf: 'flex-start', height: 24, paddingHorizontal: 10, borderRadius: radius.full, backgroundColor: colors.maroon, flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeText: { fontFamily: fonts.bold, fontSize: 12, color: colors.gold },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { ...type.head, color: colors.ink, flex: 1 },
  stats: { flexDirection: 'row', marginTop: space.base, paddingVertical: space.md, borderRadius: 14, backgroundColor: colors.soft },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statLabel: { fontFamily: fonts.regular, fontSize: 12, color: colors.muted },
  statValue: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  reason: { marginTop: space.md, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20, color: colors.body },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.base },
  heart: { width: 52, height: 52, borderRadius: radius.button, borderWidth: 1, borderColor: colors.hair, alignItems: 'center', justifyContent: 'center' },
  also: { marginHorizontal: space.lg, marginTop: space.lg },
  list: { marginHorizontal: 20, marginTop: space.xs },
  row: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.hair, paddingHorizontal: 4 },
  rank: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.goldSoft, alignItems: 'center', justifyContent: 'center' },
  rankText: { fontFamily: fonts.display, fontSize: 16, color: colors.goldText },
  rowName: { flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowPrice: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  rowMatch: { fontFamily: fonts.bold, fontSize: 12, color: colors.green },
});
