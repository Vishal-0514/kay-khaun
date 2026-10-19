import { Linking } from 'react-native';

// Links the app opens outside itself (ordering, maps, music) come from the
// server, but they're also saved in chats. As a second guard, only open https
// links to the sites Kya Khaun links to, never other schemes or hosts.
const HOSTS = [
  'zomato.com',
  'swiggy.com',
  'google.com',
  'goo.gl',
  'maps.apple.com',
  'open.spotify.com',
  'music.youtube.com',
  'music.apple.com',
  'karisglobalretail.com',
];

export function isSafeLink(url) {
  // React Native's URL has no hostname, so read the host by hand.
  const host = /^https:\/\/([^/?#:@]+)(?::\d+)?(?:[/?#]|$)/i.exec(String(url ?? ''))?.[1]?.toLowerCase();
  return Boolean(host) && HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

// Same as Linking.openURL, but refuses links that aren't on the list.
export function openLink(url) {
  if (!isSafeLink(url)) return Promise.reject(new Error('Link not allowed'));
  return Linking.openURL(url);
}
