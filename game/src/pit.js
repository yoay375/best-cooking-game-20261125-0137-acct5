// Smokehouse BBQ — the pit itself: the pitmaster, what their hands hold, the smoker,
// the plating board, the waiting guests and the shift clock. No drawing and no browser
// in here: advance() moves one fixed tick and reports what happened as bit flags, so
// the caller can play a sound or announce it without the pit knowing.

import {
  ARRIVALS, FRIDGE, PATIENCE, PAY, PITMASTER, PLATE_ST, RUSH_TAIL, SAUCE_ST,
  SERVE_ST, SIDES_ST, SHIFT_LENGTH, SMOKER, SMOKER_ST, STATIONS, TRASH_ST, VIP,
} from './tuning.js';
import { makePatron, nextArrivalIn, patienceLeft, plateMatches } from './patrons.js';

export const EV_TAKE = 1;
export const EV_PUT = 2;
export const EV_SMOKE = 4;
export const EV_SERVED = 8;
export const EV_WRONG = 16;
export const EV_LEFT = 32;
export const EV_STREAK = 64;
export const EV_BURNT = 128;
export const EV_DENY = 256;
export const EV_OVER = 512;
export const EV_TICK = 1024;
export const EV_PRIME = 2048;

/** A plate is ready to serve when it holds meat, sauce and a side. */
export function plateReady(plate) {
  return !!plate && !!plate.meat && !!plate.sauce && !!plate.side;
}

/** What a smoker rack holds right now: empty, smoking, ready, or burnt. */
export function rackState(rack) {
  if (!rack) return 'empty';
  if (rack.age < SMOKER.readyAt) return 'smoking';
  if (rack.age < SMOKER.primeUntil) return 'ready';
  return 'burnt';
}

