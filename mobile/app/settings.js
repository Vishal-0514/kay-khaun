import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Animated from 'react-native-reanimated';
import { PressScale, appear, rise } from '../components/Motion';
import { api, errorMessage } from '../lib/api';
import { signOut } from '../lib/session';
import { confirm, notify } from '../lib/notify';
import { toast } from '../components/Toast';
import { useAuthStore } from '../store/useAuthStore';
import { useMeStore } from '../store/useMeStore';
import { readReminders } from '../lib/reminders';
import { useTips } from '../lib/tips';
import { versionLabel } from '../lib/version';
import { PAGES, openPage } from '../lib/pages';
import { colors, fonts, radius, shadow, space, type } from '../lib/theme';
import { LANGUAGES, t, useLang } from '../lib/i18n';
import { VOICES, VOICE_LANGUAGES, speak, stopSpeaking, useSpeaking, useVoiceSettings } from '../lib/speak';

// A row that opens another screen.
const SAMPLE = {
  en: "Hi! I'm Chatora. Tell me, what are you in the mood to eat today?",
  hi: 'नमस्ते! मैं चटोरा हूँ। बताइए, आज क्या खाने का मन है?',
};

// Chatora's voice: male or female, English or Hindi, and whether replies are read aloud.
function VoiceSettings({ lang }) {
  const settings = useVoiceSettings();
  const speaking = useSpeaking();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    settings.load();
    return stopSpeaking;
  }, []);
  if (!settings.available) return null;
  const language = settings.language ?? lang;
  const sampling = speaking === 'sample';

  function choose(patch) {
    stopSpeaking();
    settings.update(patch);
  }

  function sample() {
    if (sampling) return stopSpeaking();
    setFailed(false);
    speak(SAMPLE[language], 'sample').catch(() => setFailed(true));
  }

  const segment = (options, value, onPick, label) => (
    <View style={styles.langs} role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <PressScale key={o.id} role="radio" aria-checked={value === o.id} onPress={() => onPick(o.id)} style={[styles.lang, value === o.id && styles.langOn]}>
          <Text style={[styles.langText, value === o.id && styles.langTextOn]}>{o.id === 'hi' ? o.label : t(o.label)}</Text>
        </PressScale>
      ))}
    </View>
  );

  return (
    <>
      <Text style={[type.head, styles.section]} role="heading">{t("Chatora's voice")}</Text>
      <View style={styles.list}>
        <Animated.View entering={rise(0, 350)} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.redSoft }]}>
            <Icon name="speaker" size={18} color={colors.red} strokeWidth={1.9} />
          </View>
          <Text style={styles.rowLabel}>{t('Voice')}</Text>
          {segment(VOICES, settings.voice, (voice) => choose({ voice }), t('Voice'))}
        </Animated.View>
        <Animated.View entering={rise(1, 350)} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#E8EEF7' }]}>
            <Icon name="mic" size={18} color="#3A5A8C" strokeWidth={1.9} />
          </View>
          <Text style={styles.rowLabel}>{t('Speaks and listens in')}</Text>
          {segment(VOICE_LANGUAGES, language, (id) => choose({ language: id }), t('Speaks and listens in'))}
        </Animated.View>
        <Animated.View entering={rise(2, 350)} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: colors.goldSoft }]}>
            <Icon name="headset" size={18} color={colors.goldText} strokeWidth={1.9} />
          </View>
          <Text style={styles.rowLabel}>{t('Read replies aloud')}</Text>
          <Switch
            value={settings.readAloud}
            onValueChange={(readAloud) => choose({ readAloud })}
            trackColor={{ true: colors.green, false: '#C9B9A6' }}
            thumbColor="#FFFFFF"
            aria-label={t('Read replies aloud')}
          />
        </Animated.View>
      </View>
      <Pressable role="button" onPress={sample} hitSlop={8} style={styles.sample}>
        <Icon name={sampling ? 'stop' : 'play'} size={14} color={colors.red} />
        <Text style={styles.sampleText}>{sampling ? t('Stop') : t('Hear a sample')}</Text>
      </Pressable>
      <Text style={styles.voiceNote}>
        {failed
          ? t("Couldn't play Chatora's voice. Check your internet and try again.")
          : t('Tap "Tap to talk" on Home, or the voice button in Chat, to talk with Chatora. Replies are turned into speech by Google.')}
      </Text>
    </>
  );
}

