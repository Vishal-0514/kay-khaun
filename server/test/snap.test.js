import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { outingFor, slotsFromScene } from '../src/controllers/moodController.js';
import { choose } from '../src/controllers/songController.js';

const scene = { setting: 'cafe', timeOfDay: 'evening', rain: true, company: 'two', drink: 'chai', vibe: ['cozy'], craving: null };

test('a photo becomes soft wishes, never a claim about feelings', () => {
  const slots = slotsFromScene(scene);
  assert.deepEqual(slots.moods, ['comfort']);
  assert.equal(slots.drink, 'chai');
  assert.equal(slots.people, 2);
});

test('where to suggest going, from the setting', () => {
  assert.equal(outingFor({ ...scene, vibe: ['romantic'] }), 'date');
  assert.equal(outingFor({ ...scene, vibe: ['cozy'] }), 'chill');
  assert.equal(outingFor({ ...scene, vibe: ['scenic'] }), 'outdoors');
});

test('"Both" alternates Hindi and English songs', () => {
  const songs = [
    { title: 'a', language: 'hindi' },
    { title: 'b', language: 'hindi' },
    { title: 'c', language: 'hindi' },
    { title: 'd', language: 'english' },
    { title: 'e', language: 'english' },
  ];
  assert.deepEqual(
    choose(songs, 'both').map((s) => s.language),
    ['hindi', 'english', 'hindi', 'english']
  );
  assert.equal(choose(songs, 'hindi').length, 4);
});
