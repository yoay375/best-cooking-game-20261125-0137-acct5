// Keyboard and pointer input for Taco Truck Fiesta. Held keys steer the cook; one-shot
// presses (start, pause, serve, trash, mute) are queued as flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice. A click on
// a station walks the cook there and works it on arrival; a click on a ticket picks
// that customer.

import { BOARD, FIELD, STATIONS } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;
export const ACTION_MUTE = 16;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SERVE = new Set(['KeyS']);
const TRASH = new Set(['KeyT']);
const MUTE = new Set(['KeyM']);
const INTERACT = new Set(['KeyE']);

const STATION_KEYS = {
  Digit1: 'fridge',
  Digit2: 'tortilla',
  Digit3: 'grill',
  Digit4: 'salsa',
  Digit5: 'toppings',
};

function pointIn(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
}

export function createInput(canvas) {
  let left = false;
  let right = false;
  let actions = 0;
  let interactQueued = false;
  let walkRequest = null;
  let ticketPick = null;

  /** Convert a pointer event to logical 1280x720 coordinates. */
  function toLogical(event) {
    const bounds = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * FIELD.width,
      y: ((event.clientY - bounds.top) / bounds.height) * FIELD.height,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code)) left = true;
    else if (RIGHT.has(event.code)) right = true;
    else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (TRASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_TRASH;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else if (INTERACT.has(event.code)) {
      if (!event.repeat) interactQueued = true;
    } else if (STATION_KEYS[event.code]) {
      walkRequest = { station: STATION_KEYS[event.code], sub: null };
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    if (LEFT.has(event.code)) left = false;
    else if (RIGHT.has(event.code)) right = false;
  });
  // A key released while the tab is hidden never sends keyup: let go on blur.
  window.addEventListener('blur', () => {
    left = false;
    right = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const point = toLogical(event);
    // A click on a ticket picks that customer.
    for (let index = 0; index < 4; index += 1) {
      const ticket = {
        x: BOARD.x + 10,
        y: BOARD.y + 62 + index * (BOARD.ticketH + BOARD.gap),
        w: BOARD.w - 20,
        h: BOARD.ticketH,
      };
      if (pointIn(ticket, point.x, point.y)) {
        ticketPick = index;
        return;
      }
    }
    // A click on a station (or one of its bins) walks there and works it.
    for (const [id, station] of Object.entries(STATIONS)) {
      for (const sub of station.sub) {
        if (pointIn(sub.rect, point.x, point.y)) {
          walkRequest = { station: id, sub: sub.id };
          return;
        }
      }
      if (pointIn(station.rect, point.x, point.y)) {
        walkRequest = { station: id, sub: null };
        return;
      }
    }
    // Anywhere else is a confirm (start / resume).
    actions |= ACTION_CONFIRM;
  });

  return {
    /** -1 for left, 1 for right, 0 for neither or both. */
    direction() {
      return (right ? 1 : 0) - (left ? 1 : 0);
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** True once when E was pressed since the last call. */
    takeInteract() {
      const taken = interactQueued;
      interactQueued = false;
      return taken;
    },
    /** A station the player clicked (walk there, work it), or null. */
    takeWalkRequest() {
      const taken = walkRequest;
      walkRequest = null;
      return taken;
    },
    /** A ticket index the player clicked, or null. */
    takeTicketPick() {
      const taken = ticketPick;
      ticketPick = null;
      return taken;
    },
  };
}
