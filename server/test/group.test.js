import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSlots } from '../src/controllers/chatController.js';
import { groupPicksSchema } from '../src/validators/chatValidators.js';

test('an all-veg group searches pure veg; a mixed group gets places with both', () => {
  assert.equal(groupSlots({ people: 6, veg: 6 }).diet, 'veg');
  assert.equal(groupSlots({ people: 6, veg: 3 }).diet, null);
  assert.equal(groupSlots({ people: 6, veg: 0 }).diet, null);
});

test('the budget is per person, and the kind of group shapes the search', () => {
  const s = groupSlots({ people: 8, veg: 2, budgetPerHead: 400, kind: 'office' });
  assert.equal(s.budgetMax, 400);
  assert.equal(s.budgetPerPerson, true);
  assert.match(s.hintQuery, /office/);
  assert.equal(groupSlots({ people: 4, veg: 0, kind: 'family', cuisine: 'Chinese' }).hintQuery, null);
});

test('a group must add up', () => {
  assert.ok(groupPicksSchema.safeParse({ people: 4, veg: 2 }).success);
  assert.ok(!groupPicksSchema.safeParse({ people: 4, veg: 5 }).success);
  assert.ok(!groupPicksSchema.safeParse({ people: 1, veg: 0 }).success);
});

test('bars, pubs and restobars are never suggested; juice bars and barbeque are fine', async () => {
  const { isAlcoholPlace } = await import('../src/services/places.js');
  for (const [name, kind] of [['Infinity Family Restobar', 'Restaurant'], ['Grand Restaurant & Bar', 'North Indian restaurant'], ['Glocal', 'Gastropub'], ['Toit', 'Brewpub']]) assert.ok(isAlcoholPlace({ name, kind }), name);
  for (const [name, kind] of [['Barbeque Nation', 'Barbecue restaurant'], ['Juice Bar', 'Juice shop'], ['Club Sandwich House', 'Cafe'], ['The Salad Bar', 'Restaurant']]) assert.ok(!isAlcoholPlace({ name, kind }), name);
});
