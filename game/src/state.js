// Ember & Thyme — the shift itself: timers, orders, coins, combo and the
// little mulberry-seed random generator that keeps every shift different.

import { RECIPES, recipeById } from './recipes.js';

export const SHIFT_SECONDS = 150;
export const MAX_ORDERS = 3;
export const CHOPS_PER_ITEM = 3;
export const GRILL_SECONDS = 6;
export const BURN_SECONDS = 10;

export function makeRng(seed) {
  let a = seed >>> 0;
  if (a === 0) a = 0x9e3779b9;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function newShift(seed) {
  const rng = makeRng(seed);
  return {
    screen: 'title', // title | play | over
    paused: false,
    muted: false,
    seed,
    rng,
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    coins: 0,
    served: 0,
    lost: 0,
    combo: 0,
    bestCombo: 0,
    nextOrderId: 1,
    spawnIn: 1.2,
    orders: [],
    hand: null, // { ing, stage }
    board: null, // { ing, stage, chopsLeft }
    grill: [null, null], // { ing, stage, cook, cookMax, burnt }
    plate: [], // { ing, stage }
    readyDish: null, // recipe id the plate completes, or null
    message: '',
    messageT: 0,
    frozen: false, // staged screenshot scenes hold the clock still
    flash: null, // { text, color, t }
    sizzle: 0, // 0..1 grill activity for the sound layer
    stats: { chopped: 0, grilled: 0, trashed: 0 },
  };
}

function pickRecipe(rng, orders) {
  const open = orders.map((o) => o.recipeId);
  const pool = RECIPES.filter((r) => !open.includes(r.id));
  const list = pool.length > 0 ? pool : RECIPES;
  return list[Math.floor(rng() * list.length)];
}

/** Open a new order ticket on the board. Patience shrinks as the rush builds. */
export function spawnOrder(state) {
  if (state.orders.length >= MAX_ORDERS) return null;
  const recipe = pickRecipe(state.rng, state.orders);
  const rush = 1 - state.timeLeft / SHIFT_SECONDS;
  const patience = Math.max(30, 48 - rush * 14);
  const order = {
    id: state.nextOrderId++,
    recipeId: recipe.id,
    patience,
    maxPatience: patience,
  };
  state.orders.push(order);
  return order;
}

/** Advance clocks: shift timer, order patience, grill, messages. */
export function tickShift(state, dt) {
  if (state.screen !== 'play' || state.paused || state.frozen) return;
  state.elapsed += dt;
  state.timeLeft = Math.max(0, state.timeLeft - dt);

  state.spawnIn -= dt;
  if (state.spawnIn <= 0) {
    spawnOrder(state);
    const rush = 1 - state.timeLeft / SHIFT_SECONDS;
    state.spawnIn = Math.max(7, 15 - rush * 6);
  }

  for (let i = state.orders.length - 1; i >= 0; i--) {
    const order = state.orders[i];
    order.patience -= dt;
    if (order.patience <= 0) {
      state.orders.splice(i, 1);
      state.lost++;
      state.combo = 0;
      say(state, `Walked out — ${recipeById(order.recipeId).name} too slow`, '#ff8a6b');
      state.flash = { text: 'ORDER LOST', color: '#ff6b4a', t: 1.1 };
    }
  }

  let sizzling = false;
  for (const slot of state.grill) {
    if (!slot) continue;
    slot.cook += dt;
    sizzling = true;
    if (!slot.burnt && slot.cook >= BURN_SECONDS) {
      slot.burnt = true;
      say(state, 'Something burned on the hearth!', '#ff8a6b');
    }
  }
  state.sizzle = sizzling ? 1 : 0;

  if (state.messageT > 0) {
    state.messageT -= dt;
    if (state.messageT <= 0) state.message = '';
  }
  if (state.flash && state.flash.t > 0) state.flash.t -= dt;

  if (state.timeLeft <= 0) {
    state.screen = 'over';
    state.timeLeft = 0;
    say(state, '', 0);
  }
}

export function say(state, text, color) {
  state.message = text;
  state.messageT = 3.2;
  if (color) state.flash = { text, color, t: 0 };
}

/** Score a served dish: base price plus a patience tip, combo grows. */
export function scoreServe(state, order) {
  const recipe = recipeById(order.recipeId);
  const patienceShare = Math.max(0, order.patience / order.maxPatience);
  const tip = Math.round(patienceShare * 6);
  const earned = recipe.price + tip;
  state.coins += earned;
  state.served++;
  state.combo++;
  state.bestCombo = Math.max(state.bestCombo, state.combo);
  const comboNote = state.combo >= 3 ? `  Combo x${state.combo}!` : '';
  say(state, `Served ${recipe.name} — +${earned} coins${comboNote}`, '#ffd98a');
  state.flash = { text: `+${earned}`, color: '#ffd98a', t: 1.2 };
  return earned;
}

export function startShift(state) {
  const fresh = newShift(state.seed);
  fresh.screen = 'play';
  return fresh;
}

export function shiftGrade(state) {
  if (state.served >= 14) return 'Three Ember Stars — a legendary shift!';
  if (state.served >= 10) return 'Two Ember Stars — the hearth sings!';
  if (state.served >= 6) return 'One Ember Star — a solid shift.';
  return 'The hearth kept burning — practice makes the cook.';
}
