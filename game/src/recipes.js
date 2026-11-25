// Ember & Thyme — the pantry: every ingredient and every dish on the menu.
// An ingredient travels raw -> chopped (board) -> grilled (hearth). A recipe
// lists what must sit on the plate, with the stage each piece must reach.

export const INGREDIENTS = [
  { id: 'tomato', name: 'Tomato', key: '1', color: '#d9382b', dark: '#8f1d14', cut: '#ff7a5c', note: 'sweet, loves the fire' },
  { id: 'onion', name: 'Onion', key: '2', color: '#e8dcc3', dark: '#a08c5f', cut: '#fff6dd', note: 'chop it and weep' },
  { id: 'mushroom', name: 'Mushroom', key: '3', color: '#c9a06a', dark: '#7d5a33', cut: '#f0d9ae', note: 'grills golden' },
  { id: 'pepper', name: 'Pepper', key: '4', color: '#3f9e4d', dark: '#1f5c28', cut: '#7ed491', note: 'a green crunch' },
  { id: 'cheese', name: 'Cheese', key: '5', color: '#f2c230', dark: '#a67c10', cut: '#ffe27a', note: 'melts on contact' },
  { id: 'bread', name: 'Bread', key: '6', color: '#b5762f', dark: '#6e4517', cut: '#e0aa5e', note: 'the plate itself' },
];

export const STAGES = {
  raw: { label: 'raw', verb: 'chop' },
  chopped: { label: 'chopped', verb: 'grill' },
  grilled: { label: 'grilled', verb: 'plate' },
};

export const RECIPES = [
  {
    id: 'tomato-soup',
    name: 'Ember Tomato Soup',
    blurb: 'Slow-simmered, wood-fired',
    price: 14,
    needs: [
      { ing: 'tomato', stage: 'chopped' },
      { ing: 'onion', stage: 'chopped' },
    ],
  },
  {
    id: 'mushroom-melt',
    name: 'Hearth Mushroom Melt',
    blurb: 'Grilled caps, molten cheese',
    price: 18,
    needs: [
      { ing: 'mushroom', stage: 'grilled' },
      { ing: 'cheese', stage: 'raw' },
      { ing: 'bread', stage: 'raw' },
    ],
  },
  {
    id: 'pepper-skillet',
    name: 'Pepper Skillet',
    blurb: 'Charred, bright, fast',
    price: 20,
    needs: [
      { ing: 'pepper', stage: 'chopped' },
      { ing: 'tomato', stage: 'grilled' },
      { ing: 'mushroom', stage: 'chopped' },
    ],
  },
  {
    id: 'garden-flatbread',
    name: 'Garden Flatbread',
    blurb: 'From the oven, still warm',
    price: 16,
    needs: [
      { ing: 'bread', stage: 'raw' },
      { ing: 'tomato', stage: 'chopped' },
      { ing: 'cheese', stage: 'raw' },
    ],
  },
  {
    id: 'onion-stew',
    name: 'Onion Ember Stew',
    blurb: 'The house legend',
    price: 22,
    needs: [
      { ing: 'onion', stage: 'grilled' },
      { ing: 'mushroom', stage: 'grilled' },
      { ing: 'pepper', stage: 'chopped' },
    ],
  },
];

export function ingredientById(id) {
  return INGREDIENTS.find((g) => g.id === id) || null;
}

export function recipeById(id) {
  return RECIPES.find((r) => r.id === id) || null;
}

/** A short label for one needed piece, e.g. "chopped tomato". */
export function needLabel(need) {
  const g = ingredientById(need.ing);
  if (!g) return need.ing;
  return need.stage === 'raw' ? g.name : `${need.stage} ${g.name.toLowerCase()}`;
}

/** True when the plate's pieces cover the recipe exactly (order ignored). */
export function plateMatchesRecipe(plate, recipe) {
  if (plate.length !== recipe.needs.length) return false;
  const have = plate.map((p) => `${p.ing}:${p.stage}`).sort().join('|');
  const want = recipe.needs.map((n) => `${n.ing}:${n.stage}`).sort().join('|');
  return have === want;
}

/** How many of the recipe's needs the plate already satisfies. */
export function plateProgress(plate, recipe) {
  const have = plate.map((p) => `${p.ing}:${p.stage}`);
  let hit = 0;
  for (const n of recipe.needs) {
    const key = `${n.ing}:${n.stage}`;
    const at = have.indexOf(key);
    if (at >= 0) {
      hit++;
      have.splice(at, 1);
    }
  }
  return hit;
}
