import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FESTIVALS, SEASONS, currentOccasion, occasionSlots } from '../src/data/occasions.js';

const on = (day) => currentOccasion(new Date(`${day}T06:00:00Z`));

test('the festival comes first, the season when nothing is on', () => {
  assert.equal(on('2026-10-15').id, 'navratri-2026');
  assert.equal(on('2026-11-08').id, 'diwali-2026');
  assert.equal(on('2027-03-20').id, 'holi-2027');
  assert.equal(on('2026-11-28').kind, 'season');
  assert.equal(on('2027-07-10').id, 'monsoon');
});

test('every festival has dishes with Hindi names, and fasting festivals are veg', () => {
  for (const o of [...FESTIVALS, ...SEASONS]) {
    assert.ok(o.dishes.length >= 4, o.id);
    for (const dish of o.dishes) assert.ok(dish.hi && dish.icon, `${o.id}/${dish.id}`);
    if (o.note?.startsWith('Vrat')) assert.equal(o.diet, 'veg', o.id);
  }
  for (const f of FESTIVALS) assert.ok(f.from <= f.to, f.id);
});

test('tapping a festival dish searches for that dish, veg when the festival is', () => {
  const navratri = FESTIVALS.find((f) => f.id === 'navratri-2026');
  assert.deepEqual(occasionSlots(navratri, 'sabudana-khichdi').dishWords, ['sabudana khichdi']);
  assert.equal(occasionSlots(navratri, 'sabudana-khichdi').diet, 'veg');
  assert.deepEqual(occasionSlots(FESTIVALS.find((f) => f.id === 'lohri-2027'), 'sarson-saag').dishWords, ['sarson da saag']);
});
