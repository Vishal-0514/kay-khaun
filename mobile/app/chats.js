import { useEffect, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated from 'react-native-reanimated';
import MaroonBand from '../components/MaroonBand';
import IconButton from '../components/IconButton';
import Icon from '../components/Icon';
import Button from '../components/Button';
import { SkeletonList } from '../components/Skeleton';
import ChatRow, { useOpenChat } from '../components/ChatRow';
import { rise } from '../components/Motion';
import { toast } from '../components/Toast';
import { useChatStore } from '../store/useChatStore';
import { errorMessage } from '../lib/api';
import { confirm, notify } from '../lib/notify';
import { dayLabel } from '../lib/dates';
import { tap } from '../lib/haptics';
import { colors, fonts, space, type } from '../lib/theme';
import { t } from '../lib/i18n';

function group(chats) {
  const sections = [];
  for (const c of chats) {
    const title = dayLabel(c.updatedAt);
    const last = sections.at(-1);
    if (last?.title === title) last.data.push(c);
    else sections.push({ title, data: [c] });
  }
  return sections;
}

export default function Chats() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const recent = useChatStore((s) => s.recent);
  const more = useChatStore((s) => s.recentMore);
  const loadRecent = useChatStore((s) => s.loadRecent);
  const loadMoreRecent = useChatStore((s) => s.loadMoreRecent);
  const removeChat = useChatStore((s) => s.removeChat);
  const clearChats = useChatStore((s) => s.clearChats);
  const openChat = useOpenChat();
  const [state, setState] = useState('loading'); // loading | ready | error
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const bandHeight = 130 + insets.top;

  function load() {
    setState('loading');
    loadRecent()
      .then(() => setState('ready'))
      .catch((err) => {
        setError(errorMessage(err));
        setState('error');
      });
  }
  useEffect(load, [loadRecent]);

  async function refresh() {
    setRefreshing(true);
    await loadRecent().catch(() => {});
    setRefreshing(false);
  }

  async function next() {
    if (!more || loadingMore) return;
    setLoadingMore(true);
    await loadMoreRecent().catch(() => {});
    setLoadingMore(false);
  }

  async function remove(chat) {
    tap();
    try {
      await removeChat(chat.id);
      toast(t('Chat deleted'));
    } catch (err) {
      notify(t("Couldn't delete that chat"), errorMessage(err));
    }
  }

  async function clearAll() {
    const yes = await confirm(t('Delete all chats?'), t('Every chat with Chatora will be removed. Your saved picks and history stay. This can’t be undone.'), t('Delete'));
    if (!yes) return;
    try {
      await clearChats();
      toast(t('All chats deleted'));
    } catch (err) {
      notify(t("Couldn't delete your chats"), errorMessage(err));
    }
  }

  return (
    <View style={styles.root}>
      <MaroonBand height={bandHeight}>
        <View style={[styles.header, { marginTop: insets.top + space.base }]}>
          <IconButton name="back" label={t('Back')} onDark onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat'))} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title} role="heading">
              {t('Recent chats')}
            </Text>
            <Text style={styles.subtitle}>{t('Pick up where you left off')}</Text>
          </View>
          {recent.length ? <IconButton name="trash" label={t('Delete all chats')} onDark onPress={clearAll} /> : null}
        </View>
      </MaroonBand>

      {state === 'loading' && !recent.length ? (
        <SkeletonList style={{ marginTop: bandHeight }} />
      ) : state === 'error' && !recent.length ? (
        <View style={[styles.empty, { marginTop: bandHeight }]}>
          <Text style={type.head} role="heading">{t("Couldn't load your chats")}</Text>
          <Text style={[type.small, { textAlign: 'center' }]}>{error}</Text>
          <Button title={t('Try again')} variant="outline" onPress={load} style={{ alignSelf: 'stretch' }} />
        </View>
      ) : (
        // The offset sits on a wrapper: on web, a list with pull-to-refresh applies its margin twice.
        <View style={{ flex: 1, marginTop: bandHeight }}>
          <SectionList
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + space.xl }]}
            sections={group(recent)}
            keyExtractor={(c) => String(c.id)}
            stickySectionHeadersEnabled={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} tintColor={colors.red} />}
            onEndReached={next}
            onEndReachedThreshold={0.4}
            renderSectionHeader={({ section }) => (
              <Text style={styles.day} role="heading">
                {section.title}
              </Text>
            )}
            renderItem={({ item, index }) => (
              <Animated.View entering={rise(Math.min(index, 6))}>
                <ChatRow chat={item} onOpen={() => openChat(item.id)} onRemove={() => remove(item)} />
              </Animated.View>
            )}
            ListFooterComponent={loadingMore ? <SkeletonList count={1} /> : null}
            ListEmptyComponent={
              <View style={styles.empty}>
                <View style={styles.emptyIcon}>
                  <Icon name="chat" size={30} color={colors.red} />
                </View>
                <Text style={type.head} role="heading">{t('No chats yet')}</Text>
                <Text style={[type.small, { textAlign: 'center' }]}>{t('Tell Chatora what you feel like and your chats will show up here.')}</Text>
                <Button title={t('Start a chat')} onPress={() => router.navigate('/chat')} style={{ alignSelf: 'stretch', marginTop: space.sm }} />
              </View>
            }
          />
        </View>
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
  day: { ...type.label, marginTop: space.sm },
  empty: { alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.xl },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, backgroundColor: colors.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
});
