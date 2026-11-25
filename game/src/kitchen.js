// Taco Truck Fiesta — the kitchen itself: the cook, what their hands hold, the grill,
// the assembly plate, the waiting customers and the shift clock. No drawing and no
// browser in here: step() advances one fixed step and reports what happened as bit
// flags, so the caller can play a sound or announce it without the kitchen knowing.

import {
  COOK, GRILL, ORDERS, PATIENCE, PRICES, RUSH_SECONDS, SHIFT_SECONDS, VIP,
  STATIONS, STATION_FRIDGE, STATION_GRILL, STATION_PLATE, STATION_SALSA,
  STATION_SERVE, STATION_TORTILLA, STATION_TOPPINGS, STATION_TRASH,
} from './config.js';
import { nextOrderDelay, patienceFraction, recipeMatchesOrder, spawnFestivalCustomer } from './orders.js';

export const EVENT_PICKUP = 1;
export const EVENT_PLACE = 2;
export const EVENT_SIZZLE = 4;
export const EVENT_SERVED = 8;
export const EVENT_WRONG = 16;
export const EVENT_LEFT = 32;
export const EVENT_COMBO = 64;
export const EVENT_BURN = 128;
export const EVENT_DENY = 256;
export const EVENT_OVER = 512;
export const EVENT_TICK = 1024;
export const EVENT_PERFECT = 2048;

/** The plate is complete when it holds a shell, a cooked protein and a salsa. */
export function tacoIsComplete(taco) {
  return !!taco && !!taco.shell && !!taco.protein && !!taco.salsa;
}

/** A grill slot's meat is ready between done and burnt. */
export function grillSlotState(slot) {
  if (!slot) return 'empty';
  if (slot.t < GRILL.cookSeconds) return 'cooking';
  if (slot.t < GRILL.cookSeconds + GRILL.perfectSeconds) return 'done';
  return 'burnt';
}

