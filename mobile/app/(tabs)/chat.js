import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaroonBand from '../../components/MaroonBand';
import IconButton from '../../components/IconButton';
import Icon from '../../components/Icon';
import DishMeta from '../../components/DishMeta';
import PlateRing from '../../components/PlateRing';
import VoiceBars from '../../components/VoiceBars';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { PressScale, TypingDots, fromRight, rise } from '../../components/Motion';
import { useChatStore } from '../../store/useChatStore';
import { errorMessage } from '../../lib/api';
import { notify } from '../../lib/notify';
import { useVoice, voiceUnavailableReason } from '../../lib/voice';
import { colors, fonts, radius, shadow, space, type } from '../../lib/theme';

const SUGGESTIONS = ['Something spicy under ₹400, quick', 'Light veg dinner', 'Biryani around ₹350', 'Something sweet'];
const DIET = { veg: 'Veg', nonveg: 'Non-veg', egg: 'Egg' };
const BRANCHES = ['order', 'cook'];

function Avatar() {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>K</Text>
    </View>
  );
}

// The "order slip": what Chatora has understood so far, ticked off line by line.
function OrderSlip({ slip }) {
  const rows = [
    ['Craving', slip.craving],
    ['Diet', DIET[slip.diet]],
    ['Budget', slip.budget && slip.branch !== 'cook' ?`${slip.budgetFromProfile ? 'About' : 'Under'} ₹${slip.budget}` : null],
    ['Time', slip.time ? `${slip.time} min` : null],
    ['Kitchen', slip.ingredients?.length ? slip.ingredients.slice(0, 3).join(', ') + (slip.ingredients.length > 3 ? ` +${slip.ingredients.length - 3}` : '') : null],
  ].filter(([, v]) => v);
  return (
    <View style={styles.slip}>
      <View style={[styles.notch, { left: -10 }]} />
      <View style={[styles.notch, { right: -10 }]} />
      <Text style={styles.slipTitle}>Order slip</Text>
      {rows.map(([k, v]) => (
        <View key={k} style={styles.slipRow}>
          <Text style={styles.slipKey}>{k}</Text>
          <View style={styles.slipValueRow}>
            <Text style={styles.slipValue}>{v}</Text>
            <View style={styles.tick}>
              <Icon name="check" size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
          </View>
        </View>
      ))}
      <View style={[styles.slipRow, { borderBottomWidth: 0 }]}>
        <Text style={styles.slipKey}>Order or cook?</Text>
        <View style={styles.slipValueRow}>
          <Text style={[styles.slipValue, { color: slip.branch ? colors.ink : colors.red }]}>
            {slip.branch === 'order' ? 'Order in' : slip.branch === 'cook' ? 'Cook at home' : 'Asking'}
          </Text>
          {slip.branch ? (
            <View style={styles.tick}>
              <Icon name="check" size={11} color="#FFFFFF" strokeWidth={3} />
            </View>
          ) : (
            <View style={styles.askingDot} />
          )}
        </View>
      </View>
    </View>
  );
}

