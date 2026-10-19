import { mockFetch } from './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findSong, songLinks } from '../src/services/music.js';

const track = (trackName, artistName, extra = {}) => ({
  trackName,
  artistName,
  trackExplicitness: 'notExplicit',
  collectionName: 'Album',
  releaseDate: '2016-01-01T00:00:00Z',
  trackViewUrl: 'https://music.apple.com/x',
  artworkUrl100: 'https://img.example/x.jpg',
  ...extra,
});

test('finds the original recording, not a remix', async () => {
  const m = mockFetch(() => ({ body: { results: [track('Good as Hell (Remix)', 'Lizzo'), track('Good As Hell', 'Lizzo')] } }));
  try {
    const s = await findSong({ title: 'Good as Hell', artist: 'Lizzo' });
    assert.equal(s.title, 'Good As Hell');
    assert.equal(s.year, 2016);
  } finally {
    m.restore();
  }
});

test('drops songs that do not exist, have another artist, or are explicit', async () => {
  const m = mockFetch((url) => ({
    body: {
      results: url.includes('Made') ? [] : url.includes('Wrong') ? [track('Wrong Song', 'Someone Else')] : [track('Rude Song', 'Real Singer', { trackExplicitness: 'explicit' })],
    },
  }));
  try {
    assert.equal(await findSong({ title: 'Made Up', artist: 'Nobody' }), null);
    assert.equal(await findSong({ title: 'Wrong Song', artist: 'Real Singer' }), null);
    assert.equal(await findSong({ title: 'Rude Song', artist: 'Real Singer' }), null);
  } finally {
    m.restore();
  }
});

test('music app links search for title and artist', () => {
  const links = songLinks({ title: 'Kesariya', artist: 'Arijit Singh' });
  assert.ok(links.spotify.includes('Kesariya%20Arijit%20Singh'));
  assert.ok(links.youtubeMusic.startsWith('https://music.youtube.com/search?q='));
  assert.equal(links.apple, undefined);
});
