// Keyboard and pointer controls for Smokehouse BBQ.
//
// Held keys walk the pitmaster. Single presses (start, pause, serve, bin, mute) are
// stored as flags and picked up once by the loop, so a press that lands between two
// frames is never lost and never counted twice. Clicking a station walks the
// pitmaster over and works it on arrival; clicking a ticket picks that guest.

import { BOARD_W, BOARD_H, RAIL, STATIONS } from './tuning.js';

export const KEY_CONFIRM = 1;
export const KEY_PAUSE = 2;
export const KEY_SERVE = 4;
export const KEY_TRASH = 8;
export const KEY_MUTE = 16;

const WALK_LEFT = new Set(['ArrowLeft', 'KeyA']);
const WALK_RIGHT = new Set(['ArrowRight', 'KeyD']);
const DO_CONFIRM = new Set(['Space', 'Enter']);
const DO_PAUSE = new Set(['KeyP', 'Escape']);
const DO_SERVE = new Set(['KeyS']);
const DO_TRASH = new Set(['KeyT']);
const DO_MUTE = new Set(['KeyM']);
const DO_WORK = new Set(['KeyE']);

const NUMBER_KEYS = {
  Digit1: 'fridge',
  Digit2: 'smoker',
  Digit3: 'sauce',
  Digit4: 'sides',
};

function hit(box, x, y) {
  return x >= box.x && x < box.x + box.w && y >= box.y && y < box.y + box.h;
}

export function makeControls(canvas) {
  let leftHeld = false;
  let rightHeld = false;
  let flags = 0;
  let workQueued = false;
  let walkAsk = null;
  let ticketAsk = null;

  /** Turn a pointer event into board coordinates (1280x720). */
  function toBoard(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((ev.clientX - r.left) / r.width) * BOARD_W,
      y: ((ev.clientY - r.top) / r.height) * BOARD_H,
    };
  }

  window.addEventListener('keydown', (ev) => {
    if (WALK_LEFT.has(ev.code)) leftHeld = true;
    else if (WALK_RIGHT.has(ev.code)) rightHeld = true;
    else if (DO_CONFIRM.has(ev.code)) {
      if (!ev.repeat) flags |= KEY_CONFIRM;
    } else if (DO_PAUSE.has(ev.code)) {
      if (!ev.repeat) flags |= KEY_PAUSE;
    } else if (DO_SERVE.has(ev.code)) {
      if (!ev.repeat) flags |= KEY_SERVE;
    } else if (DO_TRASH.has(ev.code)) {
      if (!ev.repeat) flags |= KEY_TRASH;
    } else if (DO_MUTE.has(ev.code)) {
      if (!ev.repeat) flags |= KEY_MUTE;
    } else if (DO_WORK.has(ev.code)) {
      if (!ev.repeat) workQueued = true;
    } else if (NUMBER_KEYS[ev.code]) {
      walkAsk = { station: NUMBER_KEYS[ev.code], bin: null };
    } else return;
    ev.preventDefault();
  });
  window.addEventListener('keyup', (ev) => {
    if (WALK_LEFT.has(ev.code)) leftHeld = false;
    else if (WALK_RIGHT.has(ev.code)) rightHeld = false;
  });
  // A key let go while the tab is hidden never sends keyup: drop both on blur.
  window.addEventListener('blur', () => {
    leftHeld = false;
    rightHeld = false;
  });

  canvas.addEventListener('pointerdown', (ev) => {
    const p = toBoard(ev);
    // A click on a ticket picks that guest.
    for (let i = 0; i < 4; i += 1) {
      const card = {
        x: RAIL.x + 10,
        y: RAIL.y + 62 + i * (RAIL.cardH + RAIL.gap),
        w: RAIL.w - 20,
        h: RAIL.cardH,
      };
      if (hit(card, p.x, p.y)) {
        ticketAsk = i;
        return;
      }
    }
    // A click on a station (or one of its bins) walks over and works it.
    for (const [id, st] of Object.entries(STATIONS)) {
      for (const bin of st.bins) {
        if (hit(bin.box, p.x, p.y)) {
          walkAsk = { station: id, bin: bin.id };
          return;
        }
      }
      if (hit(st.box, p.x, p.y)) {
        walkAsk = { station: id, bin: null };
        return;
      }
    }
    // Anywhere else counts as confirm (start / resume).
    flags |= KEY_CONFIRM;
  });

  return {
    /** -1 walks left, 1 walks right, 0 stands still (or both keys at once). */
    walk() {
      return (rightHeld ? 1 : 0) - (leftHeld ? 1 : 0);
    },
    /** The single presses since the last call, as KEY_* flags. */
    takeFlags() {
      const got = flags;
      flags = 0;
      return got;
    },
    /** True once when E was pressed since the last call. */
    takeWork() {
      const got = workQueued;
      workQueued = false;
      return got;
    },
    /** A station the player clicked (walk over, work it), or null. */
    takeWalkAsk() {
      const got = walkAsk;
      walkAsk = null;
      return got;
    },
    /** A ticket index the player clicked, or null. */
    takeTicketAsk() {
      const got = ticketAsk;
      ticketAsk = null;
      return got;
    },
  };
}