export default function Chat() {
  const router = useRouter();
  const { focus, voice } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const listRef = useRef(null);
  const inputRef = useRef(null);
  const conversation = useChatStore((s) => s.conversation);
  const sending = useChatStore((s) => s.sending);
  const send = useChatStore((s) => s.send);
  const newChat = useChatStore((s) => s.newChat);
  const [text, setText] = useState('');
  const [hint, setHint] = useState(null);
  // Speak a craving: the live words show in the bar, and it sends when you stop.
  const talk = useVoice({
    onFinal: (said) => submit(said),
    onError: (message) => setHint(message),
  });

  const messages = conversation?.messages ?? [];
  const lastAi = [...messages].reverse().find((m) => m.role === 'ai');

  useEffect(() => {
    if (focus) setTimeout(() => inputRef.current?.focus(), 300);
  }, [focus]);

  // Home's "Tap to talk" opens the chat already listening.
  useEffect(() => {
    if (voice) setTimeout(listen, 350);
  }, [voice]);

  useEffect(() => {
    if (!hint) return undefined;
    const t = setTimeout(() => setHint(null), 5000);
    return () => clearTimeout(t);
  }, [hint]);

  function listen() {
    if (sending) return;
    const unavailable = voiceUnavailableReason();
    if (unavailable) {
      setHint(unavailable);
      inputRef.current?.focus();
      return;
    }
    setHint(null);
    inputRef.current?.blur();
    talk.start();
  }

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length, sending]);

  async function submit(value) {
    const t = (value ?? text).trim();
    if (!t || sending) return;
    setText('');
    try {
      await send(t);
    } catch (err) {
      setText(t);
      notify("Couldn't send", errorMessage(err));
    }
  }

  function renderItem({ item }) {
    if (item.role === 'user') {
      return (
        <Animated.View entering={fromRight()} style={[styles.userBubble, item.pending && { opacity: 0.7 }]}>
          <Text style={styles.userText}>{item.text}</Text>
        </Animated.View>
      );
    }
    const isLatest = item.id === lastAi?.id;
    return (
      <Animated.View entering={rise(0)} style={styles.aiRow}>
        <Avatar />
        <View style={styles.aiBody}>
          <Text style={item.kind === 'question' && isLatest ? styles.aiQuestion : styles.aiText}>{item.text}</Text>
          {item.kind === 'question' && isLatest && conversation?.slip ? <OrderSlip slip={conversation.slip} /> : null}
          {item.kind === 'picks' && item.picks?.length ? (
            <PressScale scaleTo={0.97} role="button" style={styles.pickCard} onPress={() => router.push('/results')}>
              <View style={styles.pickBadge}>
                <Text style={styles.pickBadgeText}>{item.picks[0].match}%</Text>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pickName} numberOfLines={1}>
                  {item.picks[0].name}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  {item.picks[0].restaurant}
                </Text>
                <DishMeta pick={item.picks[0]} />
              </View>
              <View style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all {item.picks.length}</Text>
                <Icon name="chevron" size={16} color={colors.red} />
              </View>
            </PressScale>
          ) : null}
          {item.kind === 'recipes' && item.recipes?.length ? (
            <PressScale scaleTo={0.97} role="button" style={styles.pickCard} onPress={() => router.push('/recipes')}>
              <PlateRing size={52} value={item.recipes[0].have / item.recipes[0].total}>
                <Text style={styles.ringText}>
                  {item.recipes[0].have}/{item.recipes[0].total}
                </Text>
              </PlateRing>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.pickName} numberOfLines={1}>
                  {item.recipes[0].name}
                </Text>
                <Text style={type.small} numberOfLines={1}>
                  {item.recipes[0].time} min · {item.recipes[0].level}
                </Text>
              </View>
              <View style={styles.seeAll}>
                <Text style={styles.seeAllText}>See all {item.recipes.length}</Text>
                <Icon name="chevron" size={16} color={colors.red} />
              </View>
            </PressScale>
          ) : null}
          {isLatest && item.options?.some((o) => !BRANCHES.includes(o.id)) ? (
            <View style={styles.pills}>
              {item.options
                .filter((o) => !BRANCHES.includes(o.id))
                .concat(item.options.filter((o) => BRANCHES.includes(o.id)))
                .map((o) => (
                  <PressScale
                    key={o.id}
                    role="button"
                    disabled={sending}
                    onPress={() => (o.id === 'scan' ? router.push({ pathname: '/kitchen', params: { from: 'chat' } }) : submit(o.label))}
                    style={[styles.pill, o.id === 'scan' && styles.pillMain]}
                  >
                    <Icon name={o.id === 'scan' ? 'camera' : o.id === 'order' ? 'bag' : 'pot'} size={18} color={o.id === 'scan' ? '#FFFFFF' : colors.ink} />
                    <Text style={[styles.pillText, o.id === 'scan' && { color: '#FFFFFF' }]}>{o.id === 'scan' ? 'Scan or pick ingredients' : o.label}</Text>
                  </PressScale>
                ))}
            </View>
          ) : isLatest && item.options?.length ? (
            <View style={styles.choices}>
              {item.options.map((o, i) => (
                <Animated.View key={o.id} entering={rise(i, 250)} style={{ flex: 1 }}>
                <PressScale scaleTo={0.95} role="button" disabled={sending} onPress={() => submit(o.label)} style={styles.choice}>
                  <View style={[styles.choiceIcon, { backgroundColor: o.id === 'order' ? colors.redSoft : colors.goldSoft }]}>
                    <Icon name={o.id === 'order' ? 'bag' : 'pot'} size={24} color={o.id === 'order' ? colors.red : colors.goldText} />
                  </View>
                  <Text style={styles.choiceTitle}>{o.label}</Text>
                  <Text style={styles.choiceSub}>{o.id === 'order' ? 'Delivered in ~25 min' : 'From your fridge'}</Text>
                </PressScale>
                </Animated.View>
              ))}
            </View>
          ) : null}
        </View>
      </Animated.View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MaroonBand height={92 + insets.top}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label="Back" onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/home'))} />
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.headerTitle}>Chatora</Text>
            <View style={styles.statusRow}>
              <View style={styles.statusDot} />
              <Text style={styles.status}>Your food guide</Text>
            </View>
          </View>
          <IconButton name="plus" label="New chat" onDark onPress={newChat} />
        </View>
      </MaroonBand>

      <FlatList
        ref={listRef}
        style={{ marginTop: 92 + insets.top }}
        contentContainerStyle={styles.list}
        data={messages}
        keyExtractor={(m) => String(m.id)}
        renderItem={renderItem}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.aiRow}>
              <Avatar />
              <View style={styles.aiBody}>
                <Text style={styles.aiQuestion}>Hi! What are you in the mood for?</Text>
                <Text style={styles.aiText}>Tell me a craving, a budget or how quickly you need it. Any language is fine.</Text>
              </View>
            </View>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s, i) => (
                <Animated.View key={s} entering={rise(i, 200)}>
                  <PressScale role="button" onPress={() => submit(s)} style={styles.suggestion}>
                    <Text style={styles.suggestionText}>{s}</Text>
                  </PressScale>
                </Animated.View>
              ))}
            </View>
          </View>
        }
        ListFooterComponent={
          sending ? (
            <Animated.View entering={rise(0)} style={styles.aiRow}>
              <Avatar />
              <View style={styles.typing} aria-label="Chatora is thinking">
                <TypingDots color={colors.red} />
              </View>
            </Animated.View>
          ) : null
        }
      />

      {hint ? (
        <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(200)} style={styles.hint}>
          <Icon name="mic" size={16} color={colors.goldText} />
          <Text style={styles.hintText}>{hint}</Text>
        </Animated.View>
      ) : null}

      {talk.listening ? (
        <Animated.View key="listening" entering={FadeIn.duration(220)} style={[styles.inputBar, styles.listenBar, { marginBottom: space.md }]}>
          <PressScale scaleTo={0.88} role="button" aria-label="Cancel" onPress={talk.cancel} style={styles.cancelBtn}>
            <Icon name="close" size={18} color={colors.muted} />
          </PressScale>
          <Text style={[styles.heard, !talk.heard && styles.heardWaiting]} numberOfLines={2} aria-live="polite">
            {talk.heard || 'Listening… bolo, kya khaane ka mood hai?'}
          </Text>
          <PressScale scaleTo={0.88} role="button" aria-label="Done speaking" onPress={talk.stop} style={styles.sendBtn}>
            <VoiceBars level={talk.level} color="#FFFFFF" height={22} />
          </PressScale>
        </Animated.View>
      ) : (
      <View style={[styles.inputBar, { marginBottom: space.md }]}>
        <TextInput
          ref={inputRef}
          value={text}
          onChangeText={setText}
          placeholder='Try "kuch teekha, 400 ke andar"'
          placeholderTextColor="#B3A196"
          style={styles.input}
          aria-label="Message Chatora"
          returnKeyType="send"
          onSubmitEditing={() => submit()}
          maxLength={500}
        />
        {text.trim() ? (
          <Animated.View key="send" entering={FadeIn.duration(220)}>
            <PressScale scaleTo={0.88} role="button" aria-label="Send" onPress={() => submit()} disabled={sending} style={styles.sendBtn}>
              <Icon name="send" size={20} color="#FFFFFF" />
            </PressScale>
          </Animated.View>
        ) : (
          <Animated.View key="mic" entering={FadeIn.duration(220)}>
            <PressScale scaleTo={0.88} role="button" aria-label="Speak" onPress={listen} disabled={sending} style={styles.sendBtn}>
              <Icon name="mic" size={22} color="#FFFFFF" />
            </PressScale>
          </Animated.View>
        )}
      </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.canvas },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: space.lg },
  headerTitle: { fontFamily: fonts.display, fontSize: 19, color: colors.cream },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#5FD08A' },
  status: { fontFamily: fonts.semibold, fontSize: 12, color: colors.gold },
  list: { padding: space.lg, gap: space.base, flexGrow: 1 },
  userBubble: { alignSelf: 'flex-end', maxWidth: '82%', backgroundColor: colors.ink, borderRadius: 20, borderBottomRightRadius: 4, paddingHorizontal: space.base, paddingVertical: space.md },
  userText: { ...type.body, color: '#FFFFFF' },
  aiRow: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.maroon, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: fonts.displayBold, fontSize: 14, lineHeight: 18, color: colors.gold },
  aiBody: { flex: 1, gap: space.md },
  aiText: { ...type.body, color: colors.ink },
  aiQuestion: { ...type.head, color: colors.ink },
  slip: { backgroundColor: colors.goldSoft, borderRadius: 16, paddingHorizontal: space.base, paddingTop: space.md, paddingBottom: space.sm },
  notch: { position: 'absolute', top: '50%', width: 20, height: 20, marginTop: -10, borderRadius: 10, backgroundColor: colors.canvas },
  slipTitle: { ...type.label, marginBottom: space.xs },
  slipRow: { minHeight: 36, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: '#E7D3AE' },
  slipKey: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted },
  slipValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  slipValue: { fontFamily: fonts.semibold, fontSize: 14, color: colors.ink, flexShrink: 1, textAlign: 'right' },
  tick: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.green, alignItems: 'center', justifyContent: 'center' },
  askingDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.red, margin: 5 },
  choices: { flexDirection: 'row', gap: space.md },
  choice: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.base, gap: space.md, ...shadow.card },
  choiceIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  choiceTitle: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  choiceSub: { fontFamily: fonts.regular, fontSize: 13, color: colors.muted, marginTop: -8 },
  pickCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, backgroundColor: colors.surface, borderRadius: radius.card, padding: space.md, ...shadow.card },
  pickBadge: { width: 48, height: 48, borderRadius: 24, borderWidth: 4, borderColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  pickBadgeText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  pickName: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  seeAll: { alignItems: 'center' },
  seeAllText: { fontFamily: fonts.bold, fontSize: 12, color: colors.red },
  ringText: { fontFamily: fonts.bold, fontSize: 13, color: colors.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  pill: { height: 44, paddingHorizontal: space.base, borderRadius: radius.full, borderWidth: 1, borderColor: colors.hair, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  pillMain: { backgroundColor: colors.red, borderColor: colors.red, ...shadow.red },
  pillText: { fontFamily: fonts.semibold, fontSize: 15, color: colors.ink },
  typing: { alignSelf: 'flex-start', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, borderTopLeftRadius: 4, backgroundColor: colors.surface, ...shadow.card },
  empty: { gap: space.lg },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, paddingLeft: 44 },
  suggestion: { paddingHorizontal: 14, height: 40, justifyContent: 'center', borderRadius: radius.full, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.hair },
  suggestionText: { fontFamily: fonts.medium, fontSize: 14, color: colors.ink },
  inputBar: { marginHorizontal: space.base, height: 60, borderRadius: radius.full, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 6, gap: space.sm, ...shadow.card },
  input: { flex: 1, height: '100%', fontFamily: fonts.medium, fontSize: 16, color: colors.ink },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center' },
  listenBar: { paddingLeft: 6, borderWidth: 1.5, borderColor: colors.redSoft },
  cancelBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.soft, alignItems: 'center', justifyContent: 'center' },
  heard: { flex: 1, fontFamily: fonts.medium, fontSize: 15, lineHeight: 20, color: colors.ink },
  heardWaiting: { color: colors.muted },
  hint: { marginHorizontal: space.base, marginBottom: space.sm, flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.base, paddingVertical: space.md, borderRadius: 16, backgroundColor: colors.goldSoft },
  hintText: { flex: 1, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18, color: colors.goldText },
});
