import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recommend } from '../src/services/ranking.js';
import { suggestRecipes } from '../src/services/cooking.js';
import { withHints } from '../src/services/context.js';
import { classify } from '../src/services/weather.js';

test('never shows non-veg to a veg request, or what they avoid', () => {
  const { picks } = recommend({ diet: 'veg', avoid: ['mushroom'] }, {});
  assert.equal(picks.length, 5);
  for (const p of picks) {
    assert.equal(p.diet, 'veg');
    assert.ok(!/mushroom/i.test(p.name));
  }
});

test('a strict budget is kept, and relaxing it is reported', () => {
  const { picks, relaxed } = recommend({ budgetMax: 250, budgetStrict: true }, {});
  assert.equal(relaxed, null);
  assert.ok(picks.every((p) => p.price <= 250));
  assert.equal(recommend({ budgetMax: 20, budgetStrict: true }, {}).relaxed, 'budget');
});

test('food that goes with beer comes first, with the reason', () => {
  const { picks } = recommend(withHints({ branch: 'order' }, { drink: 'beer' }), {});
  assert.ok(picks.slice(0, 3).every((p) => p.reasons.some((r) => r.icon === 'cup')));
});

test('weather only steps in when they named nothing', () => {
  const rain = { weather: { kind: 'rain', tempC: 27 } };
  assert.ok(withHints({}, rain).hintReason);
  assert.equal(withHints({ dishWords: ['biryani'] }, rain).hintReason, undefined);
});

test('weather types', () => {
  assert.equal(classify({ weatherCondition: { type: 'LIGHT_RAIN' }, feelsLikeTemperature: { degrees: 27 } }).kind, 'rain');
  assert.equal(classify({ weatherCondition: { type: 'CHANCE_OF_SHOWERS' }, feelsLikeTemperature: { degrees: 30 } }).kind, null);
  assert.equal(classify({ weatherCondition: { type: 'CLEAR' }, feelsLikeTemperature: { degrees: 38 } }).kind, 'hot');
  assert.equal(classify({ weatherCondition: { type: 'CLEAR' }, feelsLikeTemperature: { degrees: 12 } }).kind, 'cold');
});

test('cook at home: at most 5 recipes, each using what they have', () => {
  const recipes = suggestRecipes({ ingredients: ['onion', 'tomato', 'potato', 'egg', 'paneer', 'rice', 'curd', 'bread', 'milk'] }, {});
  assert.ok(recipes.length > 0 && recipes.length <= 5);
  assert.ok(recipes.every((r) => r.have >= 1 && r.missing.length <= 2));
});
