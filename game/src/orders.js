// Festival customers and their taco orders: who shows up, what they ask for, how long
// they will wait, and whether the taco on the plate is the one they ordered.
//
// A recipe is a shell, a protein, a salsa and a set of toppings. Early in a shift the
// orders are short (one topping); as the festival crowd grows, orders ask for more.

import { ORDERS, PATIENCE, PROTEINS, SALSAS, SHELLS, TOPPINGS, VIP } from './config.js';
import { pick, rollInt } from './random.js';

export const CUSTOMER_NAMES = [
  'Maya', 'Rio', 'Luna', 'Diego', 'Sofia', 'Mateo', 'Nina', 'Pablo',
  'Carmen', 'Felix', 'Rosa', 'Hugo', 'Elena', 'Omar', 'Lila', 'Tomas',
];

/** Festival faces: skin, hat and shirt, picked from the customer's seed. */
const SKINS = ['#f2c89b', '#e8b07e', '#c98d5f', '#8d5a3b', '#f7d7b0'];
const HATS = ['sombrero', 'cap', 'bandana', 'hair', 'beanie'];
const SHIRTS = ['#e5484d', '#2a9d8f', '#ffd166', '#7b61ff', '#f4845f', '#06d6a0'];

/**
 * Deal one order. `toppingCount` grows with the shift so later customers ask for more.
 * The toppings are a set: no topping repeats on one ticket.
 */
export function dealRecipe(random, toppingCount) {
  const wanted = [];
  const pool = [...TOPPINGS];
  while (wanted.length < toppingCount && pool.length > 0) {
    wanted.push(pool.splice(Math.floor(random() * pool.length), 1)[0]);
  }
  return {
    shell: pick(random, SHELLS),
    protein: pick(random, PROTEINS),
    salsa: pick(random, SALSAS),
    toppings: wanted,
  };
}

/**
 * A customer waiting at the truck: their face, their order and their patience.
 * A VIP (every VIP.every-th customer) pays double but only waits VIP.patience seconds.
 */
export function spawnFestivalCustomer(random, id, elapsed, vip = false) {
  const toppingCount = elapsed < 45 ? 1 : elapsed < 100 ? 2 : 3;
  const patience = vip ? VIP.patience : PATIENCE.start;
  return {
    id,
    name: pick(random, CUSTOMER_NAMES),
    faceSeed: rollInt(random, 0, 100000),
    skin: pick(random, SKINS),
    hat: pick(random, HATS),
    shirt: pick(random, SHIRTS),
    recipe: dealRecipe(random, toppingCount),
    patience,
    maxPatience: patience,
    vip,
    mood: 'waiting',
    moodTimer: 0,
  };
}

/** Does the taco on the plate match this customer's order, topping for topping? */
export function recipeMatchesOrder(taco, recipe) {
  if (!taco || !taco.shell || !taco.protein || !taco.salsa) return false;
  if (taco.shell !== recipe.shell) return false;
  if (taco.protein !== recipe.protein) return false;
  if (taco.salsa !== recipe.salsa) return false;
  if (taco.toppings.length !== recipe.toppings.length) return false;
  return recipe.toppings.every((topping) => taco.toppings.includes(topping));
}

/** How full a customer's patience bar is, 1 when they just arrived, 0 when they walk off. */
export function patienceFraction(customer) {
  return Math.max(0, customer.patience / customer.maxPatience);
}

/** The next order arrives on this schedule: faster once rush hour starts. */
export function nextOrderDelay(elapsed, shiftSeconds, rushSeconds) {
  const rush = shiftSeconds - elapsed <= rushSeconds;
  return rush ? ORDERS.rushInterval : ORDERS.interval;
}
