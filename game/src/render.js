// Taco Truck Fiesta — everything the player sees, drawn on one canvas: the festival
// night, the truck awning and counter, the order board, the stations, the cook, the
// taco being built and the screens. The renderer only reads state; it never changes it.

import {
  BOARD, COOK, FIELD, FONT, GRILL, PALETTE, RUSH_SECONDS, SHIFT_SECONDS,
  STATIONS, STATION_FRIDGE, STATION_GRILL, STATION_PLATE, STATION_SALSA,
  STATION_SERVE, STATION_TOPPINGS, STATION_TORTILLA, STATION_TRASH,
} from './config.js';
import { patienceFraction } from './orders.js';
import { grillSlotState, tacoIsComplete } from './kitchen.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PROTEIN_COLOR = { beef: '#8a4b2d', chicken: '#e8c07a', beans: '#6e2f26' };
const PROTEIN_LABEL = { beef: 'Beef', chicken: 'Chicken', beans: 'Beans' };
const SHELL_LABEL = { soft: 'Soft', crunchy: 'Crunchy' };
const SALSA_COLOR = { mild: '#e5484d', hot: '#ff6b1a', verde: '#7bc950' };
const SALSA_LABEL = { mild: 'Mild', hot: 'Hot', verde: 'Verde' };
const TOPPING_LABEL = { lettuce: 'Lettuce', cheese: 'Cheese', jalapeno: 'Jalapeño', lime: 'Lime' };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, value, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function clockText(seconds) {
  const left = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

/** A little taco: a shell arc with filling, drawn at (x, y) with the given radius. */
function drawTacoIcon(ctx, x, y, r, protein, salsa) {
  ctx.fillStyle = '#f2c14e';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.2, r, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = protein ? PROTEIN_COLOR[protein] : '#c98d5f';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.32, 0, Math.PI * 2);
  ctx.arc(x + r * 0.3, y - r * 0.15, r * 0.3, 0, Math.PI * 2);
  ctx.fill();
  if (salsa) {
    ctx.fillStyle = SALSA_COLOR[salsa];
    ctx.beginPath();
    ctx.arc(x, y - r * 0.35, r * 0.26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#7bc950';
  ctx.beginPath();
  ctx.arc(x - r * 0.55, y - r * 0.3, r * 0.16, 0, Math.PI * 2);
  ctx.arc(x + r * 0.55, y - r * 0.25, r * 0.16, 0, Math.PI * 2);
  ctx.fill();
}

function drawShellIcon(ctx, x, y, shell) {
  ctx.fillStyle = shell === 'crunchy' ? '#e8963c' : '#f2c14e';
  ctx.beginPath();
  if (shell === 'crunchy') {
    ctx.moveTo(x - 12, y + 8);
    ctx.lineTo(x + 12, y + 8);
    ctx.lineTo(x, y - 10);
    ctx.closePath();
  } else {
    ctx.arc(x, y + 4, 12, Math.PI, 0);
    ctx.closePath();
  }
  ctx.fill();
  ctx.strokeStyle = '#b97f1e';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function drawProteinIcon(ctx, x, y, protein) {
  ctx.fillStyle = PROTEIN_COLOR[protein];
  ctx.beginPath();
  ctx.ellipse(x, y, 12, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.beginPath();
  ctx.ellipse(x - 3, y - 3, 5, 3, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawSalsaIcon(ctx, x, y, salsa) {
  ctx.fillStyle = '#f6f1e7';
  ctx.beginPath();
  ctx.arc(x, y + 2, 11, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SALSA_COLOR[salsa];
  ctx.beginPath();
  ctx.arc(x, y, 9, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
}

function drawToppingIcon(ctx, x, y, topping) {
  if (topping === 'lettuce') {
    ctx.fillStyle = '#7bc950';
    ctx.beginPath();
    ctx.ellipse(x, y, 11, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (topping === 'cheese') {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x - 9, y - 5); ctx.lineTo(x + 9, y - 5);
    ctx.moveTo(x - 9, y + 1); ctx.lineTo(x + 9, y + 1);
    ctx.moveTo(x - 9, y + 7); ctx.lineTo(x + 9, y + 7);
    ctx.stroke();
  } else if (topping === 'jalapeno') {
    ctx.strokeStyle = '#2a9d4f';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#2a9d4f';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#a8e063';
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 6);
    ctx.arc(x, y - 6, 10, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
  }
}

/** One recipe icon in a row, labelled underneath. */
function drawRecipeIcon(ctx, kind, value, x, y) {
  if (kind === 'shell') drawShellIcon(ctx, x, y, value);
  else if (kind === 'protein') drawProteinIcon(ctx, x, y, value);
  else if (kind === 'salsa') drawSalsaIcon(ctx, x, y, value);
  else drawToppingIcon(ctx, x, y, value);
}

/** A festival customer's face: skin, hat and a smile (or a frown when angry). */
function drawCustomerFace(ctx, customer, x, y, r) {
  ctx.fillStyle = customer.skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#241a2e';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.09, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  const happy = customer.mood === 'happy';
  const angry = customer.mood === 'angry';
  ctx.strokeStyle = '#241a2e';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (angry) {
    ctx.arc(x, y + r * 0.75, r * 0.4, Math.PI * 1.15, Math.PI * 1.85);
  } else {
    ctx.arc(x, y + r * 0.25, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  if (happy) {
    ctx.strokeStyle = '#241a2e';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 0.45);
    ctx.lineTo(x - r * 0.4, y - r * 0.2);
    ctx.moveTo(x + r * 0.7, y - r * 0.45);
    ctx.lineTo(x + r * 0.4, y - r * 0.2);
    ctx.stroke();
  }
  if (customer.hat === 'sombrero') {
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.75, r * 1.25, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.8, r * 0.55, Math.PI, 0);
    ctx.fill();
  } else if (customer.hat === 'cap') {
    ctx.fillStyle = customer.shirt;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.25, r * 0.95, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + r * 0.5, y - r * 0.45, r * 0.7, r * 0.18);
  } else if (customer.hat === 'bandana') {
    ctx.fillStyle = '#e5484d';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 0.95, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
  } else if (customer.hat === 'beanie') {
    ctx.fillStyle = '#7b61ff';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 0.95, Math.PI, 0);
    ctx.fill();
  }
}

/** The cook: white hat, apron, and the item they carry held up above their head. */
function drawCook(ctx, state, time) {
  const x = state.cookX;
  const y = COOK.walkY;
  const bob = Math.sin(time * 0.012) * 1.5;
  const walking = state.walkTarget !== null;
  const sway = walking ? Math.sin(time * 0.03) * 3 : 0;
  // Legs and shoes.
  ctx.fillStyle = '#2b2b3a';
  ctx.fillRect(x - 13 + sway, y + 16, 10, 18);
  ctx.fillRect(x + 3 - sway, y + 16, 10, 18);
  // Apron body.
  ctx.fillStyle = '#f6f1e7';
  roundRect(ctx, x - 20, y - 14 + bob, 40, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#2a9d8f';
  ctx.fillRect(x - 20, y + 8 + bob, 40, 8);
  // Arms.
  ctx.strokeStyle = '#f2c89b';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 6 + bob);
  ctx.lineTo(x - 26, y + 10 + bob);
  ctx.moveTo(x + 18, y - 6 + bob);
  ctx.lineTo(x + 26, y + 10 + bob);
  ctx.stroke();
  // Head and chef hat.
  ctx.fillStyle = '#f2c89b';
  ctx.beginPath();
  ctx.arc(x, y - 26 + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x - 9, y - 36 + bob, 8, 0, Math.PI * 2);
  ctx.arc(x, y - 40 + bob, 9, 0, Math.PI * 2);
  ctx.arc(x + 9, y - 36 + bob, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(x - 13, y - 38 + bob, 26, 7);
  // Smile.
  ctx.strokeStyle = '#241a2e';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y - 25 + bob, 5, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // What the cook carries, held up in a bubble.
  const carry = state.carry;
  if (carry) {
    const bx = x;
    const by = y - 66 + bob;
    ctx.fillStyle = 'rgba(36,26,46,0.92)';
    roundRect(ctx, bx - 52, by - 16, 104, 32, 16);
    ctx.fill();
    ctx.strokeStyle = PALETTE.counterTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    let label = '';
    if (carry.kind === 'protein') label = `${PROTEIN_LABEL[carry.protein]}${carry.cooked ? ' ✓' : ' (raw)'}`;
    else if (carry.kind === 'shell') label = SHELL_LABEL[carry.shell];
    else if (carry.kind === 'salsa') label = `${SALSA_LABEL[carry.salsa]} salsa`;
    else label = TOPPING_LABEL[carry.topping];
    text(ctx, label, bx, by + 1, 14, PALETTE.text, 'bold', 'center');
  }
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = canvas.clientWidth || FIELD.width;
    const height = canvas.clientHeight || FIELD.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform((canvas.width / FIELD.width), 0, 0, (canvas.height / FIELD.height), 0, 0);
  }

  function drawBackdrop(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, PALETTE.sky);
    sky.addColorStop(0.55, PALETTE.skyLow);
    sky.addColorStop(1, '#3d1f3d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    // Festival string lights.
    ctx.strokeStyle = 'rgba(255,209,102,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 66);
    ctx.quadraticCurveTo(640, 108, 1280, 66);
    ctx.stroke();
    for (let i = 0; i < 16; i += 1) {
      const t = i / 15;
      const x = t * 1280;
      const y = 66 + Math.sin(t * Math.PI) * 34;
      const glow = 0.6 + 0.4 * Math.sin(time * 0.004 + i);
      ctx.fillStyle = i % 3 === 0 ? `rgba(255,209,102,${glow})` : i % 3 === 1 ? `rgba(229,72,77,${glow})` : `rgba(123,216,138,${glow})`;
      ctx.beginPath();
      ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Truck wall and awning.
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 120, FIELD.width, 240);
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? PALETTE.awningA : PALETTE.awningB;
      ctx.fillRect(i * 80, 118, 80, 30);
      ctx.beginPath();
      ctx.moveTo(i * 80, 148);
      ctx.lineTo(i * 80 + 40, 168);
      ctx.lineTo(i * 80 + 80, 148);
      ctx.closePath();
      ctx.fill();
    }
    // Counter.
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(300, 296, 980, 22);
    ctx.fillStyle = PALETTE.counterFront;
    ctx.fillRect(300, 318, 980, 42);
    ctx.fillStyle = PALETTE.counterTrim;
    ctx.fillRect(300, 318, 980, 4);
    // Second counter (assembly + serve).
    ctx.fillStyle = PALETTE.counterTop;
    ctx.fillRect(360, 522, 680, 20);
    ctx.fillStyle = PALETTE.counterFront;
    ctx.fillRect(360, 542, 680, 18);
    // Floor and walkway.
    ctx.fillStyle = PALETTE.floor;
    ctx.fillRect(0, 560, FIELD.width, 160);
    ctx.fillStyle = PALETTE.walkway;
    ctx.fillRect(300, 560, 980, 100);
    ctx.fillStyle = 'rgba(255,209,102,0.18)';
    ctx.fillRect(300, 560, 980, 4);
  }

  function drawHud(state, best) {
    ctx.fillStyle = 'rgba(20,12,28,0.92)';
    ctx.fillRect(0, 0, FIELD.width, 62);
    ctx.fillStyle = PALETTE.counterTrim;
    ctx.fillRect(0, 62, FIELD.width, 3);
    drawTacoIcon(ctx, 40, 26, 20, 'beef', 'mild');
    text(ctx, 'TACO TRUCK FIESTA', 70, 32, 26, PALETTE.text);
    // Shift timer, big in the middle.
    const low = state.timeLeft <= 30;
    const rush = state.timeLeft <= RUSH_SECONDS && !state.over;
    text(ctx, 'SHIFT', 560, 20, 13, PALETTE.muted, 'bold', 'center');
    text(ctx, clockText(state.timeLeft), 560, 44, 30, low ? '#ff6b6b' : PALETTE.text, 'bold', 'center');
    if (rush) text(ctx, '¡RUSH HOUR!', 700, 32, 18, '#ffb347', 'bold', 'left');
    // Coins, combo and served.
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.arc(892, 32, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b97f1e';
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, '¢', 892, 33, 14, '#7a5a00', 'bold', 'center');
    text(ctx, `${state.coins}`, 910, 32, 24, PALETTE.coin, 'bold', 'left');
    text(ctx, `Served ${state.served} · Missed ${state.missed}`, 1030, 22, 15, PALETTE.muted, 'bold', 'left');
    if (state.combo >= 2) {
      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath();
      ctx.moveTo(1024, 52);
      ctx.quadraticCurveTo(1016, 40, 1024, 34);
      ctx.quadraticCurveTo(1028, 42, 1032, 34);
      ctx.quadraticCurveTo(1036, 44, 1030, 52);
      ctx.closePath();
      ctx.fill();
      text(ctx, `COMBO x${state.combo}`, 1038, 44, 15, '#ff9f1c', 'bold', 'left');
    } else {
      text(ctx, `Best ${best}`, 1030, 44, 15, PALETTE.muted, 'bold', 'left');
    }
  }

  function drawOrderBoard(state) {
    const board = BOARD;
    ctx.fillStyle = 'rgba(20,12,28,0.88)';
    roundRect(ctx, board.x, board.y, board.w, board.h, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 2;
    ctx.stroke();
    text(ctx, 'ORDER BOARD', board.x + 16, board.y + 22, 18, PALETTE.counterTrim);
    text(ctx, 'click a ticket to pick a customer', board.x + 16, board.y + 44, 12, PALETTE.muted, 'normal');
    if (state.customers.length === 0) {
      text(ctx, 'No orders yet —', board.x + 16, board.y + 90, 15, PALETTE.muted, 'normal');
      text(ctx, 'the festival crowd is coming!', board.x + 16, board.y + 112, 15, PALETTE.muted, 'normal');
      return;
    }
    state.customers.forEach((customer, index) => {
      const y = board.y + 62 + index * (board.ticketH + board.gap);
      const selected = index === state.selected;
      ctx.fillStyle = selected ? '#4a3560' : '#33264a';
      roundRect(ctx, board.x + 10, y, board.w - 20, board.ticketH, 10);
      ctx.fill();
      if (selected) {
        ctx.strokeStyle = PALETTE.counterTrim;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (customer.vip) {
        ctx.strokeStyle = PALETTE.coin;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      drawCustomerFace(ctx, customer, board.x + 40, y + 30, 22);
      text(ctx, customer.vip ? `★ ${customer.name}` : customer.name, board.x + 70, y + 20, 17, customer.vip ? PALETTE.coin : PALETTE.text);
      const moodText = customer.mood === 'angry' ? 'wrong order!'
        : customer.mood === 'happy' ? 'gracias!'
        : customer.vip ? 'VIP · pays double · impatient!' : 'waiting…';
      text(ctx, moodText, board.x + 70, y + 42, 12, customer.mood === 'angry' ? '#ff6b6b' : customer.vip ? PALETTE.coin : PALETTE.muted, customer.vip && customer.mood === 'waiting' ? 'bold' : 'normal');
      // Recipe icons.
      const recipe = customer.recipe;
      let ix = board.x + 34;
      const iy = y + 78;
      drawRecipeIcon(ctx, 'shell', recipe.shell, ix, iy);
      text(ctx, SHELL_LABEL[recipe.shell], ix, iy + 26, 10, PALETTE.muted, 'normal', 'center');
      ix += 52;
      drawRecipeIcon(ctx, 'protein', recipe.protein, ix, iy);
      text(ctx, PROTEIN_LABEL[recipe.protein], ix, iy + 26, 10, PALETTE.muted, 'normal', 'center');
      ix += 52;
      drawRecipeIcon(ctx, 'salsa', recipe.salsa, ix, iy);
      text(ctx, SALSA_LABEL[recipe.salsa], ix, iy + 26, 10, PALETTE.muted, 'normal', 'center');
      ix += 52;
      recipe.toppings.forEach((topping) => {
        drawRecipeIcon(ctx, 'topping', topping, ix, iy);
        text(ctx, TOPPING_LABEL[topping], ix, iy + 26, 10, PALETTE.muted, 'normal', 'center');
        ix += 44;
      });
      // Patience bar.
      const fraction = patienceFraction(customer);
      const barX = board.x + 70;
      const barY = y + 104;
      const barW = board.w - 100;
      ctx.fillStyle = '#1d1d24';
      roundRect(ctx, barX, barY, barW, 10, 5);
      ctx.fill();
      ctx.fillStyle = fraction > 0.5 ? PALETTE.good : fraction > 0.25 ? PALETTE.warn : PALETTE.bad;
      if (barW * fraction > 4) {
        roundRect(ctx, barX, barY, barW * fraction, 10, 5);
        ctx.fill();
      }
    });
  }

  function drawStationLabel(x, y, label, active) {
    text(ctx, label, x, y, 13, active ? PALETTE.counterTrim : PALETTE.muted, 'bold', 'center');
  }

  function drawFridge(state) {
    const station = STATIONS[STATION_FRIDGE];
    ctx.fillStyle = '#cfd8e3';
    roundRect(ctx, station.rect.x, station.rect.y, station.rect.w, station.rect.h, 10);
    ctx.fill();
    ctx.fillStyle = '#8fa3b8';
    ctx.fillRect(station.rect.x, station.rect.y + 60, station.rect.w, 4);
    drawStationLabel(station.x, station.rect.y - 12, 'FRIDGE', false);
    station.sub.forEach((bin) => {
      ctx.fillStyle = PROTEIN_COLOR[bin.id];
      roundRect(ctx, bin.rect.x, bin.rect.y, bin.rect.w, bin.rect.h, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(bin.rect.x + 21, bin.rect.y + 30, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      text(ctx, PROTEIN_LABEL[bin.id], bin.rect.x + 21, bin.rect.y + 64, 10, '#ffffff', 'bold', 'center');
    });
  }

  function drawTortillas() {
    const station = STATIONS[STATION_TORTILLA];
    drawStationLabel(station.x, station.rect.y - 12, 'TORTILLAS', false);
    station.sub.forEach((bin) => {
      ctx.fillStyle = '#d9a441';
      roundRect(ctx, bin.rect.x, bin.rect.y, bin.rect.w, bin.rect.h, 6);
      ctx.fill();
      for (let i = 0; i < 4; i += 1) {
        ctx.fillStyle = bin.id === 'crunchy' ? '#e8963c' : '#f2c14e';
        ctx.beginPath();
        ctx.ellipse(bin.rect.x + 20, bin.rect.y + 16 + i * 13, 15, 5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, SHELL_LABEL[bin.id], bin.rect.x + 20, bin.rect.y + 64, 10, '#3d2b1a', 'bold', 'center');
    });
  }

  function drawGrill(state, time) {
    const station = STATIONS[STATION_GRILL];
    drawStationLabel(station.x, station.rect.y - 12, 'GRILL', false);
    ctx.fillStyle = PALETTE.grill;
    roundRect(ctx, station.rect.x, station.rect.y, station.rect.w, station.rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#55555f';
    ctx.lineWidth = 2;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(station.rect.x + (station.rect.w / 5) * i, station.rect.y + 8);
      ctx.lineTo(station.rect.x + (station.rect.w / 5) * i, station.rect.y + station.rect.h - 8);
      ctx.stroke();
    }
    station.sub.forEach((slot, index) => {
      const meat = state.grill[index];
      const slotState = grillSlotState(meat);
      const cx = slot.rect.x + slot.rect.w / 2;
      const cy = slot.rect.y + slot.rect.h / 2;
      if (meat) {
        const flicker = Math.sin(time * 0.02 + index * 2) * 3;
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(cx - 16, slot.rect.y + slot.rect.h - 6);
        ctx.quadraticCurveTo(cx - 8, slot.rect.y + slot.rect.h - 22 - flicker, cx, slot.rect.y + slot.rect.h - 6);
        ctx.quadraticCurveTo(cx + 8, slot.rect.y + slot.rect.h - 22 - flicker, cx + 16, slot.rect.y + slot.rect.h - 6);
        ctx.closePath();
        ctx.fill();
        const progress = Math.min(1, meat.t / GRILL.cookSeconds);
        ctx.fillStyle = slotState === 'burnt' ? '#141414' : slotState === 'done' ? '#6e3b1f' : progress > 0.5 ? '#a05a30' : PROTEIN_COLOR[meat.protein];
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4, 20, 13, 0, 0, Math.PI * 2);
        ctx.fill();
        if (slotState === 'done') {
          text(ctx, '✓ READY', cx, slot.rect.y + slot.rect.h - 2, 11, PALETTE.good, 'bold', 'center');
        } else if (slotState === 'burnt') {
          text(ctx, '✕ BURNT', cx, slot.rect.y + slot.rect.h - 2, 11, PALETTE.bad, 'bold', 'center');
          ctx.fillStyle = 'rgba(200,200,200,0.5)';
          ctx.beginPath();
          ctx.arc(cx - 6, cy - 26, 5, 0, Math.PI * 2);
          ctx.arc(cx + 6, cy - 30, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#1d1d24';
          ctx.fillRect(cx - 20, slot.rect.y + slot.rect.h - 12, 40, 5);
          ctx.fillStyle = '#ffb347';
          ctx.fillRect(cx - 20, slot.rect.y + slot.rect.h - 12, 40 * progress, 5);
        }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(slot.rect.x + 4, slot.rect.y + 4, slot.rect.w - 8, slot.rect.h - 8);
        ctx.setLineDash([]);
      }
    });
  }

  function drawSalsaBar() {
    const station = STATIONS[STATION_SALSA];
    drawStationLabel(station.x, station.rect.y - 12, 'SALSA BAR', false);
    station.sub.forEach((bowl) => {
      ctx.fillStyle = '#f6f1e7';
      ctx.beginPath();
      ctx.arc(bowl.rect.x + 21, bowl.rect.y + 30, 19, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SALSA_COLOR[bowl.id];
      ctx.beginPath();
      ctx.arc(bowl.rect.x + 21, bowl.rect.y + 28, 16, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      if (bowl.id === 'hot') {
        // A little red chilli on the hot salsa.
        ctx.fillStyle = '#c1121f';
        ctx.beginPath();
        ctx.ellipse(bowl.rect.x + 21, bowl.rect.y + 12, 8, 3.5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2a9d4f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bowl.rect.x + 27, bowl.rect.y + 8);
        ctx.lineTo(bowl.rect.x + 31, bowl.rect.y + 4);
        ctx.stroke();
      }
      text(ctx, SALSA_LABEL[bowl.id], bowl.rect.x + 21, bowl.rect.y + 60, 10, PALETTE.text, 'bold', 'center');
    });
  }

  function drawToppings() {
    const station = STATIONS[STATION_TOPPINGS];
    drawStationLabel(station.x, station.rect.y - 12, 'TOPPINGS', false);
    station.sub.forEach((bin) => {
      ctx.fillStyle = '#f6f1e7';
      roundRect(ctx, bin.rect.x, bin.rect.y, bin.rect.w, bin.rect.h, 6);
      ctx.fill();
      drawToppingIcon(ctx, bin.rect.x + 21, bin.rect.y + 30, bin.id);
      text(ctx, TOPPING_LABEL[bin.id], bin.rect.x + 21, bin.rect.y + 64, 10, '#3d2b1a', 'bold', 'center');
    });
  }

  /** The taco being built, drawn on the plate from its parts. */
  function drawTacoOnPlate(taco, x, y) {
    if (!taco) return;
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.arc(x, y + 6, 62, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    if (taco.protein) {
      ctx.fillStyle = PROTEIN_COLOR[taco.protein];
      ctx.beginPath();
      ctx.ellipse(x - 22, y - 8, 26, 14, -0.2, 0, Math.PI * 2);
      ctx.ellipse(x + 24, y - 10, 24, 13, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (taco.salsa) {
      ctx.fillStyle = SALSA_COLOR[taco.salsa];
      ctx.beginPath();
      ctx.arc(x - 6, y - 20, 12, 0, Math.PI * 2);
      ctx.arc(x + 16, y - 22, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    taco.toppings.forEach((topping, index) => {
      const tx = x - 30 + index * 24;
      drawToppingIcon(ctx, tx, y - 30, topping);
    });
    if (taco.shell === 'crunchy') {
      ctx.strokeStyle = '#b97f1e';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y + 6, 52, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }

  function drawPlateAndServe(state) {
    const plateStation = STATIONS[STATION_PLATE];
    const serveStation = STATIONS[STATION_SERVE];
    // Assembly plate.
    ctx.fillStyle = PALETTE.plate;
    ctx.beginPath();
    ctx.ellipse(plateStation.x, plateStation.rect.y + 78, 108, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9c9a8';
    ctx.lineWidth = 3;
    ctx.stroke();
    drawTacoOnPlate(state.plate, plateStation.x, plateStation.rect.y + 78);
    if (!state.plate) {
      text(ctx, 'empty plate —', plateStation.x, plateStation.rect.y + 66, 14, '#8a7a63', 'normal', 'center');
      text(ctx, 'build a taco here', plateStation.x, plateStation.rect.y + 88, 14, '#8a7a63', 'normal', 'center');
    } else if (tacoIsComplete(state.plate)) {
      text(ctx, state.plate.perfect ? '★ PERFECT GRILL — READY TO SERVE' : '✓ READY TO SERVE', plateStation.x, plateStation.rect.y + 148, 14, state.plate.perfect ? PALETTE.coin : '#2a9d4f', 'bold', 'center');
    } else {
      const missing = [];
      if (!state.plate.protein) missing.push('meat');
      if (!state.plate.salsa) missing.push('salsa');
      text(ctx, `needs: ${missing.join(' + ')}`, plateStation.x, plateStation.rect.y + 148, 13, '#8a7a63', 'bold', 'center');
    }
    drawStationLabel(plateStation.x, plateStation.rect.y + 12, 'ASSEMBLY PLATE', false);
    // Serve window.
    ctx.fillStyle = '#33264a';
    roundRect(ctx, serveStation.rect.x, serveStation.rect.y, serveStation.rect.w, serveStation.rect.h, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.counterTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    const customer = state.customers[state.selected] ?? state.customers[0];
    if (customer) {
      drawCustomerFace(ctx, customer, serveStation.x - 70, serveStation.rect.y + 52, 24);
      text(ctx, customer.name, serveStation.x - 70, serveStation.rect.y + 92, 13, PALETTE.text, 'bold', 'center');
    }
    // Service bell.
    ctx.fillStyle = PALETTE.coin;
    ctx.beginPath();
    ctx.arc(serveStation.x + 60, serveStation.rect.y + 56, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(serveStation.x + 54, serveStation.rect.y + 56, 12, 6);
    text(ctx, 'SERVE', serveStation.x + 60, serveStation.rect.y + 100, 16, PALETTE.coin, 'bold', 'center');
    text(ctx, 'click or press S', serveStation.x + 60, serveStation.rect.y + 122, 11, PALETTE.muted, 'normal', 'center');
    drawStationLabel(serveStation.x, serveStation.rect.y + 12, 'SERVE WINDOW', tacoIsComplete(state.plate));
    // Trash.
    const trash = STATIONS[STATION_TRASH];
    ctx.fillStyle = '#3a3a44';
    roundRect(ctx, trash.rect.x, trash.rect.y, trash.rect.w, trash.rect.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();
    // A little trash can, drawn rather than an emoji.
    ctx.fillStyle = '#8a8a94';
    ctx.fillRect(trash.rect.x + 32, trash.rect.y + 22, 26, 6);
    ctx.fillStyle = '#55555f';
    ctx.beginPath();
    ctx.moveTo(trash.rect.x + 30, trash.rect.y + 30);
    ctx.lineTo(trash.rect.x + 60, trash.rect.y + 30);
    ctx.lineTo(trash.rect.x + 57, trash.rect.y + 62);
    ctx.lineTo(trash.rect.x + 33, trash.rect.y + 62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a8a94';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(trash.rect.x + 40, trash.rect.y + 36);
    ctx.lineTo(trash.rect.x + 40, trash.rect.y + 56);
    ctx.moveTo(trash.rect.x + 50, trash.rect.y + 36);
    ctx.lineTo(trash.rect.x + 50, trash.rect.y + 56);
    ctx.stroke();
    text(ctx, 'TRASH', trash.rect.x + 45, trash.rect.y + 78, 12, PALETTE.muted, 'bold', 'center');
    text(ctx, 'press T', trash.rect.x + 45, trash.rect.y + 96, 11, PALETTE.muted, 'normal', 'center');
  }

  function drawFlash(state) {
    if (!state.flash) return;
    const alpha = Math.min(1, state.flashTimer);
    ctx.globalAlpha = alpha;
    ctx.font = `bold 15px ${FONT}`;
    const w = ctx.measureText(state.flash).width + 40;
    ctx.fillStyle = 'rgba(20,12,28,0.9)';
    roundRect(ctx, 640 - w / 2 - 130, 636, w + 260, 34, 17);
    ctx.fill();
    ctx.strokeStyle = PALETTE.counterTrim;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    text(ctx, state.flash, 640, 654, 15, PALETTE.text, 'bold', 'center');
    ctx.globalAlpha = 1;
  }

  function drawHelpBar() {
    ctx.fillStyle = 'rgba(20,12,28,0.92)';
    ctx.fillRect(0, 682, FIELD.width, 38);
    text(ctx, '← → move · click a station to walk there · E grabs what the order needs · S serve · T trash · P pause · M mute', 640, 701, 14, PALETTE.muted, 'normal', 'center');
  }

  function drawOverlay(title, lines, accent) {
    ctx.fillStyle = 'rgba(16,8,24,0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = '#2b1a3e';
    roundRect(ctx, 340, 150, 600, 420, 18);
    ctx.fill();
    ctx.strokeStyle = PALETTE.counterTrim;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    drawTacoIcon(ctx, 640, 210, 34, 'chicken', 'verde');
    text(ctx, title, 640, 268, 44, accent, 'bold', 'center');
    lines.forEach((line, index) => {
      text(ctx, line.text, 640, 316 + index * 30, line.size || 17, line.color || PALETTE.text, line.weight || 'normal', 'center');
    });
  }

  function draw(state, screen, best, time = 0) {
    fit();
    drawBackdrop(time);
    drawHud(state, best);
    drawOrderBoard(state);
    drawFridge(state);
    drawTortillas();
    drawGrill(state, time);
    drawSalsaBar();
    drawToppings();
    drawPlateAndServe(state);
    if (screen === SCREEN_PLAY || screen === SCREEN_PAUSED) drawCook(ctx, state, time);
    drawFlash(state);
    drawHelpBar();
    if (screen === SCREEN_TITLE) {
      drawOverlay('TACO TRUCK FIESTA', [
        { text: 'Run the busiest taco truck at the festival!', size: 19 },
        { text: 'Grill the meat, build each taco to order,', size: 17, color: PALETTE.muted },
        { text: 'and serve it before the customer walks off.', size: 17, color: PALETTE.muted },
        { text: 'Match the ticket exactly — wrong orders cost patience.', size: 17, color: PALETTE.muted },
        { text: 'Last 30 seconds: RUSH HOUR, faster orders, bigger tips!', size: 17, color: '#ffb347' },
        { text: 'VIPs pay double — and a perfect grill earns a bonus!', size: 17, color: PALETTE.coin },
        { text: best > 0 ? `Best shift: ${best} coins` : 'Your first shift awaits…', size: 16, color: PALETTE.coin },
        { text: 'Press SPACE or click to start', size: 20, color: PALETTE.counterTrim },
      ], PALETTE.text);
    } else if (screen === SCREEN_PAUSED) {
      drawOverlay('PAUSED', [
        { text: 'The grill waits for no one… well, just this once.', size: 17, color: PALETTE.muted },
        { text: 'Press P or click to keep cooking', size: 19, color: PALETTE.counterTrim },
      ], PALETTE.text);
    } else if (screen === SCREEN_OVER) {
      const stars = '★'.repeat(state.stars) + '☆'.repeat(3 - state.stars);
      drawOverlay('SHIFT OVER!', [
        { text: stars, size: 34, color: PALETTE.coin },
        { text: `Coins earned: ${state.coins}`, size: 22 },
        { text: `Tacos served: ${state.served}   ·   Walked off: ${state.missed}`, size: 17, color: PALETTE.muted },
        { text: `Best combo: x${state.bestCombo}   ·   Wrong serves: ${state.wrongServes}`, size: 17, color: PALETTE.muted },
        { text: `Perfect grills served: ${state.perfectServes}`, size: 17, color: PALETTE.coin },
        { text: best > 0 ? `Best shift: ${best} coins` : '', size: 16, color: PALETTE.coin },
        { text: 'Press SPACE to run another shift', size: 19, color: PALETTE.counterTrim },
      ], PALETTE.text);
    }
  }

  return { draw };
}
