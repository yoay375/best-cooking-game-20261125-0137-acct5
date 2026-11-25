// Ember & Thyme — hands on the stations: grabbing, chopping, grilling,
// plating, serving and binning. Every action answers at once and says why
// when it cannot happen.

import { ingredientById, plateMatchesRecipe, plateProgress, recipeById } from './recipes.js';
import { CHOPS_PER_ITEM, GRILL_SECONDS, say, scoreServe, spawnOrder } from './state.js';

/** Take a raw ingredient from its bin into the hand. */
export function grabIngredient(state, ingId) {
  const g = ingredientById(ingId);
  if (!g) return false;
  if (state.hand) {
    say(state, 'Hands full — put this down first (T to bin it)', '#ffb347');
    return false;
  }
  state.hand = { ing: ingId, stage: 'raw' };
  say(state, `Picked up ${g.name}`, '');
  return true;
}

/** Put the hand's ingredient on the chopping board. */
export function placeOnBoard(state) {
  if (!state.hand) {
    say(state, 'Grab an ingredient first', '#ffb347');
    return false;
  }
  if (state.board) {
    say(state, 'The board is busy', '#ffb347');
    return false;
  }
  if (state.hand.stage !== 'raw') {
    say(state, 'Only raw ingredients go on the board', '#ffb347');
    return false;
  }
  state.board = { ing: state.hand.ing, stage: 'raw', chopsLeft: CHOPS_PER_ITEM };
  state.hand = null;
  return true;
}

/** One chop on the board; three chops finish the piece. */
export function chopOnce(state) {
  if (!state.board) {
    if (state.hand && state.hand.stage === 'raw') return placeOnBoard(state);
    say(state, 'Nothing on the board to chop', '#ffb347');
    return 'empty';
  }
  state.board.chopsLeft--;
  state.stats.chopped++;
  if (state.board.chopsLeft <= 0) {
    state.board.stage = 'chopped';
    say(state, `${ingredientById(state.board.ing).name} chopped`, '#bfe8a8');
    return 'done';
  }
  return 'chop';
}

/** Take the finished chopped piece back into the hand. */
export function takeFromBoard(state) {
  if (!state.board || state.board.stage !== 'chopped') return false;
  if (state.hand) return false;
  state.hand = { ing: state.board.ing, stage: 'chopped' };
  state.board = null;
  return true;
}

/** Lay the hand's chopped piece on a free grill slot. */
export function placeOnGrill(state, slotIndex) {
  if (!state.hand) {
    say(state, 'Grab a chopped ingredient first', '#ffb347');
    return false;
  }
  if (state.hand.stage !== 'chopped') {
    say(state, 'Chop it on the board before the fire', '#ffb347');
    return false;
  }
  const slot = state.grill[slotIndex];
  if (slot) {
    say(state, 'That grill spot is taken', '#ffb347');
    return false;
  }
  state.grill[slotIndex] = {
    ing: state.hand.ing,
    stage: 'chopped',
    cook: 0,
    cookMax: GRILL_SECONDS,
    burnt: false,
  };
  state.hand = null;
  say(state, 'On the hearth — watch the flames', '');
  return true;
}

/** Pull a finished grilled piece off the grill into the hand. */
export function takeFromGrill(state, slotIndex) {
  const slot = state.grill[slotIndex];
  if (!slot) return false;
  if (state.hand) return false;
  if (slot.burnt) {
    say(state, 'Burnt! Bin it and start over', '#ff8a6b');
    return false;
  }
  if (slot.cook < slot.cookMax) {
    say(state, 'Still cooking — give it a moment', '#ffb347');
    return false;
  }
  state.hand = { ing: slot.ing, stage: 'grilled' };
  state.grill[slotIndex] = null;
  state.stats.grilled++;
  return true;
}

/** Stack the hand's piece on the serving plate. */
export function placeOnPlate(state) {
  if (!state.hand) {
    say(state, 'Nothing in hand to plate', '#ffb347');
    return false;
  }
  if (state.plate.length >= 3) {
    say(state, 'The plate is full — serve it or bin it', '#ffb347');
    return false;
  }
  state.plate.push({ ing: state.hand.ing, stage: state.hand.stage });
  state.hand = null;
  refreshReadyDish(state);
  return true;
}

/** Work out whether the plate now completes an open order. */
export function refreshReadyDish(state) {
  state.readyDish = null;
  for (const order of state.orders) {
    const recipe = recipeById(order.recipeId);
    if (plateMatchesRecipe(state.plate, recipe)) {
      state.readyDish = order.id;
      return;
    }
  }
}

/** Serve the plate at the window when it matches an order. */
export function servePlate(state) {
  if (state.plate.length === 0) {
    say(state, 'The plate is empty', '#ffb347');
    return false;
  }
  refreshReadyDish(state);
  if (!state.readyDish) {
    const best = bestMatch(state);
    if (best) {
      const recipe = recipeById(best.recipeId);
      const hit = plateProgress(state.plate, recipe);
      say(state, `Not ${recipe.name} yet — ${hit}/${recipe.needs.length} pieces right`, '#ffb347');
    } else {
      say(state, 'No order wants this plate — bin it (T)', '#ff8a6b');
    }
    return false;
  }
  const order = state.orders.find((o) => o.id === state.readyDish);
  if (!order) return false;
  scoreServe(state, order);
  state.orders = state.orders.filter((o) => o.id !== order.id);
  state.plate = [];
  state.readyDish = null;
  spawnOrder(state);
  return true;
}

/** The open order the current plate is closest to completing. */
export function bestMatch(state) {
  let best = null;
  let bestHit = 0;
  for (const order of state.orders) {
    const recipe = recipeById(order.recipeId);
    const hit = plateProgress(state.plate, recipe);
    if (hit > bestHit) {
      bestHit = hit;
      best = order;
    }
  }
  return bestHit > 0 ? best : null;
}

/** Bin whatever is in the hand, on the board, or on the plate. */
export function binHand(state) {
  if (state.hand) {
    state.hand = null;
    state.stats.trashed++;
    say(state, 'Binned', '');
    return true;
  }
  if (state.board) {
    state.board = null;
    state.stats.trashed++;
    say(state, 'Board cleared', '');
    return true;
  }
  if (state.plate.length > 0) {
    state.plate = [];
    state.readyDish = null;
    state.stats.trashed++;
    say(state, 'Plate cleared', '');
    return true;
  }
  say(state, 'Nothing to bin', '#ffb347');
  return false;
}

/** Bin one burnt grill slot. */
export function binGrillSlot(state, slotIndex) {
  if (!state.grill[slotIndex]) return false;
  state.grill[slotIndex] = null;
  state.stats.trashed++;
  say(state, 'Burnt piece binned', '');
  return true;
}
