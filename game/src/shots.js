// Ember & Thyme — staged scenes for the maker's screenshots. Each one sets
// the shift to a real, playable moment (title, mid-assembly, plate ready,
// shift over) and freezes the clock so the render holds still.

import { recipeById } from './recipes.js';
import { spawnOrder } from './state.js';
import { refreshReadyDish } from './kitchen.js';

function fillOrders(state, count) {
  state.orders = [];
  for (let i = 0; i < count; i++) spawnOrder(state);
}

function setPatience(state, seconds) {
  for (const order of state.orders) {
    order.patience = seconds;
    order.maxPatience = 48;
  }
}

/** Put the shift into one of the four photographed moments. */
export function applyShot(state, name) {
  if (name === 'start') {
    state.screen = 'title';
    state.timeLeft = 150;
    state.coins = 0;
    state.served = 0;
    state.orders = [];
    return true;
  }
  if (name === 'play') {
    state.screen = 'play';
    state.frozen = true;
    state.timeLeft = 98;
    state.coins = 46;
    state.served = 3;
    state.combo = 2;
    fillOrders(state, 3);
    setPatience(state, 34);
    state.hand = { ing: 'onion', stage: 'raw' };
    state.board = { ing: 'tomato', stage: 'raw', chopsLeft: 1 };
    state.grill = [
      { ing: 'mushroom', stage: 'chopped', cook: 4, cookMax: 6, burnt: false },
      null,
    ];
    state.plate = [{ ing: 'tomato', stage: 'chopped' }];
    state.message = 'One dish mid-assembly — chop, grill, plate, serve!';
    state.messageT = 99;
    refreshReadyDish(state);
    return true;
  }
  if (name === 'serve') {
    state.screen = 'play';
    state.frozen = true;
    state.timeLeft = 61;
    state.coins = 78;
    state.served = 5;
    state.combo = 3;
    fillOrders(state, 3);
    setPatience(state, 40);
    const first = state.orders[0];
    const recipe = recipeById(first.recipeId);
    state.plate = recipe.needs.map((n) => ({ ing: n.ing, stage: n.stage }));
    state.board = null;
    state.grill = [null, null];
    state.hand = null;
    state.message = `${recipe.name} is plated — ring the bell!`;
    state.messageT = 99;
    refreshReadyDish(state);
    return true;
  }
  if (name === 'end') {
    state.screen = 'over';
    state.timeLeft = 0;
    state.coins = 214;
    state.served = 12;
    state.lost = 2;
    state.bestCombo = 5;
    state.combo = 0;
    state.orders = [];
    state.plate = [];
    state.message = '';
    return true;
  }
  return false;
}
