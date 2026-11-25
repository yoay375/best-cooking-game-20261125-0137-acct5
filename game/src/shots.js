// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a real game
// with the kitchen's own actions (grab, grill, plate, serve) and steps the rules forward
// in fixed 1/60 s steps, so the frame is what short play really looks like and the same
// seed always gives the same frame. The 'end' scene lets a simple cook-bot play a whole
// shift, so the summary screen shows a shift that was really played.

import { STEP, STATIONS } from './config.js';
import { EVENT_OVER } from './kitchen.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** Move the cook beside a station, then work it — the same two moves a player makes. */
function workAt(world, stationId, subId) {
  world.state.cookX = STATIONS[stationId].x;
  world.workStation(stationId, subId);
}

/** Run the kitchen forward `seconds` in fixed steps, doing nothing else. */
function idle(world, seconds) {
  for (let i = 0; i < seconds / STEP; i += 1) {
    world.step(STEP, { move: 0, interact: false, serve: false, trash: false, select: null });
  }
}

/**
 * The cook-bot: each step it looks at the first customer's ticket and does the next
 * job toward it — shell, then grilled meat, then salsa, then toppings, then serve.
 * It works the stations directly (the cook is already standing there in the frame).
 */
function botStep(world) {
  const state = world.state;
  const customer = state.customers[state.selected] ?? state.customers[0];
  if (!customer || state.over) return;
  const recipe = customer.recipe;
  const plate = state.plate;
  const carry = state.carry;

  if (!plate && !carry) {
    workAt(world, 'tortilla', recipe.shell);
    return;
  }
  if (carry && carry.kind === 'shell' && !plate) {
    workAt(world, 'plate', null);
    return;
  }
  if (plate && !plate.protein) {
    if (carry && carry.kind === 'protein' && carry.cooked) {
      workAt(world, 'plate', null);
      return;
    }
    // Take done meat off the grill first (only when the hands are free).
    for (let slot = 0; slot < 3; slot += 1) {
      const meat = state.grill[slot];
      if (meat && meat.protein === recipe.protein && meat.t >= 6 && meat.t < 11 && !carry) {
        workAt(world, 'grill', String(slot));
        return;
      }
    }
    // A burnt slot blocks the grill: clear it before cooking more.
    for (let slot = 0; slot < 3; slot += 1) {
      const meat = state.grill[slot];
      if (meat && meat.t >= 11 && !carry) {
        workAt(world, 'grill', String(slot));
        return;
      }
    }
    if (carry && carry.kind === 'protein' && !carry.cooked) {
      for (let slot = 0; slot < 3; slot += 1) {
        if (!state.grill[slot]) {
          workAt(world, 'grill', String(slot));
          return;
        }
      }
      // Grill full and hands full of raw meat: bin it so the done meat can be taken.
      workAt(world, 'trash', null);
      return;
    }
    if (!carry) {
      // Only start new meat when a grill slot is free; otherwise wait for the grill.
      if (state.grill.some((slot) => !slot)) {
        workAt(world, 'fridge', recipe.protein);
      }
      return;
    }
    return;
  }
  if (plate && plate.protein && !plate.salsa) {
    if (carry && carry.kind === 'salsa') {
      workAt(world, 'plate', null);
      return;
    }
    if (!carry) {
      workAt(world, 'salsa', recipe.salsa);
      return;
    }
    return;
  }
  if (plate && plate.salsa) {
    const missing = recipe.toppings.filter((topping) => !plate.toppings.includes(topping));
    if (missing.length > 0) {
      if (carry && carry.kind === 'topping') {
        workAt(world, 'plate', null);
        return;
      }
      if (!carry) {
        workAt(world, 'toppings', missing[0]);
        return;
      }
      return;
    }
    workAt(world, 'serve', null);
  }
}

/** Build the first customer's exact taco on the plate, step by step. */
function buildFirstCustomersTaco(world) {
  const customer = world.state.customers[0];
  if (!customer) return;
  const recipe = customer.recipe;
  workAt(world, 'tortilla', recipe.shell);
  workAt(world, 'plate', null);
  workAt(world, 'fridge', recipe.protein);
  workAt(world, 'grill', '0');
  idle(world, 7);
  workAt(world, 'grill', '0');
  workAt(world, 'plate', null);
  workAt(world, 'salsa', recipe.salsa);
  workAt(world, 'plate', null);
  for (const topping of recipe.toppings) {
    workAt(world, 'toppings', topping);
    workAt(world, 'plate', null);
  }
}

/**
 * Set `world` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    idle(world, 8);
    workAt(world, 'tortilla', 'soft');
    workAt(world, 'plate', null);
    workAt(world, 'fridge', 'beef');
    workAt(world, 'grill', '0');
    idle(world, 3);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'serve') {
    idle(world, 20);
    buildFirstCustomersTaco(world);
    world.state.cookX = STATIONS.serve.x;
    return { screen: SCREEN_PLAY, best: world.state.coins };
  }
  if (name === 'end') {
    for (let i = 0; i < 150 / STEP; i += 1) {
      botStep(world);
      if (world.step(STEP, { move: 0, interact: false, serve: false, trash: false, select: null }) & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.coins };
  }
  // Play: a busy mid-shift frame — orders on the board, meat on the grill,
  // a taco half-built on the plate, the cook carrying salsa.
  idle(world, 3);
  workAt(world, 'tortilla', 'soft');
  workAt(world, 'plate', null);
  workAt(world, 'fridge', 'beef');
  workAt(world, 'grill', '0');
  workAt(world, 'fridge', 'chicken');
  workAt(world, 'grill', '1');
  idle(world, 8);
  workAt(world, 'grill', '0');
  workAt(world, 'plate', null);
  workAt(world, 'salsa', 'mild');
  idle(world, 18);
  world.state.cookX = STATIONS.salsa.x;
  return { screen: SCREEN_PLAY, best: world.state.coins };
}