// What Chatora calls you. Saved when you leave the box.
function NameRow({ user }) {
  const setUser = useAuthStore((s) => s.setUser);
  const [name, setName] = useState(user?.name ?? '');
  async function save() {
    const next = name.trim().slice(0, 40);
    if (next === (user?.name ?? '')) return;
    try {
      const { data } = await api.patch('/profile', { name: next });
      setUser(data.user);
      toast(t('Saved'), 'check');
    } catch (err) {
      setName(user?.name ?? '');
      notify(t("Couldn't save"), errorMessage(err));
    }
  }
  return (
    <Animated.View entering={rise(0, 350)} style={styles.row}>
      <View style={[styles.rowIcon, { backgroundColor: colors.goldSoft }]}>
        <Icon name="user" size={18} color={colors.goldText} strokeWidth={1.9} />
      </View>
      <Text style={styles.rowLabel}>{t('Your name')}</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        onBlur={save}
        onSubmitEditing={save}
        placeholder={t('Add your name')}
        placeholderTextColor={colors.muted}
        aria-label={t('Your name')}
        maxLength={40}
        returnKeyType="done"
        style={styles.nameInput}
      />
    </Animated.View>
  );
}

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

// Settings: account, language and voice, saved things, and the pages Apple and
// Google require (privacy, terms, delete account). Opens from the profile circle
// on Home. Kya Khaun keeps no taste profile: Chatora asks in the chat instead.
export default function Settings() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);
  const savedCount = useMeStore((s) => s.saved.length);
  const loadSaved = useMeStore((s) => s.loadSaved);
  const lang = useLang((s) => s.lang);
  const setLang = useLang((s) => s.setLang);
  const [reminderCount, setReminderCount] = useState(0);

  // Fresh numbers each time Settings opens, or when pulled down.
  const reload = useCallback(
    () =>
      Promise.all([loadSaved().catch(() => {}), readReminders().then((r) => setReminderCount(Object.values(r).filter((x) => x.on).length))]),
    [loadSaved]
  );
  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    await reload();
    setRefreshing(false);
  }

  // App Store and Play both require this inside the app. Everything goes, straight away.
  const [deleting, setDeleting] = useState(false);
  async function deleteAccount() {
    const yes = await confirm(
      t('Delete your account?'),
      t('Your account, chats, saved picks and history will be deleted for good. This can’t be undone.'),
      t('Delete')
    );
    if (!yes) return;
    setDeleting(true);
    try {
      await api.delete('/profile');
      await signOut();
      router.replace('/welcome');
      toast(t('Your account has been deleted'), 'check');
    } catch (err) {
      setDeleting(false);
      notify(t("Couldn't delete your account"), errorMessage(err));
    }
  }

  const bandHeight = 190 + insets.top;
  const initial = (user?.name || 'K').trim().charAt(0).toUpperCase();

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={{ paddingBottom: space.xxl * 2 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} tintColor={colors.gold} progressViewOffset={insets.top} />}
    >
      <MaroonBand height={bandHeight}>
        <View style={[styles.back, { marginTop: insets.top + space.sm }]}>
          <IconButton name="back" label={t('Back')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <Text style={styles.title} role="heading">{t('Settings')}</Text>
        </View>
        <View style={[styles.head, { marginTop: space.md }]}>
          <Animated.View entering={appear(0, 100)} style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </Animated.View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name} role="heading">
              {user?.name || t('Your profile')}
            </Text>
            <Text style={styles.sub}>{user?.isGuest ? t('Test account (skipped login)') : user?.phone ? `+91 ${user.phone}` : user?.email ?? t('Your food profile')}</Text>
          </View>
        </View>
      </MaroonBand>

      <Text style={[type.head, styles.section, { marginTop: bandHeight + space.base }]} role="heading">{t("Your food")}</Text>
      <View style={styles.list}>
        <NavRow n={0} icon="heart" tint="#FBE4EC" ink="#A92E5A" label={t("Saved")} value={savedCount ? t(savedCount === 1 ? '{n} pick' : '{n} picks', { n: savedCount }) : t('None yet')} onPress={() => router.push('/saved')} />
        <NavRow n={1} icon="trophy" tint={colors.goldSoft} ink={colors.goldText} label={t('My Kitchen')} value={t('Dishes you cooked')} onPress={() => router.push('/my-kitchen')} />
        <NavRow n={1} icon="clock" tint={colors.goldSoft} ink={colors.goldText} label={t("History")} value={t('Orders and saved days')} onPress={() => router.push('/history')} />
        <NavRow n={2} icon="moon" tint="#E8EEF7" ink="#3A5A8C" label={t("Meal reminders")} value={reminderCount ? t('{n} on', { n: reminderCount }) : t('Off')} onPress={() => router.push('/reminders')} />
        <NavRow n={3} icon="chat" tint={colors.redSoft} ink={colors.red} label={t('Recent chats')} value={t('Your chats with Chatora')} onPress={() => router.push('/chats')} />
      </View>

      <Text style={[type.head, styles.section]} role="heading">{t("Preferences")}</Text>
      <View style={styles.list}>
        <NameRow user={user} />
        <Animated.View entering={rise(0, 350)} style={styles.row}>
          <View style={[styles.rowIcon, { backgroundColor: '#E8EEF7' }]}>
            <Icon name="chat" size={18} color="#3A5A8C" strokeWidth={1.9} />
          </View>
          <Text style={styles.rowLabel}>{t('Language')}</Text>
          <View style={styles.langs} role="radiogroup" aria-label={t('Language')}>
            {LANGUAGES.map((l) => (
              <PressScale key={l.id} role="radio" aria-checked={lang === l.id} onPress={() => setLang(l.id)} style={[styles.lang, lang === l.id && styles.langOn]}>
                <Text style={[styles.langText, lang === l.id && styles.langTextOn]}>{l.label}</Text>
              </PressScale>
            ))}
          </View>
        </Animated.View>
        <NavRow n={0} icon="spark" tint={colors.goldSoft} ink={colors.goldText} label={t('Use AI')} value={user?.aiConsent ? t('On · Claude by Anthropic') : t('Off · basic mode')} onPress={() => router.push({ pathname: '/ai-consent', params: { from: 'profile' } })} />
      </View>

      <VoiceSettings lang={lang} />

      <Pressable
        onPress={() => {
          useTips.getState().reset();
          toast(t('Tips will show again'), 'check');
        }}
        hitSlop={8}
        role="button"
        style={styles.tipsAgain}
      >
        <Text style={styles.link}>{t('Show tips again')}</Text>
      </Pressable>

      <PressScale role="button" onPress={() => signOut().then(() => router.replace('/welcome'))} style={styles.signOut}>
        <Text style={styles.signOutText}>{user?.isGuest ? t('Leave test account') : t('Sign out')}</Text>
      </PressScale>

      <Text style={[type.head, styles.section]} role="heading">{t('About')}</Text>
      <View style={styles.list}>
        <NavRow n={0} icon="external" tint={colors.soft} ink={colors.muted} label={t('Privacy policy')} onPress={() => openPage(PAGES.privacy)} />
        <NavRow n={1} icon="external" tint={colors.soft} ink={colors.muted} label={t('Terms of use')} onPress={() => openPage(PAGES.terms)} />
        <NavRow n={2} icon="external" tint={colors.soft} ink={colors.muted} label={t('Help and support')} onPress={() => openPage(PAGES.support)} />
        <NavRow n={3} icon="spark" tint={colors.goldSoft} ink={colors.goldText} label={t("What's new")} value={versionLabel()} onPress={() => router.push('/whats-new')} />
      </View>
      <Text style={styles.independent}>{t('Kya Khaun is independent and not affiliated with Zomato, Swiggy or any restaurant.')}</Text>
      <Text style={styles.independent}>{t('Kya Khaun {version} · Karis Global Retail Private Limited', { version: versionLabel() })}</Text>

      <Pressable role="button" onPress={deleteAccount} disabled={deleting} hitSlop={8} style={styles.deleteBtn}>
        <Icon name="trash" size={16} color={colors.red} />
        <Text style={styles.deleteText}>{deleting ? t('Deleting…') : t('Delete my account')}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  independent: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, color: colors.muted, marginHorizontal: space.lg, marginTop: space.sm },
  deleteBtn: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, paddingHorizontal: space.base, marginTop: space.lg },
  deleteText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.red },
  tipsAgain: { alignSelf: 'center', marginTop: space.lg, minHeight: 32, justifyContent: 'center' },
  back: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.base },
  title: { fontFamily: fonts.display, fontSize: 22, color: colors.cream },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.base, paddingHorizontal: space.lg },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 28, lineHeight: 34, color: colors.maroon },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.cream },
  sub: { fontFamily: fonts.regular, fontSize: 14, color: colors.creamMuted },
  section: { marginHorizontal: space.lg, marginTop: space.lg },
  list: { marginHorizontal: space.lg, marginTop: space.xs },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: space.md, borderBottomWidth: 1, borderBottomColor: colors.hair },
  rowIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontFamily: fonts.regular, fontSize: 15, color: colors.ink, flex: 1 },
  nameInput: { flex: 1, textAlign: 'right', fontFamily: fonts.semibold, fontSize: 15, color: colors.ink, paddingVertical: 8 },
  rowValue: { fontFamily: fonts.regular, fontSize: 14, color: colors.muted, maxWidth: '50%', textAlign: 'right' },
  langs: { flexDirection: 'row', gap: 6 },
  lang: { height: 32, paddingHorizontal: 12, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, justifyContent: 'center' },
  langOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  langText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  langTextOn: { color: colors.gold },
  sample: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginHorizontal: space.lg, marginTop: space.md, minHeight: 32 },
  sampleText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.red },
  voiceNote: { ...type.small, marginHorizontal: space.lg, marginTop: space.xs },
  link: { fontFamily: fonts.semibold, fontSize: 13, color: colors.red, textDecorationLine: 'underline' },
  signOut: { alignSelf: 'center', marginTop: space.lg, minHeight: 44, justifyContent: 'center' },
  signOutText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.red, textDecorationLine: 'underline' },
});
