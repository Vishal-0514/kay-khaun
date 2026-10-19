// What goes well with a drink, and with the weather. These are soft hints:
// they lift matching dishes, recipes and places, but never override what the
// user asked for. Chatora pairs food with a drink only when the user mentions
// one; it never suggests drinking.
//
//   words:    dish words to look for (sample menu names, recipe names, places)
//   cuisines: cuisines that suit it
//   moods:    moods that suit it
//   query:    what to search Google for when the user named nothing else

export const DRINKS = ['wine', 'beer', 'whisky', 'rum', 'vodka', 'cocktail', 'champagne', 'chai', 'coffee'];

export const DRINK_LABEL = {
  wine: 'wine',
  beer: 'beer',
  whisky: 'whisky',
  rum: 'rum',
  vodka: 'vodka',
  cocktail: 'cocktails',
  champagne: 'champagne',
  chai: 'chai',
  coffee: 'coffee',
};

const chakna = { words: ['chilli chicken', 'koliwada', 'chicken 65', 'chilli paneer', 'momos', 'fries'], cuisines: ['Chinese', 'Coastal'], moods: ['spicy', 'street'] };

export const DRINK_PAIRINGS = {
  wine: { words: ['paneer tikka', 'tikka', 'kebab', 'seekh', 'tandoori', 'pizza', 'pasta'], cuisines: ['Mughlai', 'North Indian'], moods: [], query: 'kebab grill' },
  beer: { ...chakna, query: 'chinese starters' },
  whisky: { words: ['seekh', 'tikka', 'tandoori', 'kebab', 'keema'], cuisines: ['Mughlai', 'North Indian'], moods: ['spicy'], query: 'kebab' },
  rum: { words: ['koliwada', 'fry', 'chicken 65', 'chilli'], cuisines: ['Coastal'], moods: ['spicy'], query: 'seafood fry' },
  vodka: { words: ['momos', 'chilli paneer', 'fries', 'nachos'], cuisines: ['Chinese'], moods: ['street'], query: 'momos' },
  cocktail: { words: ['momos', 'chilli paneer', 'fries', 'nachos'], cuisines: ['Chinese'], moods: ['street'], query: 'momos' },
  champagne: { words: ['cheese', 'paneer tikka', 'custard', 'dessert'], cuisines: [], moods: ['light', 'sweet'], query: 'cheese platter' },
  chai: { words: ['bun maska', 'vada pav', 'pakoda', 'samosa', 'masala pav'], cuisines: ['Street food'], moods: ['street'], query: 'chai and snacks' },
  coffee: { words: ['sandwich', 'brownie', 'cake', 'custard', 'bun maska'], cuisines: [], moods: ['sweet', 'light'], query: 'cafe' },
};

export const WEATHER_PAIRINGS = {
  rain: { words: ['pakoda', 'chai', 'bun maska', 'vada pav', 'misal', 'soup', 'thukpa'], cuisines: ['Street food'], moods: ['comfort', 'street'], query: 'chai pakoda' },
  hot: { words: ['kulfi', 'falooda', 'lassi', 'juice', 'shake', 'curd rice', 'salad', 'bhel'], cuisines: ['Healthy'], moods: ['light', 'sweet'], query: 'healthy food' },
  cold: { words: ['soup', 'thukpa', 'nihari', 'chai', 'keema', 'dal'], cuisines: [], moods: ['comfort', 'spicy'], query: 'hot soup' },
};

// Keyword fallback (no Claude): words people use for each drink. Chai and coffee
// only count as "with chai", so asking FOR chai stays a normal craving.
export const DRINK_WORDS = {
  wine: ['wine', 'red wine', 'white wine', 'rose wine', 'sangria'],
  beer: ['beer', 'beers', 'bira', 'kingfisher', 'pint'],
  whisky: ['whisky', 'whiskey', 'scotch', 'daru', 'daaru', 'peg', 'pegs'],
  rum: ['rum', 'old monk'],
  vodka: ['vodka'],
  cocktail: ['cocktail', 'cocktails', 'drinks tonight', 'having drinks'],
  champagne: ['champagne', 'prosecco', 'bubbly', 'sparkling wine'],
  chai: ['with chai', 'with tea', 'chai ke saath', 'chai ke sath'],
  coffee: ['with coffee', 'with my coffee', 'coffee ke saath', 'coffee ke sath'],
};
