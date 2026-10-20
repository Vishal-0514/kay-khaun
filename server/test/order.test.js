import './helpers.js';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLike, restaurantPage, searchLink } from '../src/services/orderPages.js';

const accepted = (app, url, name) => {
  const page = restaurantPage(app, url);
  return Boolean(page && looksLike(page, name));
};

test('Zomato: a restaurant page is kept, list and search pages are not', () => {
  assert.equal(restaurantPage('zomato', 'https://www.zomato.com/mumbai/cafe-madras-matunga-east/order'), 'https://www.zomato.com/mumbai/cafe-madras-matunga-east');
  assert.ok(accepted('zomato', 'https://www.zomato.com/mumbai/bademiya-colaba', 'Bademiya'));
  assert.ok(!accepted('zomato', 'https://www.zomato.com/mumbai/restaurants?q=x', 'x'));
  assert.ok(!accepted('zomato', 'https://www.zomato.com/mumbai/best-biryani', 'Biryani House'));
  assert.ok(!accepted('zomato', 'https://www.zomato.com/mumbai/pizza-hut-andheri', 'Cafe Madras'));
  assert.ok(!accepted('zomato', 'https://zomato.com.evil.io/mumbai/cafe-madras', 'Cafe Madras'));
  assert.ok(!accepted('zomato', 'http://www.zomato.com/mumbai/cafe-madras', 'Cafe Madras'));
});

test('Swiggy: only delivery menus, never table-booking pages', () => {
  assert.ok(accepted('swiggy', 'https://www.swiggy.com/city/mumbai/cafe-2-0-matunga-east-rest18669', 'Cafe 2.0'));
  assert.ok(accepted('swiggy', 'https://www.swiggy.com/restaurants/theobroma-colaba-mumbai-5168', 'Theobroma'));
  assert.ok(!accepted('swiggy', 'https://www.swiggy.com/restaurants/cafe-madras-matunga-east-3131/dineout', 'Cafe Madras'));
  assert.ok(!accepted('swiggy', 'https://www.swiggy.com/city/mumbai/bandra-west-restaurants/north-indian-cuisine-order-online', 'Bademiya'));
});

test('not listed: a web search for the restaurant on that site', () => {
  const url = searchLink('swiggy', { name: 'Cafe Madras', area: 'Matunga East', city: 'Mumbai' });
  assert.equal(url, 'https://www.google.com/search?q=Cafe%20Madras%20Matunga%20East%20Mumbai%20swiggy.com');
});