export function makePit(rng) {
  const pit = {
    clock: SHIFT_LENGTH,
    played: 0,
    purse: 0,
    streak: 0,
    bestStreak: 0,
    served: 0,
    lost: 0,
    wrong: 0,
    primePlates: 0,
    guests: [],
    picked: 0,
    chefX: PITMASTER.startX,
    goalX: null,
    goalJob: null,
    hands: null,
    racks: [null, null, null],
    plate: null,
    arrivalTimer: ARRIVALS.first,
    guestNo: 1,
    banner: null,
    bannerLeft: 0,
    done: false,
    stars: 0,
    lastTick: -1,
  };

  function reset() {
    pit.clock = SHIFT_LENGTH;
    pit.played = 0;
    pit.purse = 0;
    pit.streak = 0;
    pit.bestStreak = 0;
    pit.served = 0;
    pit.lost = 0;
    pit.wrong = 0;
    pit.primePlates = 0;
    pit.guests = [];
    pit.picked = 0;
    pit.chefX = PITMASTER.startX;
    pit.goalX = null;
    pit.goalJob = null;
    pit.hands = null;
    pit.racks = [null, null, null];
    pit.plate = null;
    pit.arrivalTimer = ARRIVALS.first;
    pit.guestNo = 1;
    pit.banner = null;
    pit.bannerLeft = 0;
    pit.done = false;
    pit.stars = 0;
    pit.lastTick = -1;
  }

  function shout(text) {
    pit.banner = text;
    pit.bannerLeft = 2.2;
  }

  function pickedGuest() {
    return pit.guests[pit.picked] ?? pit.guests[0] ?? null;
  }

  /** Walk to a station and work it on arrival (mouse play). */
  function goTo(stationId, binId) {
    const st = STATIONS[stationId];
    if (!st) return;
    pit.goalX = st.x;
    pit.goalJob = { station: stationId, bin: binId ?? null };
  }

  /** The station nearest the pitmaster, when they stand close enough to work it. */
  function closestStation() {
    let nearest = null;
    let nearestGap = Infinity;
    for (const [id, st] of Object.entries(STATIONS)) {
      const gap = Math.abs(pit.chefX - st.x);
      if (gap < nearestGap) {
        nearestGap = gap;
        nearest = id;
      }
    }
    return nearestGap <= PITMASTER.reach ? nearest : null;
  }

  /**
   * The smart grab (keyboard E): at a bin station it takes the item the picked
   * guest's ticket still needs, so a keyboard-only pitmaster can still move fast.
   */
  function smartBin(stationId) {
    const guest = pickedGuest();
    if (!guest) return null;
    const ticket = guest.ticket;
    if (stationId === FRIDGE) return ticket.meat;
    if (stationId === SAUCE_ST) return ticket.sauce;
    if (stationId === SIDES_ST) return ticket.side;
    return null;
  }

  function useStation(stationId, binId) {
    const held = pit.hands;
    switch (stationId) {
      case FRIDGE: {
        if (held) { shout('Hands are full — serve it or bin it first'); return EV_DENY; }
        pit.hands = { kind: 'meat', meat: binId, smoked: false };
        return EV_TAKE;
      }
      case SAUCE_ST: {
        if (held) { shout('Hands are full — serve it or bin it first'); return EV_DENY; }
        pit.hands = { kind: 'sauce', sauce: binId };
        return EV_TAKE;
      }
      case SIDES_ST: {
        if (held) { shout('Hands are full — serve it or bin it first'); return EV_DENY; }
        pit.hands = { kind: 'side', side: binId };
        return EV_TAKE;
      }
      case SMOKER_ST: {
        const rackNo = Number.parseInt(binId ?? '0', 10);
        const rack = pit.racks[rackNo];
        const how = rackState(rack);
        if (!rack) {
          if (held && held.kind === 'meat' && !held.smoked) {
            pit.racks[rackNo] = { meat: held.meat, age: 0 };
            pit.hands = null;
            return EV_SMOKE;
          }
          if (held) { shout('Only raw meat goes in the smoker'); return EV_DENY; }
          return 0;
        }
        if (how === 'burnt') {
          pit.racks[rackNo] = null;
          shout('Burnt to charcoal! Binned it');
          return EV_BURNT;
        }
        if (how === 'ready') {
          if (held) { shout('Hands are full — put the meat down first'); return EV_DENY; }
          // Meat pulled in the prime window keeps its bark — worth a bonus.
          const prime = rack.age < SMOKER.readyAt + SMOKER.primeWindow;
          pit.hands = { kind: 'meat', meat: rack.meat, smoked: true, prime };
          pit.racks[rackNo] = null;
          if (prime) shout('Prime smoke! That bark is worth a bonus');
          return EV_TAKE;
        }
        shout('Still smoking… give it a moment');
        return EV_DENY;
      }
      case PLATE_ST: {
        return putOnPlate();
      }
      case SERVE_ST: {
        return servePlate();
      }
      case TRASH_ST: {
        if (held) {
          pit.hands = null;
          return EV_PUT;
        }
        if (pit.plate) {
          pit.plate = null;
          shout('Board cleared — start a fresh plate');
          return EV_PUT;
        }
        return 0;
      }
      default:
        return 0;
    }
  }

  /** Set whatever the pitmaster carries onto the plating board. */
  function putOnPlate() {
    const held = pit.hands;
    if (!held) {
      if (pit.plate) shout('Plate on the board — finish it, then serve');
      return 0;
    }
    if (!pit.plate) pit.plate = { meat: null, sauce: null, side: null, prime: false };
    if (held.kind === 'meat') {
      if (!held.smoked) { shout('Smoke it first!'); return EV_DENY; }
      if (pit.plate.meat) { shout('This plate already has meat'); return EV_DENY; }
      pit.plate.meat = held.meat;
      pit.plate.prime = !!held.prime;
      pit.hands = null;
      return EV_PUT;
    }
    if (held.kind === 'sauce') {
      if (pit.plate.sauce) { shout('This plate already has sauce'); return EV_DENY; }
      pit.plate.sauce = held.sauce;
      pit.hands = null;
      return EV_PUT;
    }
    if (held.kind === 'side') {
      if (pit.plate.side) { shout('This plate already has a side'); return EV_DENY; }
      pit.plate.side = held.side;
      pit.hands = null;
      return EV_PUT;
    }
    return 0;
  }

  /** Serve the plated food to the picked guest (or the first in line). */
  function servePlate() {
    const guest = pickedGuest();
    if (!guest) {
      shout('No guest waiting — cook when they arrive');
      return EV_DENY;
    }
    if (!plateReady(pit.plate)) {
      shout('Plate needs meat + sauce + side before serving');
      return EV_DENY;
    }
    const plate = pit.plate;
    pit.plate = null;
    if (plateMatches(plate, guest.ticket)) {
      const tip = Math.round(PAY.tipMax * patienceLeft(guest));
      const rush = pit.clock <= RUSH_TAIL ? PAY.rushBonus : 0;
      // A VIP rush order pays double on the base price and the tip.
      let pay = (PAY.base + tip) * (guest.vip ? VIP.payMult : 1) + rush;
      let events = EV_SERVED;
      let bonusText = '';
      if (plate.prime) {
        pay += PAY.perfectBonus;
        pit.primePlates += 1;
        events |= EV_PRIME;
        bonusText += ` Prime plate! +${PAY.perfectBonus}`;
      }
      if (patienceLeft(guest) >= PAY.speedyAt) {
        pay += PAY.speedyBonus;
        events |= EV_PRIME;
        bonusText += ` Speedy serve! +${PAY.speedyBonus}`;
      }
      pit.purse += pay;
      pit.streak += 1;
      pit.bestStreak = Math.max(pit.bestStreak, pit.streak);
      pit.served += 1;
      guest.mood = 'happy';
      guest.moodTimer = 1.2;
      pit.guests = pit.guests.filter((g) => g !== guest);
      if (pit.picked >= pit.guests.length) pit.picked = Math.max(0, pit.guests.length - 1);
      if (guest.vip) bonusText = ` VIP rush pays double!${bonusText}`;
      if (bonusText) shout(`Served ${guest.name} +${pay} coins!${bonusText}`);
      if (pit.streak > 0 && pit.streak % PAY.comboEvery === 0) {
        pit.purse += PAY.comboBonus;
        events |= EV_STREAK;
      }
      return events;
    }
    guest.patience = Math.max(0, guest.patience - PATIENCE.wrongCost);
    guest.mood = 'mad';
    guest.moodTimer = 1.2;
    pit.streak = 0;
    pit.wrong += 1;
    shout(`Wrong plate! ${guest.name} wanted something else`);
    return EV_WRONG;
  }

  function finish() {
    pit.done = true;
    pit.stars = pit.served >= 18 ? 3 : pit.served >= 12 ? 2 : pit.served >= 6 ? 1 : 0;
    pit.goalX = null;
    pit.goalJob = null;
  }

  /**
   * One fixed tick. `walk` is -1, 0 or 1 from the keys; `work` uses the nearest
   * station (keyboard E); `serve`/`trash` are shortcuts for those stations.
   */
  function advance(dt, cmds) {
    let events = 0;
    if (pit.done) return events;

    pit.played += dt;
    pit.clock = Math.max(0, SHIFT_LENGTH - pit.played);
    if (pit.bannerLeft > 0) {
      pit.bannerLeft -= dt;
      if (pit.bannerLeft <= 0) pit.banner = null;
    }

    // The clock ticks out loud in the last ten seconds.
    const whole = Math.ceil(pit.clock);
    if (pit.clock <= 10 && whole !== pit.lastTick) {
      pit.lastTick = whole;
      events |= EV_TICK;
    }

    // Walk: keys steer directly; a clicked station is a destination with a job on arrival.
    if (cmds.walk !== 0) {
      pit.goalX = null;
      pit.goalJob = null;
      pit.chefX += cmds.walk * PITMASTER.speed * dt;
    } else if (pit.goalX !== null) {
      const gap = pit.goalX - pit.chefX;
      const stride = PITMASTER.speed * dt;
      if (Math.abs(gap) <= stride) {
        pit.chefX = pit.goalX;
        pit.goalX = null;
        if (pit.goalJob) {
          events |= useStation(pit.goalJob.station, pit.goalJob.bin);
          pit.goalJob = null;
        }
      } else {
        pit.chefX += Math.sign(gap) * stride;
      }
    }
    pit.chefX = Math.min(1240, Math.max(340, pit.chefX));

    if (cmds.work) {
      const station = closestStation();
      if (station) {
        const bin = cmds.bin ?? smartBin(station);
        events |= useStation(station, bin);
      }
    }
    if (cmds.serve) events |= useStation(SERVE_ST, null);
    if (cmds.trash) events |= useStation(TRASH_ST, null);
    if (cmds.select !== null && cmds.select !== undefined) {
      if (cmds.select >= 0 && cmds.select < pit.guests.length) pit.picked = cmds.select;
    }

    // The smoker cooks; meat left too long turns to charcoal.
    for (let i = 0; i < pit.racks.length; i += 1) {
      const rack = pit.racks[i];
      if (rack) rack.age += dt;
    }

    // New guests join the queue on the dinner schedule, up to a full rail.
    pit.arrivalTimer -= dt;
    if (pit.arrivalTimer <= 0 && pit.guests.length < ARRIVALS.maxWaiting) {
      // Every VIP.every-th arrival is a rush-order VIP: double pay, short patience.
      const vip = pit.guestNo % VIP.every === 0;
      pit.guests.push(makePatron(rng, pit.guestNo, vip));
      pit.guestNo += 1;
      pit.arrivalTimer = nextArrivalIn(pit.played, SHIFT_LENGTH, RUSH_TAIL);
    } else if (pit.arrivalTimer <= 0) {
      pit.arrivalTimer = 2;
    }

    // Patience drains; a guest who runs out walks off hungry.
    for (let i = pit.guests.length - 1; i >= 0; i -= 1) {
      const guest = pit.guests[i];
      guest.patience -= dt;
      if (guest.moodTimer > 0) guest.moodTimer -= dt;
      else if (guest.mood !== 'waiting') guest.mood = 'waiting';
      if (guest.patience <= 0) {
        pit.guests.splice(i, 1);
        pit.lost += 1;
        pit.streak = 0;
        if (pit.picked >= pit.guests.length) pit.picked = Math.max(0, pit.guests.length - 1);
        shout(`${guest.name} walked off hungry!`);
        events |= EV_LEFT;
      }
    }

    if (pit.clock <= 0) {
      finish();
      events |= EV_OVER;
    }
    return events;
  }

  reset();
  return {
    state: pit,
    reset,
    step: advance,
    goTo,
    useStation,
    closestStation,
    pickedGuest,
    servePlate,
    putOnPlate,
    smartBin,
  };
}
