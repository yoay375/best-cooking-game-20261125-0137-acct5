// Boot and the one loop: controls are read every frame, the pit advances in fixed
// 1/60 s ticks (several in a slow frame, none in a fast one), and the painter shows
// what is there. The game moves between four screens: title, play, paused, shift over.
//
// ?seed=N fixes the guests and tickets. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.

import { BEST_KEY, TICK } from './tuning.js';
import { makeRng } from './rng.js';
import { EV_BURNT, EV_DENY, EV_LEFT, EV_OVER, EV_PRIME, EV_PUT, EV_SERVED, EV_SMOKE, EV_STREAK, EV_TAKE, EV_TICK, EV_WRONG, makePit } from './pit.js';
import { KEY_CONFIRM, KEY_MUTE, KEY_PAUSE, KEY_SERVE, KEY_TRASH, makeControls } from './controls.js';
import { makeSound } from './sound.js';
import { makePainter, VIEW_OVER, VIEW_PAUSED, VIEW_PLAY, VIEW_TITLE } from './painter.js';
import { arrangeScene } from './scenes.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped. */
const MAX_FRAME = 0.25;

const query = new URLSearchParams(window.location.search);
const shot = query.get('shot');
const seedRaw = Number.parseInt(query.get('seed') ?? '', 10);
const seed = Number.isInteger(seedRaw) ? seedRaw : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const pit = makePit(makeRng(seed));
const painter = makePainter(canvas);
const sound = makeSound();

function loadBest() {
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

function playScene(name) {
  const scene = arrangeScene(name, pit);
  let painted = 0;
  function paint() {
    painter.draw(pit.state, scene.screen, scene.best, 1200);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function playGame() {
  const controls = makeControls(canvas);
  let screen = VIEW_TITLE;
  let best = loadBest();
  let backlog = 0;
  let last = performance.now();
  // Single presses wait here until a fixed tick runs, so a press is never lost on a
  // fast frame and never applied twice when a slow frame runs several ticks.
  let workQueued = false;
  let serveQueued = false;
  let trashQueued = false;
  let ticketQueued = null;

  // Screen readers (and anyone watching the page's text) hear the screen changes.
  function say(message) {
    status.textContent = message;
  }

  function playSounds(events) {
    if (events & EV_TAKE) sound.grab();
    if (events & EV_PUT) sound.setDown();
    if (events & EV_SMOKE) sound.smoke();
    if (events & EV_SERVED) sound.served();
    if (events & EV_PRIME) sound.streak();
    if (events & EV_STREAK) sound.streak();
    if (events & EV_WRONG) sound.wrong();
    if (events & EV_LEFT) sound.walkedOff();
    if (events & EV_BURNT) sound.burnt();
    if (events & EV_DENY) sound.deny();
    if (events & EV_TICK) sound.tick();
    if (events & EV_OVER) sound.finale();
  }

  function startShift() {
    pit.reset();
    backlog = 0;
    screen = VIEW_PLAY;
    say('Shift started. Smoke the meat, build plates to order, serve before guests leave.');
  }

  function endShift() {
    screen = VIEW_OVER;
    if (pit.state.purse > best) {
      best = pit.state.purse;
      saveBest(best);
    }
    say(`Shift over. ${pit.state.purse} coins, ${pit.state.served} plates served. Best ${best}.`);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    backlog += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;

    const pressed = controls.takeFlags();
    workQueued = controls.takeWork() || workQueued;
    serveQueued = Boolean(pressed & KEY_SERVE) || serveQueued;
    trashQueued = Boolean(pressed & KEY_TRASH) || trashQueued;
    const picked = controls.takeTicketAsk();
    if (picked !== null) ticketQueued = picked;
    const stroll = controls.takeWalkAsk();
    if (pressed & KEY_MUTE) {
      const muted = sound.toggleMute();
      say(muted ? 'Sound off.' : 'Sound on.');
    }
    if (pressed & KEY_CONFIRM && (screen === VIEW_TITLE || screen === VIEW_OVER)) {
      sound.unlock();
      startShift();
    } else if (pressed & KEY_PAUSE && screen === VIEW_PLAY) {
      screen = VIEW_PAUSED;
      say('Paused.');
    } else if (pressed & (KEY_PAUSE | KEY_CONFIRM) && screen === VIEW_PAUSED) {
      screen = VIEW_PLAY;
      say('Playing.');
    }

    if (screen === VIEW_PLAY) {
      if (stroll) pit.goTo(stroll.station, stroll.bin);
      let first = true;
      while (backlog >= TICK) {
        const events = pit.step(TICK, {
          walk: controls.walk(),
          work: first && workQueued,
          serve: first && serveQueued,
          trash: first && trashQueued,
          select: first ? ticketQueued : null,
        });
        if (first) {
          workQueued = false;
          serveQueued = false;
          trashQueued = false;
          ticketQueued = null;
          first = false;
        }
        playSounds(events);
        if (events & EV_OVER) {
          endShift();
          break;
        }
        backlog -= TICK;
      }
    } else {
      backlog = 0;
    }
    painter.draw(pit.state, screen, best, now);
  }

  // Leaving the tab pauses a running shift rather than letting tickets rot unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === VIEW_PLAY) {
      screen = VIEW_PAUSED;
      say('Paused.');
    }
  });

  // A handle for play-testing: the state a test reads to check the game is playable.
  window.__bbq = pit;
  say('Smokehouse BBQ. Press Space or click to start your shift.');
  requestAnimationFrame(frame);
}

if (shot) playScene(shot);
else playGame();
