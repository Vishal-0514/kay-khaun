import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import Button from '../../components/Button';
import Icon, { DietMark } from '../../components/Icon';
import Animated from 'react-native-reanimated';
import { PressScale, appear, rise, riseUp } from '../../components/Motion';
import { api, errorMessage } from '../../lib/api';
import { signOut } from '../../lib/session';
import { confirm, notify } from '../../lib/notify';
import { toast } from '../../components/Toast';
import { useAuthStore } from '../../store/useAuthStore';
import { useMeStore } from '../../store/useMeStore';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';

const SPICE = ['Mild', 'Light', 'Medium', 'Hot', 'Extra hot'];
const BUDGET = { low: 'Under ₹300', mid: '₹300–500', high: '₹500+' };
const DIET = { veg: 'Veg', nonveg: 'Non-veg', egg: 'Egg only' };

function Row({ n = 0, icon, tint, ink, label, value, lead }) {
  return (
    <Animated.View entering={rise(n, 350)} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: tint }]}>
        <Icon name={icon} size={18} color={ink} strokeWidth={1.9} />
      </View>
      <Text style={styles.rowLabel}>{label}</Text>
      {lead}
      <Text style={styles.rowValue} numberOfLines={1}>
        {value}
      </Text>
    </Animated.View>
  );
}

