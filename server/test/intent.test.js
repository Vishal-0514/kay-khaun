import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseWithKeywords } from '../src/services/intent.js';

test('reads budget, time and diet from Hinglish', () => {
  const r = parseWithKeywords('kuch teekha veg, 400 ke andar, jaldi');
  assert.equal(r.budgetMax, 400);
  assert.equal(r.budgetStrict, true);
  assert.equal(r.timeMax, 30);
  assert.equal(r.diet, 'veg');
  assert.ok(r.moods.includes('spicy'));
});

test('a group budget is for everyone unless "each"', () => {
  assert.equal(parseWithKeywords('hum 4 log, 1200 ka budget').budgetPerPerson, false);
  assert.equal(parseWithKeywords('for 3 people, 300 each').budgetPerPerson, true);
  assert.equal(parseWithKeywords('for 30 min').people, null);
});

test('drinks: alcohol and "with chai" are drinks, "I want chai" is a craving', () => {
  assert.equal(parseWithKeywords('drinking beer tonight, order something').drink, 'beer');
  assert.equal(parseWithKeywords('kuch teekha chai ke saath').drink, 'chai');
  assert.equal(parseWithKeywords('I want masala chai').drink, null);
});

test('going out and the kind of outing', () => {
  const r = parseWithKeywords("let's go out for a date night");
  assert.equal(r.branch, 'out');
  assert.equal(r.outing, 'date');
  assert.equal(parseWithKeywords('kahin chalte hain').branch, 'out');
  assert.equal(parseWithKeywords('order something').branch, 'order');
});
