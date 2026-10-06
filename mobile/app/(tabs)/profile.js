import { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import Button from '../../components/Button';
import Icon, { DietMark } from '../../components/Icon';
import Animated from 'react-native-reanimated';
import { PressScale, appear, rise, riseUp } from '../../components/Motion';
import { api, errorMessage } from '../../lib/api';
import { signOut } from '../../lib/session';
import { notify } from '../../lib/notify';
import { useAuthStore } from '../../store/useAuthStore';
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

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const [saving, setSaving] = useState(false);
  const p = user?.preferences ?? {};
  const bandHeight = 200 + insets.top;
  const initial = (user?.name || 'K').trim().charAt(0).toUpperCase();

  async function toggleMemory(on) {
    setSaving(true);
    setUser({ ...user, memoryEnabled: on });
    try {
      const { data } = await api.patch('/profile', { memoryEnabled: on });
      setUser(data.user);
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
          <Text style={type.small}>{user?.memoryEnabled ? 'Picks use your saved preferences' : "Off. Picks ignore your saved taste"}</Text>
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
  signOut: { alignSelf: 'center', marginTop: space.lg, minHeight: 44, justifyContent: 'center' },
  signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.red, textDecorationLine: 'underline' },
});
