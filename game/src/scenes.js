// The screenshot scenes behind ?shot=start|play|serve|end. Each one stages a real
// game with the pit's own moves (grab, smoke, plate, serve) and steps the rules
// forward in fixed 1/60 s ticks, so the frame is what short play really looks like
// and the same seed always gives the same frame. The 'end' scene lets a simple
// pit-bot play a whole shift, so the summary screen shows a shift really played.

import { SMOKER, STATIONS, TICK } from './tuning.js';
import { EV_OVER } from './pit.js';
import { VIEW_OVER, VIEW_PLAY, VIEW_TITLE } from './painter.js';

/** Stand the pitmaster by a station, then work it — the same two moves a player makes. */
function workAt(pit, stationId, binId) {
  pit.state.chefX = STATIONS[stationId].x;
  pit.useStation(stationId, binId);
}

/** Run the pit forward `seconds` in fixed ticks, doing nothing else. */
function waitFor(pit, seconds) {
  for (let i = 0; i < seconds / TICK; i += 1) {
    pit.step(TICK, { walk: 0, work: false, serve: false, trash: false, select: null });
  }
}

/**
 * The pit-bot: each step it looks at the first guest's ticket and does the next job
 * toward it — smoked meat, then sauce, then side, then serve. It works the stations
 * directly (the pitmaster is already standing there in the frame).
 */
function botTick(pit) {
  const state = pit.state;
  const guest = state.guests[state.picked] ?? state.guests[0];
  if (!guest || state.done) return;
  const ticket = guest.ticket;
  const plate = state.plate;
  const held = state.hands;

  // Smoked meat that no longer matches the ticket (the guest walked off):
  // bin it rather than plating the wrong meat.
  if (held && held.kind === 'meat' && held.smoked && held.meat !== ticket.meat) {
    workAt(pit, 'trash', null);
    return;
  }
  // Hands hold raw meat: load it into a free rack.
  if (held && held.kind === 'meat' && !held.smoked) {
    for (let rack = 0; rack < 3; rack += 1) {
      if (!state.racks[rack]) {
        workAt(pit, 'smoker', String(rack));
        return;
      }
    }
    // Smoker full and hands full of raw meat: bin it so a ready rack can be pulled.
    workAt(pit, 'trash', null);
    return;
  }
  // Hands hold smoked meat: put it on the plate (or start one) — unless the
  // plate already has meat, in which case bin it.
  if (held && held.kind === 'meat' && held.smoked) {
    if (plate && plate.meat) {
      workAt(pit, 'trash', null);
      return;
    }
    workAt(pit, 'plate', null);
    return;
  }
  // Hands hold sauce or a side: lay it on the plate if there is one.
  if (held && (held.kind === 'sauce' || held.kind === 'side')) {
    if (plate) {
      workAt(pit, 'plate', null);
      return;
    }
    workAt(pit, 'trash', null);
    return;
  }

  // Hands are empty from here on. A burnt rack is cleared whenever it appears.
  for (let rack = 0; rack < 3; rack += 1) {
    const meat = state.racks[rack];
    if (meat && meat.age >= SMOKER.primeUntil) {
      workAt(pit, 'smoker', String(rack));
      return;
    }
  }
  const needsMeat = !plate || !plate.meat;
  // Only tend the smoker while the plate still needs meat: pull ready meat,
  // and wait while a piece is still smoking.
  if (needsMeat) {
    for (let rack = 0; rack < 3; rack += 1) {
      const meat = state.racks[rack];
      if (meat && meat.age >= SMOKER.readyAt && meat.age < SMOKER.primeUntil) {
        workAt(pit, 'smoker', String(rack));
        return;
      }
    }
    if (state.racks.some((meat) => meat && meat.age < SMOKER.readyAt)) return;
  }

  if (plate && !plate.meat) {
    // No meat smoking and none ready: start a fresh piece for the ticket.
    workAt(pit, 'fridge', ticket.meat);
    return;
  }
  if (plate && plate.meat && !plate.sauce) {
    workAt(pit, 'sauce', ticket.sauce);
    return;
  }
  if (plate && plate.meat && plate.sauce && !plate.side) {
    workAt(pit, 'sides', ticket.side);
    return;
  }
  if (plate && plate.meat && plate.sauce && plate.side) {
    workAt(pit, 'serve', null);
    return;
  }
  // No plate and nothing smoking: start the ticket's meat.
  workAt(pit, 'fridge', ticket.meat);
}

/** Build the first guest's exact plate on the board, step by step. */
function buildFirstPlate(pit) {
  const guest = pit.state.guests[0];
  if (!guest) return;
  const ticket = guest.ticket;
  workAt(pit, 'fridge', ticket.meat);
  workAt(pit, 'smoker', '0');
  waitFor(pit, 7);
  workAt(pit, 'smoker', '0');
  workAt(pit, 'plate', null);
  workAt(pit, 'sauce', ticket.sauce);
  workAt(pit, 'plate', null);
  workAt(pit, 'sides', ticket.side);
  workAt(pit, 'plate', null);
}

/**
 * Set `pit` to the named scene (start, play, serve or end; any other name is start)
 * and return the screen to paint over it and the best score to show.
 */
export function arrangeScene(name, pit) {
  pit.reset();
  if (name !== 'play' && name !== 'serve' && name !== 'end') {
    waitFor(pit, 8);
    workAt(pit, 'fridge', 'brisket');
    workAt(pit, 'smoker', '0');
    waitFor(pit, 3);
    return { screen: VIEW_TITLE, best: 0 };
  }
  if (name === 'serve') {
    waitFor(pit, 20);
    buildFirstPlate(pit);
    pit.state.chefX = STATIONS.serve.x;
    return { screen: VIEW_PLAY, best: pit.state.purse };
  }
  if (name === 'end') {
    for (let i = 0; i < 150 / TICK; i += 1) {
      botTick(pit);
      if (pit.step(TICK, { walk: 0, work: false, serve: false, trash: false, select: null }) & EV_OVER) break;
    }
    return { screen: VIEW_OVER, best: pit.state.purse };
  }
  // Play: a busy mid-shift frame — two tickets on the rail, meat in the smoker
  // (one rack ready), a plate half-built on the board, the pitmaster carrying sauce.
  // The long first wait lets a second guest join the queue before cooking starts.
  waitFor(pit, 17);
  workAt(pit, 'fridge', 'brisket');
  workAt(pit, 'smoker', '0');
  workAt(pit, 'fridge', 'ribs');
  workAt(pit, 'smoker', '1');
  waitFor(pit, 8);
  workAt(pit, 'smoker', '0');
  workAt(pit, 'plate', null);
  workAt(pit, 'sauce', 'spicy');
  waitFor(pit, 0.5);
  pit.state.chefX = STATIONS.sauce.x;
  return { screen: VIEW_PLAY, best: pit.state.purse };
}
