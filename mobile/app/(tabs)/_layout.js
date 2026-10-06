import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Icon from '../../components/Icon';
import { glideTo } from '../../components/Motion';
import { colors, fonts } from '../../lib/theme';

const TABS = {
  home: { label: 'Home', icon: 'home' },
  chat: { label: 'Chat', icon: 'chat' },
  profile: { label: 'Profile', icon: 'user' },
};

// Short red line over the active tab: it draws itself out from the centre when
// the tab is chosen and draws back in when you leave.
function TabMark({ focused }) {
  const t = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    t.value = glideTo(focused ? 1 : 0);
  }, [focused, t]);
  const animated = useAnimatedStyle(() => ({ opacity: t.value, transform: [{ scaleX: t.value }] }));
  return <Animated.View style={[styles.mark, animated]} />;
}

// White bar with a hairline top; the active tab is masala red (design: V5 nav).
function TabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const tab = TABS[route.name];
        if (!tab) return null;
        const focused = state.index === index;
        const color = focused ? colors.red : colors.muted;
        return (
          <Pressable
            key={route.key}
            role="tab"
            aria-selected={focused}
            aria-label={tab.label}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name);
            }}
            style={styles.item}
          >
            <TabMark focused={focused} />
            <Icon name={tab.icon} size={24} color={color} strokeWidth={focused ? 2.2 : 1.8} />
            <Text style={[styles.label, { color, fontFamily: focused ? fonts.bold : fonts.medium }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs tabBar={(props) => <TabBar {...props} />} screenOptions={{ headerShown: false, animation: 'shift', sceneStyle: { backgroundColor: colors.canvas } }}>
      <Tabs.Screen name="home" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.hair, paddingTop: 8 },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 48 },
  mark: { position: 'absolute', top: -9, width: 32, height: 3, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.red },
  label: { fontSize: 12 },
});
