// The folks who queue at the smokehouse: who they are, what plate they want, how
// long they will stand in line, and whether the plate on the board is theirs.
//
// A ticket is a meat, a sauce and a side. Every guest wants all three — the queue
// moves fast, so there is no time for a short order.

import { ARRIVALS, MEATS, PATIENCE, SAUCES, SIDES, VIP } from './tuning.js';
import { pickOne, rollRange } from './rng.js';

export const QUEUE_NAMES = [
  'Bea', 'Cole', 'Dana', 'Eli', 'Faye', 'Gus', 'Hana', 'Ike',
  'June', 'Kai', 'Lena', 'Milo', 'Nora', 'Otis', 'Pip', 'Ruth',
];

/** Faces in the queue: skin tone, hat and shirt, drawn from the guest's seed. */
const SKINS = ['#f2c89b', '#e8b07e', '#c98d5f', '#8d5a3b', '#f7d7b0'];
const HATS = ['cap', 'bandana', 'beanie', 'flatcap', 'hair'];
const SHIRTS = ['#d94040', '#2a9d8f', '#ffc94d', '#7b61ff', '#f4845f', '#06d6a0'];

/** Deal one ticket: a meat, a sauce and a side. */
export function makeTicket(rng) {
  return {
    meat: pickOne(rng, MEATS),
    sauce: pickOne(rng, SAUCES),
    side: pickOne(rng, SIDES),
  };
}

/**
 * A guest joining the queue. Rush-order VIPs (every VIP.every-th guest) pay double
 * but only wait VIP.patience seconds — serve them first or lose them fast.
 */
export function makePatron(rng, id, vip = false) {
  const patience = vip ? VIP.patience : PATIENCE.full;
  return {
    id,
    name: pickOne(rng, QUEUE_NAMES),
    faceSeed: rollRange(rng, 0, 100000),
    skin: pickOne(rng, SKINS),
    hat: pickOne(rng, HATS),
    shirt: pickOne(rng, SHIRTS),
    ticket: makeTicket(rng),
    patience,
    maxPatience: patience,
    vip,
    mood: 'waiting',
    moodTimer: 0,
  };
}

/** Does the plate on the board match this guest's ticket, item for item? */
export function plateMatches(plate, ticket) {
  if (!plate || !plate.meat || !plate.sauce || !plate.side) return false;
  return plate.meat === ticket.meat && plate.sauce === ticket.sauce && plate.side === ticket.side;
}

/** How much of a guest's patience is left: 1 fresh in line, 0 walking away. */
export function patienceLeft(guest) {
  return Math.max(0, guest.patience / guest.maxPatience);
}

/** How long until the next guest joins the queue — quicker in the dinner rush. */
export function nextArrivalIn(played, shiftLength, rushTail) {
  const rush = shiftLength - played <= rushTail;
  return rush ? ARRIVALS.rushGap : ARRIVALS.gap;
}