export function createKitchen(random) {
  const state = {
    timeLeft: SHIFT_SECONDS,
    elapsed: 0,
    coins: 0,
    combo: 0,
    bestCombo: 0,
    served: 0,
    missed: 0,
    wrongServes: 0,
    perfectServes: 0,
    customers: [],
    selected: 0,
    cookX: COOK.startX,
    walkTarget: null,
    walkAction: null,
    carry: null,
    grill: [null, null, null],
    plate: null,
    spawnTimer: ORDERS.firstAt,
    nextCustomerId: 1,
    flash: null,
    flashTimer: 0,
    over: false,
    stars: 0,
    tickedSecond: -1,
  };

  function reset() {
    state.timeLeft = SHIFT_SECONDS;
    state.elapsed = 0;
    state.coins = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.served = 0;
    state.missed = 0;
    state.wrongServes = 0;
    state.perfectServes = 0;
    state.customers = [];
    state.selected = 0;
    state.cookX = COOK.startX;
    state.walkTarget = null;
    state.walkAction = null;
    state.carry = null;
    state.grill = [null, null, null];
    state.plate = null;
    state.spawnTimer = ORDERS.firstAt;
    state.nextCustomerId = 1;
    state.flash = null;
    state.flashTimer = 0;
    state.over = false;
    state.stars = 0;
    state.tickedSecond = -1;
  }

  function showFlash(text) {
    state.flash = text;
    state.flashTimer = 2.2;
  }

  function selectedCustomer() {
    return state.customers[state.selected] ?? state.customers[0] ?? null;
  }

  /** Walk to a station and work it on arrival (mouse play). */
  function walkToStation(stationId, subId) {
    const station = STATIONS[stationId];
    if (!station) return;
    state.walkTarget = station.x;
    state.walkAction = { station: stationId, sub: subId ?? null };
  }

  /** The station nearest the cook, when the cook stands close enough to work it. */
  function nearestStation() {
    let best = null;
    let bestDistance = Infinity;
    for (const [id, station] of Object.entries(STATIONS)) {
      const distance = Math.abs(state.cookX - station.x);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = id;
      }
    }
    return bestDistance <= COOK.reach ? best : null;
  }

  /**
   * The smart grab (keyboard E): at a bin station it takes the item the selected
   * customer's order still needs, so a keyboard-only cook can still play fast.
   */
  function smartSubFor(stationId) {
    const customer = selectedCustomer();
    if (!customer) return null;
    const recipe = customer.recipe;
    const plate = state.plate;
    if (stationId === STATION_FRIDGE) return recipe.protein;
    if (stationId === STATION_TORTILLA) return recipe.shell;
    if (stationId === STATION_SALSA) return recipe.salsa;
    if (stationId === STATION_TOPPINGS) {
      for (const topping of recipe.toppings) {
        if (!plate || !plate.toppings.includes(topping)) return topping;
      }
      return recipe.toppings[0] ?? null;
    }
    return null;
  }

  function workStation(stationId, subId) {
    let events = 0;
    const carry = state.carry;
    switch (stationId) {
      case STATION_FRIDGE: {
        if (carry) { showFlash('Hands full — serve or trash it first'); return EVENT_DENY; }
        state.carry = { kind: 'protein', protein: subId, cooked: false };
        return EVENT_PICKUP;
      }
      case STATION_TORTILLA: {
        if (carry) { showFlash('Hands full — serve or trash it first'); return EVENT_DENY; }
        state.carry = { kind: 'shell', shell: subId };
        return EVENT_PICKUP;
      }
      case STATION_SALSA: {
        if (carry) { showFlash('Hands full — serve or trash it first'); return EVENT_DENY; }
        state.carry = { kind: 'salsa', salsa: subId };
        return EVENT_PICKUP;
      }
      case STATION_TOPPINGS: {
        if (carry) { showFlash('Hands full — serve or trash it first'); return EVENT_DENY; }
        state.carry = { kind: 'topping', topping: subId };
        return EVENT_PICKUP;
      }
      case STATION_GRILL: {
        const slotIndex = Number.parseInt(subId ?? '0', 10);
        const slot = state.grill[slotIndex];
        const slotState = grillSlotState(slot);
        if (!slot) {
          if (carry && carry.kind === 'protein' && !carry.cooked) {
            state.grill[slotIndex] = { protein: carry.protein, t: 0 };
            state.carry = null;
            return EVENT_SIZZLE;
          }
          if (carry) { showFlash('Only raw meat goes on the grill'); return EVENT_DENY; }
          return 0;
        }
        if (slotState === 'burnt') {
          state.grill[slotIndex] = null;
          showFlash('Burnt! Tossed in the bin');
          return EVENT_BURN;
        }
        if (slotState === 'done') {
          if (carry) { showFlash('Hands full — put the meat down first'); return EVENT_DENY; }
          // Meat pulled off inside the perfect window keeps a golden sear.
          const perfect = slot.t < GRILL.cookSeconds + GRILL.perfectWindowSeconds;
          state.carry = { kind: 'protein', protein: slot.protein, cooked: true, perfect };
          state.grill[slotIndex] = null;
          if (perfect) showFlash('Perfect grill! That sear is worth a bonus');
          return EVENT_PICKUP;
        }
        showFlash('Still sizzling… give it a moment');
        return EVENT_DENY;
      }
      case STATION_PLATE: {
        events = addCarriedToPlate();
        return events;
      }
      case STATION_SERVE: {
        return serveTacoToCustomer();
      }
      case STATION_TRASH: {
        if (carry) {
          state.carry = null;
          return EVENT_PLACE;
        }
        if (state.plate) {
          state.plate = null;
          showFlash('Plate cleared — start a fresh taco');
          return EVENT_PLACE;
        }
        return 0;
      }
      default:
        return 0;
    }
  }

  /** Put whatever the cook carries onto the assembly plate, when it belongs there. */
  function addCarriedToPlate() {
    const carry = state.carry;
    if (!carry) {
      if (state.plate) showFlash('Taco on the plate — finish it, then serve');
      return 0;
    }
    if (carry.kind === 'shell') {
      if (state.plate) { showFlash('One taco at a time on the plate'); return EVENT_DENY; }
      state.plate = { shell: carry.shell, protein: null, salsa: null, toppings: [] };
      state.carry = null;
      return EVENT_PLACE;
    }
    if (!state.plate) {
      showFlash('Start with a tortilla on the plate');
      return EVENT_DENY;
    }
    if (carry.kind === 'protein') {
      if (!carry.cooked) { showFlash('Cook it on the grill first!'); return EVENT_DENY; }
      if (state.plate.protein) { showFlash('This taco already has meat'); return EVENT_DENY; }
      state.plate.protein = carry.protein;
      state.plate.perfect = !!carry.perfect;
      state.carry = null;
      return EVENT_PLACE;
    }
    if (carry.kind === 'salsa') {
      if (state.plate.salsa) { showFlash('This taco already has salsa'); return EVENT_DENY; }
      state.plate.salsa = carry.salsa;
      state.carry = null;
      return EVENT_PLACE;
    }
    if (carry.kind === 'topping') {
      if (state.plate.toppings.includes(carry.topping)) {
        showFlash('That topping is already on');
        return EVENT_DENY;
      }
      state.plate.toppings.push(carry.topping);
      state.carry = null;
      return EVENT_PLACE;
    }
    return 0;
  }

  /** Serve the plated taco to the selected customer (or the first in line). */
  function serveTacoToCustomer() {
    const customer = selectedCustomer();
    if (!customer) {
      showFlash('No customer waiting — cook when they arrive');
      return EVENT_DENY;
    }
    if (!tacoIsComplete(state.plate)) {
      showFlash('Taco needs shell + meat + salsa before serving');
      return EVENT_DENY;
    }
    const taco = state.plate;
    state.plate = null;
    if (recipeMatchesOrder(taco, customer.recipe)) {
      const tip = Math.round(PRICES.maxTip * patienceFraction(customer));
      const rush = state.timeLeft <= RUSH_SECONDS ? PRICES.rushBonus : 0;
      // A VIP pays double on the base price and the tip.
      let pay = (PRICES.base + tip) * (customer.vip ? VIP.payMultiplier : 1) + rush;
      let events = EVENT_SERVED;
      let bonusText = '';
      if (taco.perfect) {
        pay += PRICES.perfectBonus;
        state.perfectServes += 1;
        events |= EVENT_PERFECT;
        bonusText += ` ¡Perfecto! +${PRICES.perfectBonus}`;
      }
      if (patienceFraction(customer) >= PRICES.speedyPatience) {
        pay += PRICES.speedyBonus;
        events |= EVENT_PERFECT;
        bonusText += ` Speedy serve! +${PRICES.speedyBonus}`;
      }
      state.coins += pay;
      state.combo += 1;
      state.bestCombo = Math.max(state.bestCombo, state.combo);
      state.served += 1;
      customer.mood = 'happy';
      customer.moodTimer = 1.2;
      state.customers = state.customers.filter((c) => c !== customer);
      if (state.selected >= state.customers.length) state.selected = Math.max(0, state.customers.length - 1);
      if (customer.vip) bonusText = ` VIP pays double!${bonusText}`;
      if (bonusText) showFlash(`Served ${customer.name} +${pay} coins!${bonusText}`);
      if (state.combo > 0 && state.combo % PRICES.comboBonusEvery === 0) {
        state.coins += PRICES.comboBonus;
        events |= EVENT_COMBO;
      }
      return events;
    }
    customer.patience = Math.max(0, customer.patience - PATIENCE.wrongOrderPenalty);
    customer.mood = 'angry';
    customer.moodTimer = 1.2;
    state.combo = 0;
    state.wrongServes += 1;
    showFlash(`Wrong order! ${customer.name} wanted something else`);
    return EVENT_WRONG;
  }

  function endShift() {
    state.over = true;
    state.stars = state.served >= 18 ? 3 : state.served >= 12 ? 2 : state.served >= 6 ? 1 : 0;
    state.walkTarget = null;
    state.walkAction = null;
  }

  /**
   * One fixed step. `move` is -1, 0 or 1 from the keys; `interact` works the nearest
   * station (keyboard E); `serve`/`trash` are shortcuts for those stations.
   */
  function step(dt, commands) {
    let events = 0;
    if (state.over) return events;

    state.elapsed += dt;
    state.timeLeft = Math.max(0, SHIFT_SECONDS - state.elapsed);
    if (state.flashTimer > 0) {
      state.flashTimer -= dt;
      if (state.flashTimer <= 0) state.flash = null;
    }

    // The clock ticks out loud in the last ten seconds.
    const wholeSecond = Math.ceil(state.timeLeft);
    if (state.timeLeft <= 10 && wholeSecond !== state.tickedSecond) {
      state.tickedSecond = wholeSecond;
      events |= EVENT_TICK;
    }

    // Walk: keys steer directly; a clicked station is a destination with a job on arrival.
    if (commands.move !== 0) {
      state.walkTarget = null;
      state.walkAction = null;
      state.cookX += commands.move * COOK.speed * dt;
    } else if (state.walkTarget !== null) {
      const distance = state.walkTarget - state.cookX;
      const stride = COOK.speed * dt;
      if (Math.abs(distance) <= stride) {
        state.cookX = state.walkTarget;
        state.walkTarget = null;
        if (state.walkAction) {
          events |= workStation(state.walkAction.station, state.walkAction.sub);
          state.walkAction = null;
        }
      } else {
        state.cookX += Math.sign(distance) * stride;
      }
    }
    state.cookX = Math.min(1240, Math.max(340, state.cookX));

    if (commands.interact) {
      const station = nearestStation();
      if (station) {
        const sub = commands.interactSub ?? smartSubFor(station);
        events |= workStation(station, sub);
      }
    }
    if (commands.serve) events |= workStation(STATION_SERVE, null);
    if (commands.trash) events |= workStation(STATION_TRASH, null);
    if (commands.select !== null && commands.select !== undefined) {
      if (commands.select >= 0 && commands.select < state.customers.length) state.selected = commands.select;
    }

    // The grill cooks; meat left too long burns.
    for (let index = 0; index < state.grill.length; index += 1) {
      const slot = state.grill[index];
      if (slot) slot.t += dt;
    }

    // New customers arrive on the festival schedule, up to a full board.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0 && state.customers.length < ORDERS.maxQueue) {
      // Every VIP.every-th arrival is a festival VIP: double pay, short patience.
      const vip = state.nextCustomerId % VIP.every === 0;
      state.customers.push(spawnFestivalCustomer(random, state.nextCustomerId, state.elapsed, vip));
      state.nextCustomerId += 1;
      state.spawnTimer = nextOrderDelay(state.elapsed, SHIFT_SECONDS, RUSH_SECONDS);
    } else if (state.spawnTimer <= 0) {
      state.spawnTimer = 2;
    }

    // Patience drains; a customer who runs out walks off angry.
    for (let index = state.customers.length - 1; index >= 0; index -= 1) {
      const customer = state.customers[index];
      customer.patience -= dt;
      if (customer.moodTimer > 0) customer.moodTimer -= dt;
      else if (customer.mood !== 'waiting') customer.mood = 'waiting';
      if (customer.patience <= 0) {
        state.customers.splice(index, 1);
        state.missed += 1;
        state.combo = 0;
        if (state.selected >= state.customers.length) state.selected = Math.max(0, state.customers.length - 1);
        showFlash(`${customer.name} walked off hungry!`);
        events |= EVENT_LEFT;
      }
    }

    if (state.timeLeft <= 0) {
      endShift();
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return {
    state, reset, step, walkToStation, workStation, nearestStation,
    selectedCustomer, serveTacoToCustomer, addCarriedToPlate, smartSubFor,
  };
}
