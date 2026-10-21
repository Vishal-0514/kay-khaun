import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSweetish, nextOrderQuestion, searchDiet } from '../src/controllers/chatController.js';

const ask = (slots) => nextOrderQuestion({ moods: [], cuisines: [], dishWords: [], ...slots })?.asking ?? null;

test('ordering: Chatora asks the craving, then veg or non-veg, then the budget', () => {
  assert.equal(ask({}), 'craving');
  assert.equal(ask({ craving: 'something spicy', moods: ['spicy'] }), 'diet');
  assert.equal(ask({ moods: ['spicy'], diet: 'veg' }), 'budget');
  assert.equal(ask({ moods: ['spicy'], diet: 'any' }), 'budget');
  assert.equal(ask({ moods: ['spicy'], diet: 'nonveg', budgetMax: 400 }), null);
  assert.equal(ask({ moods: ['spicy'], diet: 'veg', budgetAny: true }), null);
});

test('sweets never ask veg or non-veg, and are searched as veg', () => {
  assert.equal(ask({ moods: ['sweet'] }), 'budget');
  assert.equal(ask({ dishWords: ['gulab jamun'] }), 'budget');
  assert.equal(ask({ craving: 'ice cream' }), 'budget');
  assert.ok(isSweetish({ cuisines: ['Desserts'] }));
  assert.equal(searchDiet({ moods: ['sweet'], diet: 'nonveg' }), 'veg');
  assert.equal(searchDiet({ craving: 'cold coffee' }), 'veg');
});

test('savoury food keeps its diet; "anything" means no filter', () => {
  assert.ok(!isSweetish({ dishWords: ['chicken biryani'] }));
  assert.ok(!isSweetish({ craving: 'chocolate chicken wings' }));
  assert.equal(searchDiet({ dishWords: ['biryani'], diet: 'nonveg' }), 'nonveg');
  assert.equal(searchDiet({ dishWords: ['biryani'], diet: 'any' }), null);
});
