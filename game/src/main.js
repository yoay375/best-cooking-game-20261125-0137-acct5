// Ember & Thyme — boot, the frame loop, and mouse + keyboard input.
// Clicks land on stations; keys are the fast path for a busy cook.

import { INGREDIENTS } from './recipes.js';
import { newShift, startShift, tickShift } from './state.js';
import {
  binGrillSlot,
  binHand,
  chopOnce,
  grabIngredient,
  placeOnBoard,
  placeOnGrill,
  placeOnPlate,
  servePlate,
  takeFromBoard,
  takeFromGrill,
} from './kitchen.js';
import { LAYOUT, VIEW_H, VIEW_W, draw } from './render.js';
import { sfx } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const fallback = document.getElementById('fallback');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(window.location.search);
const seedParam = Number.parseInt(params.get('seed') || '', 10);
const seed = Number.isFinite(seedParam) ? seedParam : (Date.now() % 2147483647);

let state = newShift(seed);
state.mouse = { x: 640, y: 660 };
let shotMode = false;

if (params.get('shot')) {
  shotMode = applyShot(state, params.get('shot'));
  if (shotMode) {
    state.mouse = { x: 700, y: 540 };
  }
}

function inside(rect, x, y) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function toGameCoords(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * VIEW_W,
    y: ((event.clientY - rect.top) / rect.height) * VIEW_H,
  };
}

function clickAt(x, y) {
  if (state.screen === 'title' || state.screen === 'over') {
    state = startShift(state.seed);
    sfx.unlock();
    sfx.ding();
    return;
  }
  if (state.paused) return;

  for (const bin of LAYOUT.bins) {
    if (inside(bin, x, y)) {
      if (grabIngredient(state, bin.ing)) sfx.grab();
      return;
    }
  }
  if (inside(LAYOUT.board, x, y)) {
    if (state.board && state.board.stage === 'chopped') {
      if (takeFromBoard(state)) sfx.grab();
      return;
    }
    if (state.hand && state.hand.stage === 'raw') {
      if (placeOnBoard(state)) sfx.plate();
      return;
    }
    const result = chopOnce(state);
    if (result === 'chop') sfx.chop();
    if (result === 'done') sfx.chopDone();
    return;
  }
  for (let i = 0; i < LAYOUT.grill.length; i++) {
    const slot = LAYOUT.grill[i];
    if (inside(slot, x, y)) {
      const item = state.grill[i];
      if (item && item.burnt) {
        if (binGrillSlot(state, i)) sfx.burn();
        return;
      }
      if (item && item.cook >= item.cookMax) {
        if (takeFromGrill(state, i)) sfx.grab();
        return;
      }
      if (!item && state.hand && state.hand.stage === 'chopped') {
        if (placeOnGrill(state, i)) sfx.plate();
        return;
      }
      if (item) {
        // Still cooking: a nudge, not an error.
        return;
      }
      return;
    }
  }
  if (inside(LAYOUT.plate, x, y)) {
    if (placeOnPlate(state)) sfx.plate();
    return;
  }
  if (inside(LAYOUT.window, x, y)) {
    if (servePlate(state)) {
      sfx.coin();
      sfx.ding();
    }
    return;
  }
  if (inside(LAYOUT.trash, x, y)) {
    if (binHand(state)) sfx.burn();
  }
}

canvas.addEventListener('pointerdown', (event) => {
  sfx.unlock();
  const point = toGameCoords(event);
  state.mouse = point;
  clickAt(point.x, point.y);
});

canvas.addEventListener('pointermove', (event) => {
  state.mouse = toGameCoords(event);
});

window.addEventListener('keydown', (event) => {
  if (event.repeat) return;
  const key = event.key.toLowerCase();
  if (key === 'enter') {
    if (state.screen === 'title' || state.screen === 'over') {
      state = startShift(state.seed);
      sfx.unlock();
      sfx.ding();
    }
    return;
  }
  if (state.screen !== 'play') return;
  if (key === 'p') {
    state.paused = !state.paused;
    if (!state.paused) sfx.unlock();
    return;
  }
  if (state.paused) return;
  if (key === 'm') {
    sfx.setMuted(!sfx.isMuted());
    return;
  }
  if (key === ' ') {
    event.preventDefault();
    sfx.unlock();
    const result = chopOnce(state);
    if (result === 'chop') sfx.chop();
    if (result === 'done') sfx.chopDone();
    return;
  }
  if (key === 's') {
    if (servePlate(state)) {
      sfx.coin();
      sfx.ding();
    }
    return;
  }
  if (key === 't') {
    if (binHand(state)) sfx.burn();
    return;
  }
  const byKey = INGREDIENTS.find((g) => g.key === key);
  if (byKey) {
    sfx.unlock();
    if (grabIngredient(state, byKey.id)) sfx.grab();
  }
});

let last = performance.now();
let sizzleOn = false;

function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!shotMode) {
    tickShift(state, dt);
    const wantSizzle = state.screen === 'play' && !state.paused && state.sizzle > 0;
    if (wantSizzle && !sizzleOn) {
      sfx.startSizzle();
      sizzleOn = true;
    } else if (!wantSizzle && sizzleOn) {
      sfx.stopSizzle();
      sizzleOn = false;
    }
  }
  draw(ctx, state, now / 1000);
  requestAnimationFrame(frame);
}

if (!ctx) {
  fallback.hidden = false;
} else {
  if (state.screen === 'title') {
    state.orders = [];
  }
  requestAnimationFrame(frame);
}
