// Boot and the one loop: input is read every frame, the kitchen advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer paints
// what is there. The game moves between four screens: title, play, paused and shift over.
//
// ?seed=N fixes the customers and orders. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createKitchen, EVENT_BURN, EVENT_COMBO, EVENT_DENY, EVENT_LEFT, EVENT_OVER, EVENT_PERFECT, EVENT_PICKUP, EVENT_PLACE, EVENT_SERVED, EVENT_SIZZLE, EVENT_TICK, EVENT_WRONG } from './kitchen.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen.state, scene.screen, scene.best, 1200);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  // One-shot presses wait here until a fixed step runs, so a press is never lost
  // on a fast frame and never applied twice when a slow frame runs several steps.
  let pendingInteract = false;
  let pendingServe = false;
  let pendingTrash = false;
  let pendingTicket = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function announce(message) {
    status.textContent = message;
  }

  function playEventSounds(events) {
    if (events & EVENT_PICKUP) audio.pickup();
    if (events & EVENT_PLACE) audio.place();
    if (events & EVENT_SIZZLE) audio.sizzle();
    if (events & EVENT_SERVED) audio.served();
    if (events & EVENT_PERFECT) audio.combo();
    if (events & EVENT_COMBO) audio.combo();
    if (events & EVENT_WRONG) audio.wrong();
    if (events & EVENT_LEFT) audio.left();
    if (events & EVENT_BURN) audio.burn();
    if (events & EVENT_DENY) audio.deny();
    if (events & EVENT_TICK) audio.tick();
    if (events & EVENT_OVER) audio.over();
  }

  function startShift() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Shift started. Grill the meat, build tacos to order, serve before customers leave.');
  }

  function endShift() {
    screen = SCREEN_OVER;
    if (kitchen.state.coins > best) {
      best = kitchen.state.coins;
      saveBest(best);
    }
    announce(`Shift over. ${kitchen.state.coins} coins, ${kitchen.state.served} tacos served. Best ${best}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const actions = input.takeActions();
    pendingInteract = input.takeInteract() || pendingInteract;
    pendingServe = Boolean(actions & ACTION_SERVE) || pendingServe;
    pendingTrash = Boolean(actions & ACTION_TRASH) || pendingTrash;
    const picked = input.takeTicketPick();
    if (picked !== null) pendingTicket = picked;
    const walk = input.takeWalkRequest();
    if (actions & ACTION_MUTE) {
      const muted = audio.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      audio.unlock();
      startShift();
    } else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }

    if (screen === SCREEN_PLAY) {
      if (walk) kitchen.walkToStation(walk.station, walk.sub);
      let firstStep = true;
      while (accumulator >= STEP) {
        const events = kitchen.step(STEP, {
          move: input.direction(),
          interact: firstStep && pendingInteract,
          serve: firstStep && pendingServe,
          trash: firstStep && pendingTrash,
          select: firstStep ? pendingTicket : null,
        });
        if (firstStep) {
          pendingInteract = false;
          pendingServe = false;
          pendingTrash = false;
          pendingTicket = null;
          firstStep = false;
        }
        playEventSounds(events);
        if (events & EVENT_OVER) {
          endShift();
          break;
        }
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(kitchen.state, screen, best, now);
  }

  // Leaving the tab pauses a running shift rather than letting orders rot unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  // A handle for play-testing: the state a test reads to check the game is playable.
  window.__taco = kitchen;
  announce('Taco Truck Fiesta. Press Space or click to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