// A row that opens another screen.
function NavRow({ n = 0, icon, tint, ink, label, value, onPress }) {
  return (
    <Animated.View entering={rise(n, 350)}>
      <PressScale scaleTo={0.98} role="button" aria-label={label} onPress={onPress} style={styles.row}>
        <View style={[styles.rowIcon, { backgroundColor: tint }]}>
          <Icon name={icon} size={18} color={ink} strokeWidth={1.9} />
        </View>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>
          {value}
        </Text>
        <Icon name="chevron" size={16} color={colors.muted} />
      </PressScale>
    </Animated.View>
  );
}

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);
  const savedCount = useMeStore((s) => s.saved.length);
  const learned = useMeStore((s) => s.learned);
  const loadLearned = useMeStore((s) => s.loadLearned);
  const loadSaved = useMeStore((s) => s.loadSaved);
  const clearLearned = useMeStore((s) => s.clearLearned);
  const memoryOn = Boolean(user?.memoryEnabled);

  // Fresh numbers each time Profile opens.
  useFocusEffect(
    useCallback(() => {
      loadLearned().catch(() => {});
      loadSaved().catch(() => {});
    }, [loadLearned, loadSaved])
  );

  async function forget() {
    const yes = await confirm("Clear what I've learned?", 'I’ll forget what you opened, ordered and marked "Not for me". Your saved picks, saved days and taste settings stay.', 'Clear');
    if (!yes) return;
    try {
      await clearLearned();
      toast('Done — starting fresh');
    } catch (err) {
      notify("Couldn't clear it", errorMessage(err));
    }
  }
  const p = user?.preferences ?? {};
  const bandHeight = 200 + insets.top;
  const initial = (user?.name || 'K').trim().charAt(0).toUpperCase();

  async function toggleMemory(on) {
    setSaving(true);
    setUser({ ...user, memoryEnabled: on });
    try {
      const { data } = await api.patch('/profile', { memoryEnabled: on });
      setUser(data.user);
      loadLearned().catch(() => {});
    } catch (err) {
      setUser({ ...user, memoryEnabled: !on });
      notify("Couldn't save", errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={{ paddingBottom: space.xl }}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.head, { marginTop: insets.top + 28 }]}>
          <Animated.View entering={appear(0, 100)} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} role="heading">
              {user?.name || 'Your profile'}
            </Text>
            <Text style={styles.sub}>{user?.isGuest ? 'Test account (skipped login)' : user?.phone ? `+91 ${user.phone}` : user?.email ?? 'Your food profile'}</Text>
          </View>
        </View>
      </MaroonBand>

      <Animated.View entering={riseUp(0, 200)} style={[styles.card, styles.memory, { marginTop: bandHeight - 68 }]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.memoryTitle}>Remember my taste</Text>
          <Text style={type.small}>{memoryOn ? 'Learns from what you open, order and save' : 'Off. Picks ignore your taste, and nothing new is learned'}</Text>
        </View>
        <Switch
          value={Boolean(user?.memoryEnabled)}
          onValueChange={toggleMemory}
          disabled={saving}
          trackColor={{ true: colors.green, false: '#C9B9A6' }}
          thumbColor="#FFFFFF"
          aria-label="Remember my taste"
        />
      </Animated.View>

      <Text style={[type.head, styles.section]}>Your food</Text>
      <View style={styles.list}>
        <NavRow n={0} icon="heart" tint="#FBE4EC" ink="#A92E5A" label="Saved" value={savedCount ? `${savedCount} ${savedCount === 1 ? 'pick' : 'picks'}` : 'None yet'} onPress={() => router.push('/saved')} />
        <NavRow n={1} icon="clock" tint={colors.goldSoft} ink={colors.goldText} label="History" value="Orders and saved days" onPress={() => router.push('/history')} />
      </View>

      <Animated.View entering={rise(2, 350)} style={styles.learned}>
        <View style={styles.learnedHead}>
          <Icon name="spark" size={18} color={colors.goldText} />
          <Text style={styles.learnedTitle}>What I've learned</Text>
        </View>
        {!memoryOn ? (
          <Text style={type.small}>Turn on "Remember my taste" and I'll learn what you like from what you open, order and save.</Text>
        ) : learned?.cuisines?.length ? (
          <>
            <Text style={type.small}>You often go for</Text>
            <View style={styles.learnedChips}>
              {learned.cuisines.map((c) => (
                <View key={c.name} style={styles.learnedChip}>
                  <Text style={styles.learnedChipText}>{c.name}</Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <Text style={type.small}>Nothing yet. I learn from what you open, order, save and mark "Not for me".</Text>
        )}
        {memoryOn && learned?.signals ? (
          <>
            <Text style={styles.learnedFoot}>
              From {learned.signals} {learned.signals === 1 ? 'thing' : 'things'} you opened, ordered or saved
              {learned.notForMe ? ` · ${learned.notForMe} marked "Not for me"` : ''}.
            </Text>
            <Pressable onPress={forget} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
              <Text style={styles.learnedClear}>Clear what I've learned</Text>
            </Pressable>
          </>
        ) : null}
      </Animated.View>

      <Text style={[type.head, styles.section]}>Preferences</Text>
      <View style={styles.list}>
        <Row n={0} icon="leaf" tint="#E3F2E7" ink={colors.green} label="Diet" value={DIET[p.diet] ?? 'Not set'} lead={p.diet && p.diet !== 'egg' ? <DietMark type={p.diet} /> : null} />
        <Row n={1} icon="flame" tint="#FDE3E1" ink={colors.red} label="Spice level" value={SPICE[(p.spice ?? 3) - 1]} />
        <Row n={2} icon="rupee" tint="#FCEBD0" ink="#A8670F" label="Budget per meal" value={BUDGET[p.budget] ?? 'Not set'} />
        <Row n={3} icon="bowl" tint="#FDE8D6" ink="#B8501A" label="Favourites" value={p.cuisines?.length ? p.cuisines.join(', ') : 'None yet'} />
        <Row n={4} icon="close" tint="#FBE4EC" ink="#A92E5A" label="Avoid" value={p.avoid?.length ? p.avoid.join(', ') : 'Nothing'} />
      </View>
      <Button variant="outline" title="Edit my taste" onPress={() => router.push('/taste')} style={styles.edit} />

      <PressScale role="button" onPress={() => signOut().then(() => router.replace('/welcome'))} style={styles.signOut}>
        <Text style={styles.signOutText}>{user?.isGuest ? 'Leave test account' : 'Sign out'}</Text>
      </PressScale>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.base, paddingHorizontal: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, color: colors.maroon },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.cream },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.creamMuted },
  card: { marginHorizontal: space.base, backgroundColor: colors.surface, borderRadius: radius.card, ...shadow.lifted },
  memory: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.base, paddingLeft: 20 },
  memoryTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  section: { marginHorizontal: space.lg, marginTop: space.lg },
  list: { marginHorizontal: space.lg, marginTop: space.xs },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, flex: 1 },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, maxWidth: '50%', textAlign: 'right' },
  edit: { marginHorizontal: space.lg, marginTop: space.lg },
  learned: { marginHorizontal: space.lg, marginTop: space.base, padding: space.base, borderRadius: radius.card, backgroundColor: colors.goldSoft, gap: space.sm },
  learnedHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  learnedTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  learnedChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  learnedChip: { height: 32, paddingHorizontal: 12, borderRadius: radius.full, backgroundColor: colors.surface, justifyContent: 'center' },
  learnedChipText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.goldText },
  learnedFoot: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 17, color: colors.goldText },
  learnedClear: { fontFamily: fonts.semibold, fontSize: 13, color: colors.red, textDecorationLine: 'underline' },
  signOut: { alignSelf: 'center', marginTop: space.lg, minHeight: 44, justifyContent: 'center' },
  signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.red, textDecorationLine: 'underline' },
});
