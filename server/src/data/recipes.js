import { ingredients as PANTRY, BASICS } from './pantry.js';

// Everyday Indian home recipes for "Cook at home". Like the Mumbai menu, this is
// the single source of truth: the app (and Claude) only ever show what is here.
//
// recipe(id, name, info, ingredients, steps, subs)
//   info:        time (min), level, serves, diet (veg | egg | nonveg), spice 1-5, cuisine, moods
//   ingredients: [pantryId, quantity, optional?]
//   steps:       [text, { timer: seconds, uses: [pantryId], tip }]
//   subs:        { pantryId: what to use if you don't have it }

const recipe = (id, name, info, ingredients, steps, subs = {}) => ({ id, name, ...info, ingredients, steps, subs });

const rows = [
  // ---------- paneer ----------
  recipe('paneer-bhurji', 'Paneer Bhurji', { time: 20, level: 'Easy', serves: 2, diet: 'veg', spice: 3, cuisine: 'North Indian', moods: ['comfort', 'spicy'] },
    [['paneer', '200 g, crumbled'], ['onion', '1 large, chopped'], ['tomato', '2, chopped'], ['green-chilli', '1–2, chopped'], ['capsicum', '½, chopped', true], ['coriander', 'a handful', true], ['oil', '1 tbsp'], ['cumin', '½ tsp'], ['turmeric', '¼ tsp'], ['chilli-powder', '½ tsp'], ['garam-masala', '¼ tsp'], ['salt', 'to taste']],
    [
      ['Heat the oil in a pan and add the cumin. When it crackles, add the onion and green chilli.', { uses: ['cumin', 'onion', 'green-chilli'] }],
      ['Cook the onion until soft and light golden.', { timer: 180, uses: ['onion'] }],
      ['Add the tomato, turmeric, chilli powder and salt. Cook until the tomato turns mushy.', { timer: 240, uses: ['tomato', 'turmeric', 'chilli-powder'] }],
      ['Add the capsicum and cook for 2 minutes so it keeps a little crunch.', { timer: 120, uses: ['capsicum'] }],
      ['Add the crumbled paneer and garam masala. Mix gently and cook for 2 minutes — any longer and paneer turns rubbery.', { timer: 120, uses: ['paneer', 'garam-masala'] }],
      ['Turn off the heat, top with coriander and serve hot with roti or pav.', { uses: ['coriander'] }],
    ],
    { capsicum: 'No capsicum? Skip it, or add a handful of peas instead.', coriander: 'No coriander? A pinch of kasuri methi works well.' }),

  recipe('matar-paneer', 'Matar Paneer', { time: 35, level: 'Medium', serves: 3, diet: 'veg', spice: 3, cuisine: 'North Indian', moods: ['comfort'] },
    [['paneer', '200 g, cubed'], ['peas', '1 cup'], ['onion', '2, finely chopped'], ['tomato', '3, puréed'], ['ginger', '1 inch, grated'], ['garlic', '4 cloves, crushed'], ['green-chilli', '1, slit'], ['cream', '2 tbsp', true], ['kasuri-methi', '1 tsp', true], ['oil', '2 tbsp'], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['chilli-powder', '1 tsp'], ['coriander-powder', '1 tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Heat the oil, add the cumin, then the onion. Fry until golden brown.', { timer: 360, uses: ['cumin', 'onion'] }],
      ['Add the ginger, garlic and green chilli. Stir for a minute until the raw smell goes.', { timer: 60, uses: ['ginger', 'garlic', 'green-chilli'] }],
      ['Add the tomato purée with turmeric, chilli powder, coriander powder and salt. Cook until oil separates at the edges.', { timer: 480, uses: ['tomato', 'turmeric', 'chilli-powder', 'coriander-powder'] }],
      ['Add the peas and 1 cup of water. Cover and simmer until the peas are soft.', { timer: 300, uses: ['peas', 'water'] }],
      ['Add the paneer, garam masala and kasuri methi (crushed between your palms). Simmer for 3 minutes.', { timer: 180, uses: ['paneer', 'garam-masala', 'kasuri-methi'] }],
      ['Stir in the cream, turn off the heat and serve with roti or rice.', { uses: ['cream'] }],
    ],
    { cream: 'No cream? Whisk 2 tbsp of milk with a pinch of cornflour, or just skip it.', 'kasuri-methi': 'No kasuri methi? Fresh coriander works just as well.' }),

  recipe('palak-paneer', 'Palak Paneer', { time: 35, level: 'Medium', serves: 3, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['comfort', 'light'] },
    [['spinach', '1 big bunch (about 250 g)'], ['paneer', '200 g, cubed'], ['onion', '1, chopped'], ['tomato', '1, chopped'], ['garlic', '4 cloves'], ['ginger', '1 inch'], ['green-chilli', '2'], ['cream', '2 tbsp', true], ['oil', '2 tbsp'], ['cumin', '1 tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Wash the spinach well. Boil it in water for 2 minutes, then move it straight into cold water — this keeps it bright green.', { timer: 120, uses: ['spinach'] }],
      ['Blend the spinach with the ginger, green chilli and a few spoons of water into a smooth purée.', { uses: ['spinach', 'ginger', 'green-chilli'] }],
      ['Heat the oil, add the cumin and garlic, then the onion. Cook until golden.', { timer: 300, uses: ['cumin', 'garlic', 'onion'] }],
      ['Add the tomato and salt and cook until soft.', { timer: 180, uses: ['tomato'] }],
      ['Pour in the spinach purée and garam masala. Simmer for 3 minutes — don\'t overcook or it turns dull.', { timer: 180, uses: ['garam-masala'] }],
      ['Add the paneer, cook for 2 minutes, finish with cream and serve.', { timer: 120, uses: ['paneer', 'cream'] }],
    ],
    { cream: 'No cream? A spoon of butter or malai gives the same richness.' }),

  recipe('shahi-paneer', 'Shahi Paneer', { time: 35, level: 'Medium', serves: 3, diet: 'veg', spice: 2, cuisine: 'Mughlai', moods: ['comfort'] },
    [['paneer', '200 g, cubed'], ['onion', '2, sliced'], ['tomato', '2'], ['cashew', '12'], ['cream', '¼ cup'], ['ginger', '1 inch'], ['garlic', '3 cloves'], ['cardamom', '2 pods', true], ['butter', '1 tbsp', true], ['oil', '1 tbsp'], ['chilli-powder', '½ tsp'], ['garam-masala', '½ tsp'], ['sugar', '½ tsp'], ['salt', 'to taste']],
    [
      ['Boil the onion, tomato, cashews, ginger and garlic in a cup of water for 8 minutes.', { timer: 480, uses: ['onion', 'tomato', 'cashew', 'ginger', 'garlic'] }],
      ['Let it cool a little, then blend to a very smooth paste.', {}],
      ['Heat the oil and butter, add the cardamom, then pour in the paste.', { uses: ['butter', 'cardamom'] }],
      ['Add the chilli powder, salt and sugar. Cook, stirring, until it thickens and oil shows at the edges.', { timer: 360, uses: ['chilli-powder', 'sugar'] }],
      ['Add the paneer and garam masala and simmer for 3 minutes.', { timer: 180, uses: ['paneer', 'garam-masala'] }],
      ['Stir in the cream, turn off the heat and serve with naan or jeera rice.', { uses: ['cream'] }],
    ],
    { cashew: 'No cashews? Use 2 tbsp of peanuts or melon seeds — or a spoon of besan roasted in ghee.', cream: 'No cream? Use ¼ cup of milk plus a spoon of butter.' }),

  recipe('paneer-capsicum-salad', 'Paneer & Capsicum Salad', { time: 10, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'Healthy', moods: ['light'] },
    [['paneer', '150 g, cubed'], ['capsicum', '1, diced'], ['cucumber', '1, diced'], ['tomato', '1, diced'], ['onion', '½, diced', true], ['lemon', '½'], ['coriander', 'a few leaves', true], ['salt', 'to taste'], ['cumin', '½ tsp roasted, ground', true]],
    [
      ['Toss the paneer in a hot dry pan for 2 minutes until lightly golden. This step is optional but adds flavour.', { timer: 120, uses: ['paneer'] }],
      ['Put the capsicum, cucumber, tomato and onion in a bowl.', { uses: ['capsicum', 'cucumber', 'tomato', 'onion'] }],
      ['Add the paneer, squeeze in the lemon, add salt and the cumin, and toss.', { uses: ['lemon', 'salt', 'cumin'] }],
      ['Top with coriander and eat straight away.', { uses: ['coriander'] }],
    ],
    { cucumber: 'No cucumber? Grated carrot or sweet corn work nicely.' }),

  // ---------- vegetables ----------
  recipe('aloo-jeera', 'Jeera Aloo', { time: 20, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['comfort'] },
    [['potato', '4, boiled and cubed'], ['green-chilli', '2, chopped'], ['coriander', 'a handful'], ['lemon', '½', true], ['oil', '2 tbsp'], ['cumin', '1½ tsp'], ['turmeric', '¼ tsp'], ['chilli-powder', '½ tsp'], ['coriander-powder', '1 tsp'], ['salt', 'to taste']],
    [
      ['If the potatoes are raw, pressure cook them for 2 whistles, then peel and cube.', { uses: ['potato'] }],
      ['Heat the oil and add the cumin. Let it turn a shade darker.', { uses: ['cumin'] }],
      ['Add the green chilli, then the potato with turmeric, chilli powder, coriander powder and salt.', { uses: ['green-chilli', 'turmeric', 'chilli-powder', 'coriander-powder'] }],
      ['Fry on medium heat without stirring too much, so the edges crisp up.', { timer: 360 }],
      ['Squeeze over the lemon, add the coriander and serve with roti or dal-rice.', { uses: ['lemon', 'coriander'] }],
    ]),

  recipe('batata-bhaji', 'Batata Bhaji', { time: 20, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'Street food', moods: ['comfort', 'light'] },
    [['potato', '3, boiled'], ['onion', '1, sliced'], ['green-chilli', '2, chopped'], ['curry-leaves', '8', true], ['ginger', '½ inch, grated', true], ['coriander', 'a handful', true], ['lemon', '½', true], ['oil', '1½ tbsp'], ['mustard-seeds', '½ tsp'], ['turmeric', '½ tsp'], ['hing', 'a pinch'], ['salt', 'to taste']],
    [
      ['Peel the boiled potatoes and break them into rough chunks with your hands.', { uses: ['potato'] }],
      ['Heat the oil and add the mustard seeds. When they pop, add the hing, curry leaves, green chilli and ginger.', { uses: ['mustard-seeds', 'hing', 'curry-leaves', 'green-chilli', 'ginger'] }],
      ['Add the onion and cook until soft and translucent.', { timer: 180, uses: ['onion'] }],
      ['Add the turmeric, then the potato and salt. Mix gently and add a splash of water.', { uses: ['turmeric', 'salt'] }],
      ['Cover and cook on low heat so the flavours soak in.', { timer: 180 }],
      ['Finish with lemon and coriander. Serve with puri, chapati or pav.', { uses: ['lemon', 'coriander'] }],
    ]),

  recipe('aloo-gobi', 'Aloo Gobi', { time: 30, level: 'Easy', serves: 3, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['comfort'] },
    [['cauliflower', '1 small, in florets'], ['potato', '2, cubed'], ['onion', '1, chopped'], ['tomato', '1, chopped'], ['ginger', '1 inch, grated'], ['green-chilli', '1'], ['coriander', 'a handful', true], ['oil', '2 tbsp'], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['chilli-powder', '½ tsp'], ['coriander-powder', '1 tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Heat the oil, add the cumin, then the onion, ginger and green chilli. Cook until the onion softens.', { timer: 180, uses: ['cumin', 'onion', 'ginger', 'green-chilli'] }],
      ['Add the potato and cauliflower with turmeric, chilli powder, coriander powder and salt. Mix well.', { uses: ['potato', 'cauliflower', 'turmeric', 'chilli-powder', 'coriander-powder'] }],
      ['Cover and cook on low heat, stirring now and then. Don\'t add water.', { timer: 720, tip: 'Sprinkle a few drops of water only if it starts to stick.' }],
      ['Add the tomato and garam masala and cook uncovered until the vegetables are tender.', { timer: 300, uses: ['tomato', 'garam-masala'] }],
      ['Finish with coriander and serve.', { uses: ['coriander'] }],
    ]),

  recipe('bhindi-masala', 'Bhindi Masala', { time: 25, level: 'Easy', serves: 2, diet: 'veg', spice: 3, cuisine: 'North Indian', moods: ['comfort'] },
    [['okra', '250 g'], ['onion', '1, sliced'], ['tomato', '1, chopped'], ['oil', '2 tbsp'], ['cumin', '1 tsp'], ['turmeric', '¼ tsp'], ['chilli-powder', '½ tsp'], ['coriander-powder', '1 tsp'], ['salt', 'to taste'], ['lemon', '½', true]],
    [
      ['Wash the bhindi and dry it completely with a cloth — wet bhindi turns slimy. Cut into 1-inch pieces.', { uses: ['okra'] }],
      ['Fry the bhindi in 1 tbsp oil on high heat, uncovered, until the sliminess goes. Take it out.', { timer: 360, uses: ['okra'] }],
      ['In the same pan, add the rest of the oil, the cumin and the onion. Cook until golden.', { timer: 240, uses: ['cumin', 'onion'] }],
      ['Add the tomato and spices and cook until soft.', { timer: 180, uses: ['tomato', 'turmeric', 'chilli-powder', 'coriander-powder'] }],
      ['Add the bhindi back, add salt now (not before — salt makes it sticky), mix and cook for 2 minutes. Finish with lemon.', { timer: 120, uses: ['salt', 'lemon'] }],
    ]),

  recipe('pav-bhaji', 'Pav Bhaji', { time: 40, level: 'Medium', serves: 3, diet: 'veg', spice: 4, cuisine: 'Street food', moods: ['street', 'spicy', 'comfort'] },
    [['pav', '6'], ['potato', '3, boiled'], ['peas', '½ cup'], ['capsicum', '1, finely chopped'], ['onion', '2, finely chopped'], ['tomato', '3, finely chopped'], ['butter', '4 tbsp'], ['pav-bhaji-masala', '2 tbsp'], ['cauliflower', '1 cup florets', true], ['garlic', '4 cloves, crushed', true], ['lemon', '1'], ['coriander', 'a handful'], ['chilli-powder', '1 tsp'], ['salt', 'to taste']],
    [
      ['Boil the potato, peas and cauliflower until very soft, then mash them together.', { timer: 600, uses: ['potato', 'peas', 'cauliflower'] }],
      ['Melt 2 tbsp butter in a wide pan. Fry half the onion and the garlic until soft.', { timer: 180, uses: ['butter', 'onion', 'garlic'] }],
      ['Add the capsicum and tomato and cook until mushy, mashing as you go.', { timer: 360, uses: ['capsicum', 'tomato'] }],
      ['Add the pav bhaji masala, chilli powder and salt, then the mashed vegetables and ½ cup water. Mash and simmer.', { timer: 480, uses: ['pav-bhaji-masala', 'chilli-powder'] }],
      ['Slit the pav and toast it on a tawa with butter until crisp.', { uses: ['pav', 'butter'] }],
      ['Top the bhaji with butter, coriander, the rest of the onion and a squeeze of lemon. Serve with the hot pav.', { uses: ['coriander', 'onion', 'lemon'] }],
    ],
    { 'pav-bhaji-masala': 'No pav bhaji masala? Use 1 tbsp garam masala + 1 tsp coriander powder + ½ tsp amchur.', pav: 'No pav? Toasted bread slices work too.' }),

  // ---------- dal, rice ----------
  recipe('dal-tadka', 'Dal Tadka', { time: 35, level: 'Easy', serves: 3, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['comfort'] },
    [['toor-dal', '¾ cup'], ['onion', '1, chopped'], ['tomato', '1, chopped'], ['garlic', '4 cloves, sliced'], ['green-chilli', '1'], ['ghee', '1 tbsp'], ['coriander', 'a handful', true], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['chilli-powder', '½ tsp'], ['hing', 'a pinch'], ['salt', 'to taste']],
    [
      ['Wash the dal and pressure cook it with 2 cups water, turmeric and salt for 3–4 whistles.', { uses: ['toor-dal', 'turmeric', 'salt'], tip: 'No pressure cooker? Boil it covered for about 30 minutes.' }],
      ['Whisk the cooked dal until smooth. Add water if it\'s too thick.', {}],
      ['For the tadka, heat the ghee and add the cumin, hing and garlic. Fry until the garlic turns golden.', { timer: 60, uses: ['ghee', 'cumin', 'hing', 'garlic'] }],
      ['Add the onion and green chilli, cook until soft, then the tomato and chilli powder until mushy.', { timer: 300, uses: ['onion', 'green-chilli', 'tomato', 'chilli-powder'] }],
      ['Pour the tadka into the dal and simmer together.', { timer: 180 }],
      ['Top with coriander and serve with rice or roti.', { uses: ['coriander'] }],
    ],
    { ghee: 'No ghee? Use oil with a small piece of butter.', 'toor-dal': 'No toor dal? Moong or masoor dal cook even faster.' }),

  recipe('moong-dal-khichdi', 'Moong Dal Khichdi', { time: 30, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'North Indian', moods: ['comfort', 'light'] },
    [['rice', '½ cup'], ['moong-dal', '½ cup'], ['ghee', '1 tbsp'], ['ginger', '½ inch, grated', true], ['peas', '¼ cup', true], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['hing', 'a pinch'], ['salt', 'to taste']],
    [
      ['Wash the rice and dal together and soak for 10 minutes if you have time.', { timer: 600, uses: ['rice', 'moong-dal'] }],
      ['Heat the ghee in a pressure cooker. Add the cumin, hing and ginger.', { uses: ['ghee', 'cumin', 'hing', 'ginger'] }],
      ['Add the rice, dal, peas, turmeric, salt and 4 cups of water.', { uses: ['peas', 'turmeric', 'salt'] }],
      ['Pressure cook for 3 whistles, then let the pressure drop on its own.', { timer: 720 }],
      ['Stir well — it should be soft and porridge-like. Serve hot with a spoon of ghee, curd or pickle.', {}],
    ]),

  recipe('jeera-rice', 'Jeera Rice', { time: 25, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'North Indian', moods: ['comfort', 'light'] },
    [['rice', '1 cup basmati'], ['ghee', '1 tbsp'], ['cumin', '1½ tsp'], ['coriander', 'a few leaves', true], ['salt', 'to taste']],
    [
      ['Wash the rice and soak it for 15 minutes, then drain.', { timer: 900, uses: ['rice'] }],
      ['Heat the ghee and add the cumin. Let it sizzle until fragrant.', { uses: ['ghee', 'cumin'] }],
      ['Add the rice and stir gently for a minute so every grain is coated.', { timer: 60 }],
      ['Add 1¾ cups of water and salt. Bring to a boil, then cover and cook on the lowest heat.', { timer: 720, uses: ['salt'] }],
      ['Turn off the heat and leave it covered for 5 minutes. Fluff with a fork and add coriander.', { timer: 300, uses: ['coriander'] }],
    ]),

  recipe('veg-pulao', 'Veg Pulao', { time: 35, level: 'Easy', serves: 3, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['comfort'] },
    [['rice', '1 cup basmati'], ['onion', '1, sliced'], ['carrot', '1, diced'], ['peas', '½ cup'], ['beans', '6, chopped', true], ['potato', '1, diced', true], ['ginger', '½ inch', true], ['ghee', '1 tbsp'], ['oil', '1 tbsp'], ['cumin', '1 tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Wash and soak the rice for 15 minutes, then drain.', { timer: 900, uses: ['rice'] }],
      ['Heat the ghee and oil, add the cumin and onion. Cook until light golden.', { timer: 240, uses: ['ghee', 'oil', 'cumin', 'onion'] }],
      ['Add the ginger and all the vegetables. Stir-fry for 3 minutes.', { timer: 180, uses: ['ginger', 'carrot', 'peas', 'beans', 'potato'] }],
      ['Add the rice, garam masala and salt, and stir gently for a minute.', { uses: ['garam-masala', 'salt'] }],
      ['Add 1¾ cups water. Pressure cook for 1 whistle, or cover and cook on low heat until done.', { timer: 720 }],
      ['Rest for 5 minutes, fluff and serve with raita.', { timer: 300 }],
    ],
    { carrot: 'Use whatever vegetables you have — capsicum, corn or cauliflower all work.' }),

  recipe('curd-rice', 'Curd Rice', { time: 15, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'South Indian', moods: ['light', 'comfort'] },
    [['rice', '1 cup, cooked (leftover is perfect)'], ['curd', '1 cup'], ['milk', '¼ cup', true], ['curry-leaves', '8', true], ['green-chilli', '1, chopped', true], ['ginger', '½ inch, grated', true], ['cucumber', '¼, grated', true], ['oil', '1 tsp'], ['mustard-seeds', '½ tsp'], ['hing', 'a pinch'], ['salt', 'to taste']],
    [
      ['Mash the cooked rice lightly with a spoon.', { uses: ['rice'] }],
      ['Mix in the curd, milk and salt. The milk keeps it from turning sour later.', { uses: ['curd', 'milk', 'salt'] }],
      ['For the tadka, heat the oil and add the mustard seeds. When they pop, add the hing, curry leaves, green chilli and ginger.', { uses: ['mustard-seeds', 'hing', 'curry-leaves', 'green-chilli', 'ginger'] }],
      ['Pour the tadka over the rice, add the cucumber, and mix. Eat at room temperature or chilled.', { uses: ['cucumber'] }],
    ]),

  recipe('lemon-rice', 'Lemon Rice', { time: 15, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'South Indian', moods: ['light'] },
    [['rice', '1½ cups, cooked'], ['lemon', '1'], ['peanuts', '2 tbsp'], ['curry-leaves', '8', true], ['green-chilli', '2, slit'], ['oil', '1 tbsp'], ['mustard-seeds', '½ tsp'], ['turmeric', '¼ tsp'], ['hing', 'a pinch'], ['salt', 'to taste']],
    [
      ['Heat the oil and fry the peanuts until crunchy.', { timer: 120, uses: ['peanuts'] }],
      ['Add the mustard seeds. When they pop, add the green chilli, curry leaves, hing and turmeric.', { uses: ['mustard-seeds', 'green-chilli', 'curry-leaves', 'hing', 'turmeric'] }],
      ['Turn off the heat. Add the rice and salt and mix gently.', { uses: ['rice', 'salt'] }],
      ['Squeeze in the lemon juice, mix, and let it rest for 5 minutes so the flavours soak in.', { timer: 300, uses: ['lemon'] }],
    ],
    { peanuts: 'No peanuts? Cashews, or a spoon of chana dal fried crisp, work too.' }),

  // ---------- breakfast & snacks ----------
  recipe('kanda-poha', 'Kanda Poha', { time: 15, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'Street food', moods: ['light', 'street'] },
    [['poha', '1½ cups (thick)'], ['onion', '1, chopped'], ['potato', '1 small, diced', true], ['peanuts', '2 tbsp', true], ['green-chilli', '2, chopped'], ['curry-leaves', '8', true], ['lemon', '½'], ['coriander', 'a handful', true], ['oil', '1 tbsp'], ['mustard-seeds', '½ tsp'], ['turmeric', '¼ tsp'], ['sugar', '½ tsp'], ['salt', 'to taste']],
    [
      ['Rinse the poha in a sieve under running water for a few seconds. Add salt, sugar and turmeric, mix and leave it to soften.', { uses: ['poha', 'salt', 'sugar', 'turmeric'] }],
      ['Heat the oil and fry the peanuts until crunchy. Take them out.', { timer: 120, uses: ['peanuts'] }],
      ['Add the mustard seeds. When they pop, add the curry leaves, green chilli and potato. Cover and cook until the potato is soft.', { timer: 300, uses: ['mustard-seeds', 'curry-leaves', 'green-chilli', 'potato'] }],
      ['Add the onion and cook until it turns translucent.', { timer: 120, uses: ['onion'] }],
      ['Add the poha and peanuts, mix gently, cover and steam on low heat for 2 minutes.', { timer: 120 }],
      ['Finish with lemon juice and coriander. Mumbai-style: top with sev if you have it.', { uses: ['lemon', 'coriander'] }],
    ]),

  recipe('upma', 'Rava Upma', { time: 20, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'South Indian', moods: ['light', 'comfort'] },
    [['sooji', '1 cup'], ['onion', '1, chopped'], ['green-chilli', '2, chopped'], ['ginger', '½ inch, grated', true], ['curry-leaves', '8', true], ['carrot', '½, diced', true], ['peas', '¼ cup', true], ['ghee', '1 tbsp', true], ['lemon', '½', true], ['oil', '1 tbsp'], ['mustard-seeds', '½ tsp'], ['salt', 'to taste']],
    [
      ['Dry roast the sooji on low heat until it smells nutty, but don\'t let it brown. Set aside.', { timer: 300, uses: ['sooji'] }],
      ['Heat the oil and add the mustard seeds. When they pop, add the curry leaves, green chilli, ginger and onion.', { uses: ['oil', 'mustard-seeds', 'curry-leaves', 'green-chilli', 'ginger', 'onion'] }],
      ['Add the carrot and peas and cook for 2 minutes.', { timer: 120, uses: ['carrot', 'peas'] }],
      ['Pour in 2½ cups of water with salt and bring it to a rolling boil.', { uses: ['water', 'salt'] }],
      ['Lower the heat and add the sooji slowly with one hand while stirring with the other, so no lumps form.', { tip: 'Keep stirring the whole time you pour.' }],
      ['Cover and cook on low for 2 minutes. Add the ghee and lemon and fluff it up.', { timer: 120, uses: ['ghee', 'lemon'] }],
    ]),

  recipe('besan-chilla', 'Besan Chilla', { time: 20, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['light'] },
    [['besan', '1 cup'], ['onion', '1 small, finely chopped'], ['tomato', '1, finely chopped'], ['green-chilli', '1, chopped'], ['coriander', 'a handful'], ['oil', 'for the pan'], ['turmeric', '¼ tsp'], ['cumin', '½ tsp'], ['salt', 'to taste']],
    [
      ['Whisk the besan with about ¾ cup water into a smooth, pourable batter — like dosa batter.', { uses: ['besan', 'water'] }],
      ['Mix in the onion, tomato, green chilli, coriander, turmeric, cumin and salt. Rest for 5 minutes.', { timer: 300, uses: ['onion', 'tomato', 'green-chilli', 'coriander', 'turmeric', 'cumin', 'salt'] }],
      ['Heat a tawa and grease it lightly. Pour a ladle of batter and spread it into a thin circle.', { uses: ['oil'] }],
      ['Drizzle oil around the edges. Cook until the bottom is golden, then flip and cook the other side.', { timer: 180 }],
      ['Serve hot with green chutney or ketchup.', {}],
    ]),

  recipe('aloo-paratha', 'Aloo Paratha', { time: 40, level: 'Medium', serves: 3, diet: 'veg', spice: 2, cuisine: 'North Indian', moods: ['comfort'] },
    [['atta', '2 cups'], ['potato', '3, boiled'], ['green-chilli', '2, finely chopped'], ['coriander', 'a handful'], ['ginger', '½ inch, grated', true], ['ghee', 'for cooking'], ['butter', 'to serve', true], ['curd', 'to serve', true], ['chilli-powder', '½ tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Knead the atta with a pinch of salt and water into a soft dough. Cover and rest.', { timer: 900, uses: ['atta'] }],
      ['Mash the potatoes completely — no lumps. Mix in the green chilli, coriander, ginger, chilli powder, garam masala and salt.', { uses: ['potato', 'green-chilli', 'coriander', 'ginger', 'chilli-powder', 'garam-masala'] }],
      ['Roll a ball of dough into a small circle, put a ball of filling in the middle, close it up like a pouch and flatten gently.', {}],
      ['Dust with flour and roll it out evenly into a 6–7 inch paratha.', { tip: 'If the filling peeks out, patch it with a pinch of dough.' }],
      ['Cook on a hot tawa. Flip when bubbles appear, spread ghee on both sides and cook until golden spots form.', { timer: 180, uses: ['ghee'] }],
      ['Serve hot with butter, curd and pickle.', { uses: ['butter', 'curd'] }],
    ]),

  recipe('veg-sandwich', 'Bombay Veg Sandwich', { time: 15, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'Street food', moods: ['street', 'light'] },
    [['bread', '4 slices'], ['butter', '2 tbsp'], ['potato', '1, boiled and sliced'], ['cucumber', '½, sliced'], ['tomato', '1, sliced'], ['onion', '½, sliced', true], ['chutney', '2 tbsp', true], ['cheese', '2 slices', true], ['salt', 'a pinch'], ['garam-masala', 'a pinch (or chaat masala)']],
    [
      ['Butter all the bread slices and spread green chutney on two of them.', { uses: ['bread', 'butter', 'chutney'] }],
      ['Layer the potato, cucumber, tomato and onion on the chutney slices. Sprinkle salt and masala over each layer.', { uses: ['potato', 'cucumber', 'tomato', 'onion', 'salt', 'garam-masala'] }],
      ['Add the cheese and close with the other slices.', { uses: ['cheese'] }],
      ['Eat as is, or toast on a tawa with butter until crisp on both sides.', { timer: 240 }],
    ],
    { chutney: 'No green chutney? Blend coriander, a green chilli, lemon and salt — or use ketchup.' }),

  recipe('masala-maggi', 'Masala Vegetable Maggi', { time: 10, level: 'Easy', serves: 1, diet: 'veg', spice: 3, cuisine: 'Street food', moods: ['comfort', 'street'] },
    [['instant-noodles', '1 packet'], ['onion', '½, chopped'], ['tomato', '½, chopped'], ['capsicum', '¼, chopped', true], ['peas', '2 tbsp', true], ['green-chilli', '1', true], ['butter', '1 tsp', true], ['oil', '1 tsp'], ['chilli-powder', 'a pinch']],
    [
      ['Heat the oil or butter and fry the onion and green chilli for a minute.', { timer: 60, uses: ['oil', 'butter', 'onion', 'green-chilli'] }],
      ['Add the tomato, capsicum and peas and cook for 2 minutes.', { timer: 120, uses: ['tomato', 'capsicum', 'peas'] }],
      ['Add 1½ cups of water, the tastemaker and a pinch of chilli powder. Bring to a boil.', { uses: ['water', 'chilli-powder'] }],
      ['Break in the noodles and cook, stirring, until most of the water is absorbed.', { timer: 120, uses: ['instant-noodles'] }],
    ]),

  recipe('veg-hakka-noodles', 'Veg Hakka Noodles', { time: 25, level: 'Easy', serves: 2, diet: 'veg', spice: 2, cuisine: 'Chinese', moods: ['street'] },
    [['noodles', '150 g'], ['cabbage', '1 cup, shredded'], ['capsicum', '1, sliced'], ['carrot', '1, julienned'], ['onion', '1, sliced'], ['garlic', '4 cloves, chopped'], ['soy-sauce', '1½ tbsp'], ['green-chilli', '1', true], ['oil', '2 tbsp'], ['salt', 'to taste']],
    [
      ['Boil the noodles in salted water until just done. Drain, rinse in cold water and toss with a little oil.', { timer: 240, uses: ['noodles'] }],
      ['Heat the oil until very hot. Fry the garlic and green chilli for 30 seconds.', { timer: 30, uses: ['garlic', 'green-chilli'] }],
      ['Add the onion, carrot, cabbage and capsicum. Stir-fry on high heat — they should stay crunchy.', { timer: 180, uses: ['onion', 'carrot', 'cabbage', 'capsicum'] }],
      ['Add the noodles, soy sauce and salt. Toss with two spoons on high heat for 2 minutes.', { timer: 120, uses: ['soy-sauce', 'salt'] }],
    ],
    { 'soy-sauce': 'No soy sauce? A little vinegar and a pinch of pepper give a similar kick.' }),

  // ---------- eggs ----------
  recipe('egg-bhurji', 'Egg Bhurji', { time: 15, level: 'Easy', serves: 2, diet: 'egg', spice: 3, cuisine: 'Street food', moods: ['comfort', 'street', 'spicy'] },
    [['egg', '4'], ['onion', '1, chopped'], ['tomato', '1, chopped'], ['green-chilli', '1–2, chopped'], ['coriander', 'a handful', true], ['butter', '1 tbsp', true], ['oil', '1 tbsp'], ['turmeric', '¼ tsp'], ['chilli-powder', '½ tsp'], ['garam-masala', 'a pinch'], ['salt', 'to taste']],
    [
      ['Heat the oil (and butter, if you have it). Cook the onion and green chilli until soft.', { timer: 180, uses: ['oil', 'butter', 'onion', 'green-chilli'] }],
      ['Add the tomato, turmeric, chilli powder and salt. Cook until the tomato is soft.', { timer: 180, uses: ['tomato', 'turmeric', 'chilli-powder', 'salt'] }],
      ['Crack in the eggs. Leave them for 20 seconds, then scramble on medium heat.', { uses: ['egg'] }],
      ['Keep stirring until the eggs are just set — still a little soft.', { timer: 120 }],
      ['Add the garam masala and coriander. Serve with pav or toast.', { uses: ['garam-masala', 'coriander'] }],
    ]),

  recipe('masala-omelette', 'Masala Omelette', { time: 10, level: 'Easy', serves: 1, diet: 'egg', spice: 2, cuisine: 'Street food', moods: ['light', 'street'] },
    [['egg', '2'], ['onion', '¼, finely chopped'], ['tomato', '¼, finely chopped', true], ['green-chilli', '1, chopped'], ['coriander', 'a few leaves', true], ['cheese', '1 slice', true], ['butter', '1 tsp', true], ['oil', '1 tsp'], ['turmeric', 'a pinch'], ['salt', 'to taste']],
    [
      ['Beat the eggs with the onion, tomato, green chilli, coriander, turmeric and salt.', { uses: ['egg', 'onion', 'tomato', 'green-chilli', 'coriander', 'turmeric', 'salt'] }],
      ['Heat the oil or butter in a pan on medium heat and pour in the eggs.', { uses: ['oil', 'butter'] }],
      ['Cook until the bottom is set and golden. Add cheese on top if you like.', { timer: 120, uses: ['cheese'] }],
      ['Flip or fold, cook for 30 seconds more and serve with toast.', { timer: 30 }],
    ]),

  recipe('bread-omelette', 'Bread Omelette', { time: 10, level: 'Easy', serves: 1, diet: 'egg', spice: 2, cuisine: 'Street food', moods: ['street', 'comfort'] },
    [['egg', '2'], ['bread', '2 slices'], ['onion', '¼, finely chopped'], ['green-chilli', '1, chopped'], ['butter', '1 tbsp'], ['coriander', 'a few leaves', true], ['salt', 'to taste']],
    [
      ['Beat the eggs with the onion, green chilli, coriander and salt.', { uses: ['egg', 'onion', 'green-chilli', 'coriander', 'salt'] }],
      ['Melt the butter in a pan, pour in the eggs and immediately place both bread slices on top.', { uses: ['butter', 'bread'] }],
      ['When the egg sets, flip the whole thing so the bread toasts.', { timer: 90 }],
      ['Fold the egg edges over the bread, fold in half like a sandwich, toast both sides and serve with ketchup.', { timer: 60 }],
    ]),

  recipe('egg-curry', 'Egg Masala Curry', { time: 30, level: 'Easy', serves: 2, diet: 'egg', spice: 3, cuisine: 'North Indian', moods: ['comfort', 'spicy'] },
    [['egg', '4'], ['onion', '2, finely chopped'], ['tomato', '2, puréed'], ['ginger', '1 inch, grated'], ['garlic', '4 cloves, crushed'], ['coriander', 'a handful', true], ['oil', '2 tbsp'], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['chilli-powder', '1 tsp'], ['coriander-powder', '1 tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Hard-boil the eggs: put them in boiling water for 10 minutes, then into cold water. Peel and make small slits on each.', { timer: 600, uses: ['egg'] }],
      ['Heat the oil, add the cumin and onion. Fry until golden brown.', { timer: 360, uses: ['cumin', 'onion'] }],
      ['Add the ginger and garlic and cook for a minute.', { timer: 60, uses: ['ginger', 'garlic'] }],
      ['Add the tomato and all the spices except garam masala. Cook until oil separates.', { timer: 360, uses: ['tomato', 'turmeric', 'chilli-powder', 'coriander-powder', 'salt'] }],
      ['Add 1 cup of water and the eggs. Simmer so the eggs soak up the gravy.', { timer: 300, uses: ['water'] }],
      ['Add the garam masala and coriander and serve with rice or roti.', { uses: ['garam-masala', 'coriander'] }],
    ]),

  recipe('egg-fried-rice', 'Egg Fried Rice', { time: 15, level: 'Easy', serves: 2, diet: 'egg', spice: 2, cuisine: 'Chinese', moods: ['comfort', 'street'] },
    [['rice', '2 cups, cooked and cold'], ['egg', '2'], ['onion', '1, chopped'], ['capsicum', '½, chopped', true], ['carrot', '½, chopped', true], ['garlic', '3 cloves, chopped'], ['soy-sauce', '1 tbsp'], ['oil', '2 tbsp'], ['salt', 'to taste']],
    [
      ['Heat 1 tbsp oil, scramble the eggs until just set, and take them out.', { timer: 60, uses: ['egg'] }],
      ['Add the rest of the oil and fry the garlic for 30 seconds on high heat.', { timer: 30, uses: ['garlic'] }],
      ['Add the onion, capsicum and carrot and stir-fry for 2 minutes.', { timer: 120, uses: ['onion', 'capsicum', 'carrot'] }],
      ['Add the rice, soy sauce and salt. Toss on high heat until hot. Cold leftover rice works best.', { timer: 120, uses: ['rice', 'soy-sauce', 'salt'] }],
      ['Mix the egg back in and serve.', {}],
    ],
    { 'soy-sauce': 'No soy sauce? Add a pinch of black pepper and a few drops of vinegar.' }),

  // ---------- chicken, mutton, fish ----------
  recipe('chicken-curry', 'Home-style Chicken Curry', { time: 45, level: 'Medium', serves: 3, diet: 'nonveg', spice: 3, cuisine: 'North Indian', moods: ['comfort', 'spicy'] },
    [['chicken', '500 g, curry cut'], ['onion', '2, finely chopped'], ['tomato', '2, chopped'], ['ginger', '1 inch, grated'], ['garlic', '6 cloves, crushed'], ['curd', '3 tbsp', true], ['green-chilli', '2', true], ['coriander', 'a handful', true], ['oil', '3 tbsp'], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['chilli-powder', '1½ tsp'], ['coriander-powder', '2 tsp'], ['garam-masala', '1 tsp'], ['salt', 'to taste']],
    [
      ['Mix the chicken with the curd, turmeric, half the chilli powder and salt. Rest it while you cook the masala.', { uses: ['chicken', 'curd', 'turmeric', 'chilli-powder', 'salt'] }],
      ['Heat the oil, add the cumin, then the onion. Fry on medium heat until deep golden brown — this gives the curry its colour.', { timer: 480, uses: ['cumin', 'onion'] }],
      ['Add the ginger, garlic and green chilli. Cook for a minute.', { timer: 60, uses: ['ginger', 'garlic', 'green-chilli'] }],
      ['Add the tomato, coriander powder and the rest of the chilli powder. Cook until oil separates.', { timer: 360, uses: ['tomato', 'coriander-powder', 'chilli-powder'] }],
      ['Add the chicken and fry on high heat for 5 minutes until it changes colour.', { timer: 300, uses: ['chicken'] }],
      ['Add 1 cup hot water, cover and simmer until the chicken is cooked through and tender.', { timer: 900, uses: ['water'], tip: 'Cut a thick piece — there should be no pink near the bone.' }],
      ['Add the garam masala and coriander, rest for 5 minutes and serve with rice or roti.', { uses: ['garam-masala', 'coriander'] }],
    ],
    { curd: 'No curd? Squeeze half a lemon over the chicken instead.' }),

  recipe('chilli-chicken', 'Chilli Chicken (dry)', { time: 30, level: 'Medium', serves: 2, diet: 'nonveg', spice: 4, cuisine: 'Chinese', moods: ['spicy', 'street'] },
    [['chicken', '300 g boneless, cubed'], ['cornflour', '3 tbsp'], ['egg', '1', true], ['capsicum', '1, cubed'], ['onion', '1, cubed'], ['garlic', '5 cloves, chopped'], ['green-chilli', '3, slit'], ['soy-sauce', '1½ tbsp'], ['ginger', '½ inch, chopped', true], ['oil', 'for frying'], ['chilli-powder', '½ tsp'], ['salt', 'to taste']],
    [
      ['Coat the chicken with cornflour, egg, chilli powder, salt and a splash of soy sauce.', { uses: ['chicken', 'cornflour', 'egg', 'chilli-powder', 'salt'] }],
      ['Shallow-fry the chicken in hot oil until golden and cooked through. Drain.', { timer: 360, uses: ['oil'] }],
      ['In 1 tbsp oil on high heat, fry the garlic, ginger and green chilli for 30 seconds.', { timer: 30, uses: ['garlic', 'ginger', 'green-chilli'] }],
      ['Add the onion and capsicum and toss for 1 minute — they should stay crunchy.', { timer: 60, uses: ['onion', 'capsicum'] }],
      ['Add the soy sauce and the fried chicken. Toss on high heat for a minute and serve.', { timer: 60, uses: ['soy-sauce'] }],
    ],
    { egg: 'No egg? Use 2 tbsp of water in the coating — it still crisps up.' }),

  recipe('keema-matar', 'Keema Matar', { time: 40, level: 'Medium', serves: 3, diet: 'nonveg', spice: 3, cuisine: 'Mughlai', moods: ['comfort', 'spicy'] },
    [['keema', '500 g'], ['peas', '1 cup'], ['onion', '2, finely chopped'], ['tomato', '2, chopped'], ['ginger', '1 inch, grated'], ['garlic', '6 cloves, crushed'], ['green-chilli', '2, chopped'], ['coriander', 'a handful', true], ['oil', '3 tbsp'], ['cumin', '1 tsp'], ['turmeric', '½ tsp'], ['chilli-powder', '1 tsp'], ['coriander-powder', '2 tsp'], ['garam-masala', '1 tsp'], ['salt', 'to taste']],
    [
      ['Heat the oil, add the cumin and onion and fry until golden.', { timer: 360, uses: ['cumin', 'onion'] }],
      ['Add the ginger, garlic and green chilli and cook for a minute.', { timer: 60, uses: ['ginger', 'garlic', 'green-chilli'] }],
      ['Add the keema and fry on high heat, breaking up lumps, until it is no longer pink.', { timer: 360, uses: ['keema'] }],
      ['Add the tomato and powdered spices and cook until the oil separates.', { timer: 360, uses: ['tomato', 'turmeric', 'chilli-powder', 'coriander-powder', 'salt'] }],
      ['Add the peas and ½ cup of water. Cover and cook on low heat until the keema is tender.', { timer: 900, uses: ['peas'] }],
      ['Add the garam masala and coriander. Serve with pav or roti.', { uses: ['garam-masala', 'coriander'] }],
    ]),

  recipe('fish-fry', 'Mumbai Rava Fish Fry', { time: 25, level: 'Easy', serves: 2, diet: 'nonveg', spice: 3, cuisine: 'Coastal', moods: ['spicy'] },
    [['fish', '4 slices (surmai or pomfret)'], ['lemon', '1'], ['ginger', '½ inch, grated'], ['garlic', '4 cloves, crushed'], ['sooji', '½ cup'], ['oil', 'for shallow frying'], ['turmeric', '½ tsp'], ['chilli-powder', '1½ tsp'], ['salt', 'to taste']],
    [
      ['Rub the fish with lemon juice, ginger, garlic, turmeric, chilli powder and salt. Marinate for 15 minutes.', { timer: 900, uses: ['fish', 'lemon', 'ginger', 'garlic', 'turmeric', 'chilli-powder', 'salt'] }],
      ['Press each slice into the rava so both sides are well coated.', { uses: ['sooji'] }],
      ['Heat the oil in a pan and fry the fish on medium heat until golden on one side.', { timer: 240, uses: ['oil'] }],
      ['Flip gently and fry the other side until crisp.', { timer: 240, tip: 'Flip only once so the coating stays on.' }],
      ['Serve with onion rings and a lemon wedge.', {}],
    ],
    { sooji: 'No rava? Use rice flour, or besan mixed with a little rice flour.' }),

  recipe('prawns-masala', 'Prawns Masala', { time: 25, level: 'Medium', serves: 2, diet: 'nonveg', spice: 4, cuisine: 'Coastal', moods: ['spicy'] },
    [['prawns', '250 g, cleaned'], ['onion', '2, finely chopped'], ['tomato', '2, chopped'], ['ginger', '½ inch, grated'], ['garlic', '5 cloves, crushed'], ['green-chilli', '1'], ['coriander', 'a handful', true], ['lemon', '½', true], ['oil', '2 tbsp'], ['turmeric', '½ tsp'], ['chilli-powder', '1½ tsp'], ['coriander-powder', '1 tsp'], ['garam-masala', '½ tsp'], ['salt', 'to taste']],
    [
      ['Toss the prawns with turmeric and salt and keep aside.', { uses: ['prawns', 'turmeric', 'salt'] }],
      ['Heat the oil and fry the onion until golden.', { timer: 360, uses: ['onion'] }],
      ['Add the ginger, garlic and green chilli and cook for a minute.', { timer: 60, uses: ['ginger', 'garlic', 'green-chilli'] }],
      ['Add the tomato, chilli powder and coriander powder and cook until thick.', { timer: 300, uses: ['tomato', 'chilli-powder', 'coriander-powder'] }],
      ['Add the prawns and cook just until they turn pink and curl — overcooked prawns go rubbery.', { timer: 240, uses: ['prawns'] }],
      ['Finish with garam masala, lemon and coriander.', { uses: ['garam-masala', 'lemon', 'coriander'] }],
    ]),

  // ---------- sweet ----------
  recipe('sooji-halwa', 'Sooji Halwa (Sheera)', { time: 20, level: 'Easy', serves: 3, diet: 'veg', spice: 1, cuisine: 'Desserts', moods: ['sweet', 'comfort'] },
    [['sooji', '½ cup'], ['ghee', '¼ cup'], ['sugar', '½ cup'], ['milk', '1 cup', true], ['cashew', '8, chopped', true], ['cardamom', '3, crushed', true]],
    [
      ['Heat the milk (or water) with the sugar in a separate pot until the sugar dissolves. Keep it hot.', { uses: ['milk', 'sugar'] }],
      ['Melt the ghee in a heavy pan. Fry the cashews until golden and take them out.', { timer: 60, uses: ['ghee', 'cashew'] }],
      ['Add the sooji to the ghee and roast on low heat, stirring, until golden and fragrant.', { timer: 480, uses: ['sooji'] }],
      ['Carefully pour in the hot milk — it will splutter. Stir fast so no lumps form.', { tip: 'Stand back a little while pouring.' }],
      ['Cook until it leaves the sides of the pan. Add the cardamom and cashews and serve warm.', { timer: 180, uses: ['cardamom'] }],
    ],
    { milk: 'No milk? Use the same amount of water — that\'s the classic sheera.' }),

  recipe('rice-kheer', 'Rice Kheer', { time: 45, level: 'Easy', serves: 3, diet: 'veg', spice: 1, cuisine: 'Desserts', moods: ['sweet', 'comfort'] },
    [['milk', '1 litre (full cream)'], ['rice', '¼ cup, washed'], ['sugar', '⅓ cup'], ['cardamom', '4, crushed', true], ['cashew', '8, chopped', true]],
    [
      ['Bring the milk to a boil in a heavy pan.', { uses: ['milk'] }],
      ['Add the rice and simmer on low heat, stirring often so it doesn\'t stick, until the rice is soft and the milk thickens.', { timer: 1800, uses: ['rice'], tip: 'Scrape the bottom of the pan every few minutes.' }],
      ['Add the sugar and cook for 5 more minutes.', { timer: 300, uses: ['sugar'] }],
      ['Add the cardamom and cashews. Serve warm or chilled.', { uses: ['cardamom', 'cashew'] }],
    ]),

  // ---------- sides & drinks ----------
  recipe('onion-raita', 'Onion Tomato Raita', { time: 5, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'North Indian', moods: ['light'] },
    [['curd', '1 cup'], ['onion', '½, finely chopped'], ['tomato', '½, finely chopped', true], ['cucumber', '¼, grated', true], ['green-chilli', '½, chopped', true], ['coriander', 'a few leaves', true], ['cumin', '½ tsp, roasted and ground'], ['chilli-powder', 'a pinch'], ['salt', 'to taste']],
    [
      ['Whisk the curd until smooth. Add a little water if it is very thick.', { uses: ['curd'] }],
      ['Mix in the onion, tomato, cucumber and green chilli.', { uses: ['onion', 'tomato', 'cucumber', 'green-chilli'] }],
      ['Add the salt and roasted cumin, top with chilli powder and coriander, and serve chilled.', { uses: ['salt', 'cumin', 'chilli-powder', 'coriander'] }],
    ]),

  recipe('masala-chaas', 'Masala Chaas', { time: 5, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'Street food', moods: ['light'] },
    [['curd', '1 cup'], ['ginger', '¼ inch, grated', true], ['green-chilli', '½', true], ['coriander', 'a few leaves', true], ['curry-leaves', '4', true], ['cumin', '½ tsp, roasted and ground'], ['salt', 'to taste']],
    [
      ['Blend the curd with 2 cups of cold water, the ginger, green chilli and coriander.', { uses: ['curd', 'ginger', 'green-chilli', 'coriander'] }],
      ['Add the roasted cumin and salt and blend again for a few seconds.', { uses: ['cumin', 'salt'] }],
      ['Pour into glasses, tear in a few curry leaves and serve chilled.', { uses: ['curry-leaves'] }],
    ]),

  recipe('banana-milkshake', 'Banana Milkshake', { time: 5, level: 'Easy', serves: 2, diet: 'veg', spice: 1, cuisine: 'Desserts', moods: ['sweet', 'light'] },
    [['banana', '2 ripe'], ['milk', '2 cups, chilled'], ['sugar', '1–2 tbsp'], ['cardamom', 'a pinch', true]],
    [
      ['Peel and slice the bananas.', { uses: ['banana'] }],
      ['Blend with the cold milk, sugar and cardamom until smooth and frothy.', { uses: ['milk', 'sugar', 'cardamom'] }],
      ['Pour into glasses and drink straight away.', {}],
    ]),
];

// Fill in things the app needs from the ingredient list: what can be avoided,
// and quick lookups.
export const recipes = rows.map((r) => {
  const ids = r.ingredients.map(([id]) => id);
  const contains = [...new Set(ids.map((id) => PANTRY[id]?.avoid).filter(Boolean))];
  return { ...r, contains, core: r.ingredients.filter(([id, , optional]) => !optional && !BASICS.has(id)).map(([id]) => id) };
});

export const findRecipe = (id) => recipes.find((r) => r.id === id) ?? null;
