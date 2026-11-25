// Smokehouse BBQ — everything the player sees, painted on one canvas: the night yard,
// the timber smokehouse and its awning, the ticket rail, the stations, the pitmaster,
// the plate being built and the screens. The painter only reads the pit; it never
// changes it.

import {
  BOARD_H, BOARD_W, COLORS, FRIDGE, PITMASTER, PLATE_ST, RAIL, RUSH_TAIL,
  SAUCE_ST, SERVE_ST, SIDES_ST, SMOKER, SMOKER_ST, STATIONS, TRASH_ST, TYPEFACE,
} from './tuning.js';
import { patienceLeft } from './patrons.js';
import { plateReady, rackState } from './pit.js';

export const VIEW_TITLE = 'title';
export const VIEW_PLAY = 'play';
export const VIEW_PAUSED = 'paused';
export const VIEW_OVER = 'over';

const MEAT_FILL = { brisket: '#7a3b22', ribs: '#a85a32', chicken: '#e8c07a' };
const MEAT_NAME = { brisket: 'Brisket', ribs: 'Ribs', chicken: 'Chicken' };
const SAUCE_FILL = { sweet: '#e8a13c', spicy: '#d94040', smoky: '#6e4a2f' };
const SAUCE_NAME = { sweet: 'Sweet', spicy: 'Spicy', smoky: 'Smoky' };
const SIDE_NAME = { slaw: 'Slaw', beans: 'Beans', cornbread: 'Cornbread' };

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function label(ctx, value, x, y, size, color, weight = 'bold', align = 'left') {
  ctx.fillStyle = color;
  ctx.font = `${weight} ${size}px ${TYPEFACE}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(value, x, y);
}

function clockStr(seconds) {
  const left = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

/** A little smoked-meat slab icon. */
function meatIcon(ctx, x, y, meat) {
  ctx.fillStyle = MEAT_FILL[meat];
  ctx.beginPath();
  ctx.ellipse(x, y, 13, 8, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + 3, 8, 4, -0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.ellipse(x - 4, y - 3, 5, 2.5, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

/** A sauce bowl icon. */
function sauceIcon(ctx, x, y, sauce) {
  ctx.fillStyle = '#f7f1e3';
  ctx.beginPath();
  ctx.arc(x, y + 3, 11, 0, Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = SAUCE_FILL[sauce];
  ctx.beginPath();
  ctx.arc(x, y, 9, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
}

/** A side-dish icon: slaw shreds, beans, or cornbread squares. */
function sideIcon(ctx, x, y, side) {
  if (side === 'slaw') {
    ctx.strokeStyle = '#7ed491';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 6); ctx.lineTo(x + 10, y - 6);
    ctx.moveTo(x - 10, y); ctx.lineTo(x + 10, y);
    ctx.moveTo(x - 10, y + 6); ctx.lineTo(x + 10, y + 6);
    ctx.stroke();
    ctx.strokeStyle = '#f7f1e3';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x - 8, y - 3); ctx.lineTo(x + 8, y - 3);
    ctx.moveTo(x - 8, y + 3); ctx.lineTo(x + 8, y + 3);
    ctx.stroke();
  } else if (side === 'beans') {
    ctx.fillStyle = '#6e4a2f';
    for (const [dx, dy] of [[-7, -3], [0, 2], [7, -3], [-2, -6], [4, 6]]) {
      ctx.beginPath();
      ctx.ellipse(x + dx, y + dy, 4, 3, 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    ctx.fillStyle = '#e8a13c';
    ctx.fillRect(x - 10, y - 7, 9, 9);
    ctx.fillRect(x + 1, y - 7, 9, 9);
    ctx.fillRect(x - 10, y + 3, 9, 9);
    ctx.fillRect(x + 1, y + 3, 9, 9);
    ctx.fillStyle = '#c97f1e';
    ctx.fillRect(x - 10, y + 1, 20, 1.5);
  }
}

/** One ticket icon in a row, labelled underneath by the caller. */
function ticketIcon(ctx, kind, value, x, y) {
  if (kind === 'meat') meatIcon(ctx, x, y, value);
  else if (kind === 'sauce') sauceIcon(ctx, x, y, value);
  else sideIcon(ctx, x, y, value);
}

/** A guest's face in the queue: skin, hat, and a grin — or a scowl when mad. */
function drawGuest(ctx, guest, x, y, r) {
  ctx.fillStyle = guest.skin;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c1226';
  ctx.beginPath();
  ctx.arc(x - r * 0.35, y - r * 0.1, r * 0.09, 0, Math.PI * 2);
  ctx.arc(x + r * 0.35, y - r * 0.1, r * 0.09, 0, Math.PI * 2);
  ctx.fill();
  const happy = guest.mood === 'happy';
  const mad = guest.mood === 'mad';
  ctx.strokeStyle = '#1c1226';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (mad) {
    ctx.arc(x, y + r * 0.8, r * 0.4, Math.PI * 1.15, Math.PI * 1.85);
  } else {
    ctx.arc(x, y + r * 0.25, r * 0.4, 0.15 * Math.PI, 0.85 * Math.PI);
  }
  ctx.stroke();
  if (happy) {
    ctx.beginPath();
    ctx.moveTo(x - r * 0.7, y - r * 0.5);
    ctx.lineTo(x - r * 0.4, y - r * 0.25);
    ctx.moveTo(x + r * 0.7, y - r * 0.5);
    ctx.lineTo(x + r * 0.4, y - r * 0.25);
    ctx.stroke();
  }
  if (guest.hat === 'cap') {
    ctx.fillStyle = guest.shirt;
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 0.95, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x + r * 0.4, y - r * 0.5, r * 0.8, r * 0.18);
  } else if (guest.hat === 'bandana') {
    ctx.fillStyle = '#d94040';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 0.95, Math.PI * 1.05, Math.PI * 1.95);
    ctx.fill();
    ctx.fillRect(x - r * 0.95, y - r * 0.35, r * 0.35, r * 0.5);
  } else if (guest.hat === 'beanie') {
    ctx.fillStyle = '#7b61ff';
    ctx.beginPath();
    ctx.arc(x, y - r * 0.3, r * 0.95, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r * 0.95, y - r * 0.35, r * 1.9, r * 0.18);
  } else if (guest.hat === 'flatcap') {
    ctx.fillStyle = '#6e4a2f';
    ctx.beginPath();
    ctx.ellipse(x, y - r * 0.55, r * 1.05, r * 0.45, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - r * 1.05, y - r * 0.6, r * 2.1, r * 0.14);
  }
}

/** The pitmaster: flat cap, beard, apron, and whatever they carry held overhead. */
function drawPitmaster(ctx, pit, time) {
  const x = pit.chefX;
  const y = PITMASTER.floorY;
  const bob = Math.sin(time * 0.012) * 1.5;
  const walking = pit.goalX !== null;
  const sway = walking ? Math.sin(time * 0.03) * 3 : 0;
  // Boots and legs.
  ctx.fillStyle = '#2b2b3a';
  ctx.fillRect(x - 13 + sway, y + 16, 10, 18);
  ctx.fillRect(x + 3 - sway, y + 16, 10, 18);
  // Apron.
  ctx.fillStyle = '#3a2c22';
  rr(ctx, x - 20, y - 14 + bob, 40, 34, 8);
  ctx.fill();
  ctx.fillStyle = '#d94040';
  ctx.fillRect(x - 20, y + 8 + bob, 40, 8);
  // Arms.
  ctx.strokeStyle = '#c98d5f';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - 18, y - 6 + bob);
  ctx.lineTo(x - 26, y + 10 + bob);
  ctx.moveTo(x + 18, y - 6 + bob);
  ctx.lineTo(x + 26, y + 10 + bob);
  ctx.stroke();
  // Head, beard and flat cap.
  ctx.fillStyle = '#c98d5f';
  ctx.beginPath();
  ctx.arc(x, y - 26 + bob, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#5a3a22';
  ctx.beginPath();
  ctx.arc(x, y - 18 + bob, 10, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#2a2a33';
  ctx.beginPath();
  ctx.ellipse(x, y - 36 + bob, 15, 6, 0, Math.PI, 0);
  ctx.fill();
  ctx.fillRect(x - 15, y - 38 + bob, 30, 4);
  // Grin under the beard.
  ctx.strokeStyle = '#1c1226';
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.arc(x, y - 22 + bob, 4, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  // What the pitmaster carries, held up in a bubble.
  const held = pit.hands;
  if (held) {
    const bx = x;
    const by = y - 66 + bob;
    ctx.fillStyle = 'rgba(28,18,38,0.92)';
    rr(ctx, bx - 56, by - 16, 112, 32, 16);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    let text = '';
    if (held.kind === 'meat') text = `${MEAT_NAME[held.meat]}${held.smoked ? ' ✓' : ' (raw)'}`;
    else if (held.kind === 'sauce') text = `${SAUCE_NAME[held.sauce]} sauce`;
    else text = SIDE_NAME[held.side];
    label(ctx, text, bx, by + 1, 14, COLORS.ink, 'bold', 'center');
  }
}

export function makePainter(canvas) {
  const ctx = canvas.getContext('2d');

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || BOARD_W;
    const h = canvas.clientHeight || BOARD_H;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(canvas.width / BOARD_W, 0, 0, canvas.height / BOARD_H, 0, 0);
  }

  function paintYard(time) {
    const sky = ctx.createLinearGradient(0, 0, 0, 720);
    sky.addColorStop(0, COLORS.night);
    sky.addColorStop(0.55, COLORS.dusk);
    sky.addColorStop(1, '#3d1f3d');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    // String lights over the yard.
    ctx.strokeStyle = 'rgba(255,201,77,0.5)';
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
      ctx.fillStyle = i % 3 === 0 ? `rgba(255,201,77,${glow})` : i % 3 === 1 ? `rgba(217,64,64,${glow})` : `rgba(126,212,145,${glow})`;
      ctx.beginPath();
      ctx.arc(x, y + 8, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Timber smokehouse wall and striped awning.
    ctx.fillStyle = COLORS.timber;
    ctx.fillRect(0, 120, BOARD_W, 240);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    for (let y = 150; y < 360; y += 30) ctx.fillRect(0, y, BOARD_W, 3);
    for (let i = 0; i < 16; i += 1) {
      ctx.fillStyle = i % 2 === 0 ? COLORS.stripeA : COLORS.stripeB;
      ctx.fillRect(i * 80, 118, 80, 30);
      ctx.beginPath();
      ctx.moveTo(i * 80, 148);
      ctx.lineTo(i * 80 + 40, 168);
      ctx.lineTo(i * 80 + 80, 148);
      ctx.closePath();
      ctx.fill();
    }
    // Counter.
    ctx.fillStyle = COLORS.counterTop;
    ctx.fillRect(300, 292, 980, 22);
    ctx.fillStyle = COLORS.counterSide;
    ctx.fillRect(300, 314, 980, 42);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(300, 314, 980, 4);
    // Lower pass (plating board + serve hatch).
    ctx.fillStyle = COLORS.counterTop;
    ctx.fillRect(360, 530, 700, 20);
    ctx.fillStyle = COLORS.counterSide;
    ctx.fillRect(360, 550, 700, 18);
    // Yard floor and walkway.
    ctx.fillStyle = COLORS.floor;
    ctx.fillRect(0, 556, BOARD_W, 164);
    ctx.fillStyle = COLORS.lane;
    ctx.fillRect(300, 556, 980, 100);
    ctx.fillStyle = 'rgba(255,201,77,0.18)';
    ctx.fillRect(300, 556, 980, 4);
  }

  function paintHud(pit, best) {
    ctx.fillStyle = 'rgba(20,12,28,0.92)';
    ctx.fillRect(0, 0, BOARD_W, 62);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(0, 62, BOARD_W, 3);
    meatIcon(ctx, 40, 32, 'brisket');
    sauceIcon(ctx, 62, 30, 'spicy');
    label(ctx, 'SMOKEHOUSE BBQ', 84, 32, 26, COLORS.ink);
    // Shift clock, big in the middle.
    const low = pit.clock <= 30;
    const rush = pit.clock <= RUSH_TAIL && !pit.done;
    label(ctx, 'SHIFT', 560, 20, 13, COLORS.dim, 'bold', 'center');
    label(ctx, clockStr(pit.clock), 560, 44, 30, low ? '#ff6b6b' : COLORS.ink, 'bold', 'center');
    if (rush) label(ctx, 'DINNER RUSH!', 700, 32, 18, '#ffb347', 'bold', 'left');
    // Coins, streak and plates served.
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(892, 32, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b97f1e';
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, '¢', 892, 33, 14, '#7a5a00', 'bold', 'center');
    label(ctx, `${pit.purse}`, 910, 32, 24, COLORS.coin, 'bold', 'left');
    label(ctx, `Served ${pit.served} · Lost ${pit.lost}`, 1030, 22, 15, COLORS.dim, 'bold', 'left');
    if (pit.streak >= 2) {
      ctx.fillStyle = '#ff9f1c';
      ctx.beginPath();
      ctx.moveTo(1024, 52);
      ctx.quadraticCurveTo(1016, 40, 1024, 34);
      ctx.quadraticCurveTo(1028, 42, 1032, 34);
      ctx.quadraticCurveTo(1036, 44, 1030, 52);
      ctx.closePath();
      ctx.fill();
      label(ctx, `STREAK x${pit.streak}`, 1038, 44, 15, '#ff9f1c', 'bold', 'left');
    } else {
      label(ctx, `Best ${best}`, 1030, 44, 15, COLORS.dim, 'bold', 'left');
    }
  }

  function paintRail(pit) {
    const rail = RAIL;
    ctx.fillStyle = 'rgba(20,12,28,0.88)';
    rr(ctx, rail.x, rail.y, rail.w, rail.h, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    label(ctx, 'TICKET RAIL', rail.x + 16, rail.y + 22, 18, COLORS.gold);
    label(ctx, 'click a ticket to pick a guest', rail.x + 16, rail.y + 44, 12, COLORS.dim, 'normal');
    if (pit.guests.length === 0) {
      label(ctx, 'No tickets yet —', rail.x + 16, rail.y + 90, 15, COLORS.dim, 'normal');
      label(ctx, 'the dinner crowd is coming!', rail.x + 16, rail.y + 112, 15, COLORS.dim, 'normal');
      return;
    }
    pit.guests.forEach((guest, index) => {
      const y = rail.y + 62 + index * (rail.cardH + rail.gap);
      const picked = index === pit.picked;
      ctx.fillStyle = picked ? '#3d2c50' : '#2e2138';
      rr(ctx, rail.x + 10, y, rail.w - 20, rail.cardH, 10);
      ctx.fill();
      if (picked) {
        ctx.strokeStyle = COLORS.gold;
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else if (guest.vip) {
        ctx.strokeStyle = COLORS.coin;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      drawGuest(ctx, guest, rail.x + 40, y + 30, 22);
      label(ctx, guest.vip ? `★ ${guest.name}` : guest.name, rail.x + 70, y + 20, 17, guest.vip ? COLORS.coin : COLORS.ink);
      const mood = guest.mood === 'mad' ? 'wrong plate!'
        : guest.mood === 'happy' ? 'mmm, smoky!'
        : guest.vip ? 'RUSH ORDER · pays double · in a hurry!' : 'waiting…';
      label(ctx, mood, rail.x + 70, y + 42, 12, guest.mood === 'mad' ? '#ff6b6b' : guest.vip ? COLORS.coin : COLORS.dim, guest.vip && guest.mood === 'waiting' ? 'bold' : 'normal');
      // Ticket icons.
      const ticket = guest.ticket;
      let ix = rail.x + 34;
      const iy = y + 70;
      ticketIcon(ctx, 'meat', ticket.meat, ix, iy);
      label(ctx, MEAT_NAME[ticket.meat], ix, iy + 24, 10, COLORS.dim, 'normal', 'center');
      ix += 62;
      ticketIcon(ctx, 'sauce', ticket.sauce, ix, iy);
      label(ctx, SAUCE_NAME[ticket.sauce], ix, iy + 24, 10, COLORS.dim, 'normal', 'center');
      ix += 62;
      ticketIcon(ctx, 'side', ticket.side, ix, iy);
      label(ctx, SIDE_NAME[ticket.side], ix, iy + 24, 10, COLORS.dim, 'normal', 'center');
      // Patience bar.
      const frac = patienceLeft(guest);
      const barX = rail.x + 70;
      const barY = y + 108;
      const barW = rail.w - 100;
      ctx.fillStyle = '#1d1d24';
      rr(ctx, barX, barY, barW, 10, 5);
      ctx.fill();
      ctx.fillStyle = frac > 0.5 ? COLORS.good : frac > 0.25 ? COLORS.warn : COLORS.bad;
      if (barW * frac > 4) {
        rr(ctx, barX, barY, barW * frac, 10, 5);
        ctx.fill();
      }
    });
  }

  function stationTag(x, y, text, active) {
    // A dark pill behind the tag so it reads over the awning.
    ctx.font = `bold 13px ${TYPEFACE}`;
    const w = ctx.measureText(text).width + 18;
    ctx.fillStyle = 'rgba(20,12,28,0.85)';
    rr(ctx, x - w / 2, y - 10, w, 20, 10);
    ctx.fill();
    label(ctx, text, x, y + 1, 13, active ? COLORS.gold : COLORS.dim, 'bold', 'center');
  }

  function paintFridge() {
    const st = STATIONS[FRIDGE];
    ctx.fillStyle = '#cfd8e3';
    rr(ctx, st.box.x, st.box.y, st.box.w, st.box.h, 10);
    ctx.fill();
    ctx.fillStyle = '#8fa3b8';
    ctx.fillRect(st.box.x, st.box.y + 58, st.box.w, 4);
    stationTag(st.x, st.box.y - 12, 'FRIDGE', false);
    st.bins.forEach((bin) => {
      ctx.fillStyle = MEAT_FILL[bin.id];
      rr(ctx, bin.box.x, bin.box.y, bin.box.w, bin.box.h, 6);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.ellipse(bin.box.x + 20, bin.box.y + 28, 13, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      label(ctx, MEAT_NAME[bin.id], bin.box.x + 20, bin.box.y + 60, 9, '#ffffff', 'bold', 'center');
    });
  }

  function paintSmoker(pit, time) {
    const st = STATIONS[SMOKER_ST];
    stationTag(st.x, st.box.y - 14, 'SMOKER', false);
    // Chimney and drifting smoke.
    ctx.fillStyle = '#3a3a44';
    ctx.fillRect(st.box.x + 84, st.box.y - 22, 52, 24);
    for (let i = 0; i < 3; i += 1) {
      const drift = Math.sin(time * 0.002 + i * 2) * 8;
      ctx.fillStyle = `rgba(220,220,220,${0.35 - i * 0.08})`;
      ctx.beginPath();
      ctx.arc(st.box.x + 110 + drift, st.box.y - 30 - i * 14, 9 + i * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = COLORS.smoker;
    rr(ctx, st.box.x, st.box.y, st.box.w, st.box.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#55555f';
    ctx.lineWidth = 2;
    ctx.stroke();
    st.bins.forEach((rackBox, index) => {
      const rack = pit.racks[index];
      const how = rackState(rack);
      const cx = rackBox.box.x + rackBox.box.w / 2;
      const cy = rackBox.box.y + rackBox.box.h / 2;
      if (rack) {
        const flicker = Math.sin(time * 0.02 + index * 2) * 3;
        ctx.fillStyle = '#ff9f1c';
        ctx.beginPath();
        ctx.moveTo(cx - 15, rackBox.box.y + rackBox.box.h - 6);
        ctx.quadraticCurveTo(cx - 7, rackBox.box.y + rackBox.box.h - 20 - flicker, cx, rackBox.box.y + rackBox.box.h - 6);
        ctx.quadraticCurveTo(cx + 7, rackBox.box.y + rackBox.box.h - 20 - flicker, cx + 15, rackBox.box.y + rackBox.box.h - 6);
        ctx.closePath();
        ctx.fill();
        const progress = Math.min(1, rack.age / SMOKER.readyAt);
        ctx.fillStyle = how === 'burnt' ? '#141414' : how === 'ready' ? '#5a3a22' : progress > 0.5 ? '#8a5a30' : MEAT_FILL[rack.meat];
        ctx.beginPath();
        ctx.ellipse(cx, cy - 4, 20, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        if (how === 'ready') {
          label(ctx, '✓ READY', cx, rackBox.box.y + rackBox.box.h - 2, 11, COLORS.good, 'bold', 'center');
        } else if (how === 'burnt') {
          label(ctx, '✕ BURNT', cx, rackBox.box.y + rackBox.box.h - 2, 11, COLORS.bad, 'bold', 'center');
          ctx.fillStyle = 'rgba(200,200,200,0.5)';
          ctx.beginPath();
          ctx.arc(cx - 6, cy - 24, 5, 0, Math.PI * 2);
          ctx.arc(cx + 6, cy - 28, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#1d1d24';
          ctx.fillRect(cx - 19, rackBox.box.y + rackBox.box.h - 12, 38, 5);
          ctx.fillStyle = '#ffb347';
          ctx.fillRect(cx - 19, rackBox.box.y + rackBox.box.h - 12, 38 * progress, 5);
        }
      } else {
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(rackBox.box.x + 4, rackBox.box.y + 4, rackBox.box.w - 8, rackBox.box.h - 8);
        ctx.setLineDash([]);
      }
    });
  }

  function paintSauces() {
    const st = STATIONS[SAUCE_ST];
    stationTag(st.x, st.box.y - 12, 'SAUCE BAR', false);
    st.bins.forEach((bowl) => {
      ctx.fillStyle = '#f7f1e3';
      ctx.beginPath();
      ctx.arc(bowl.box.x + 20, bowl.box.y + 28, 18, 0, Math.PI);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = SAUCE_FILL[bowl.id];
      ctx.beginPath();
      ctx.arc(bowl.box.x + 20, bowl.box.y + 26, 15, Math.PI, 0);
      ctx.closePath();
      ctx.fill();
      if (bowl.id === 'spicy') {
        // A little red chilli on the spicy sauce.
        ctx.fillStyle = '#a1121f';
        ctx.beginPath();
        ctx.ellipse(bowl.box.x + 20, bowl.box.y + 12, 8, 3.5, -0.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#2a9d4f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(bowl.box.x + 26, bowl.box.y + 8);
        ctx.lineTo(bowl.box.x + 30, bowl.box.y + 4);
        ctx.stroke();
      }
      label(ctx, SAUCE_NAME[bowl.id], bowl.box.x + 20, bowl.box.y + 56, 10, COLORS.ink, 'bold', 'center');
    });
  }

  function paintSides() {
    const st = STATIONS[SIDES_ST];
    stationTag(st.x, st.box.y - 12, 'SIDES', false);
    st.bins.forEach((bin) => {
      ctx.fillStyle = '#f7f1e3';
      rr(ctx, bin.box.x, bin.box.y, bin.box.w, bin.box.h, 6);
      ctx.fill();
      sideIcon(ctx, bin.box.x + 20, bin.box.y + 28, bin.id);
      label(ctx, bin.label, bin.box.x + 20, bin.box.y + 60, 9, '#3d2b1a', 'bold', 'center');
    });
  }

  /** The plate being built, painted on the board from its parts. */
  function paintPlateFood(plate, x, y) {
    if (!plate) return;
    if (plate.meat) {
      ctx.fillStyle = MEAT_FILL[plate.meat];
      ctx.beginPath();
      ctx.ellipse(x, y + 2, 52, 26, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.ellipse(x + 8, y + 10, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    if (plate.sauce) {
      ctx.fillStyle = SAUCE_FILL[plate.sauce];
      ctx.beginPath();
      ctx.arc(x - 30, y - 12, 11, 0, Math.PI * 2);
      ctx.arc(x + 28, y - 14, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    if (plate.side) {
      ctx.save();
      ctx.translate(x + 4, y - 26);
      sideIcon(ctx, 0, 0, plate.side);
      ctx.restore();
    }
    if (plate.prime) {
      ctx.strokeStyle = COLORS.gold;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y + 2, 60, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function paintBoardAndHatch(pit) {
    const board = STATIONS[PLATE_ST];
    const hatch = STATIONS[SERVE_ST];
    // Plating board.
    ctx.fillStyle = COLORS.plate;
    ctx.beginPath();
    ctx.ellipse(board.x, board.box.y + 76, 112, 62, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d9c9a8';
    ctx.lineWidth = 3;
    ctx.stroke();
    paintPlateFood(pit.plate, board.x, board.box.y + 76);
    if (!pit.plate) {
      label(ctx, 'empty board —', board.x, board.box.y + 64, 14, '#8a7a63', 'normal', 'center');
      label(ctx, 'build a plate here', board.x, board.box.y + 86, 14, '#8a7a63', 'normal', 'center');
    } else if (plateReady(pit.plate)) {
      label(ctx, pit.plate.prime ? '★ PRIME SMOKE — READY TO SERVE' : '✓ READY TO SERVE', board.x, board.box.y + 148, 14, pit.plate.prime ? COLORS.coin : '#2a9d4f', 'bold', 'center');
    } else {
      const missing = [];
      if (!pit.plate.meat) missing.push('meat');
      if (!pit.plate.sauce) missing.push('sauce');
      if (!pit.plate.side) missing.push('side');
      label(ctx, `needs: ${missing.join(' + ')}`, board.x, board.box.y + 148, 13, '#8a7a63', 'bold', 'center');
    }
    stationTag(board.x, board.box.y + 12, 'PLATING BOARD', false);
    // Serve hatch.
    ctx.fillStyle = '#2e2138';
    rr(ctx, hatch.box.x, hatch.box.y, hatch.box.w, hatch.box.h, 12);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();
    const guest = pit.guests[pit.picked] ?? pit.guests[0];
    if (guest) {
      drawGuest(ctx, guest, hatch.x - 72, hatch.box.y + 52, 24);
      label(ctx, guest.name, hatch.x - 72, hatch.box.y + 92, 13, COLORS.ink, 'bold', 'center');
    }
    // Service bell.
    ctx.fillStyle = COLORS.coin;
    ctx.beginPath();
    ctx.arc(hatch.x + 62, hatch.box.y + 56, 22, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(hatch.x + 56, hatch.box.y + 56, 12, 6);
    label(ctx, 'SERVE', hatch.x + 62, hatch.box.y + 100, 16, COLORS.coin, 'bold', 'center');
    label(ctx, 'click or press S', hatch.x + 62, hatch.box.y + 122, 11, COLORS.dim, 'normal', 'center');
    stationTag(hatch.x, hatch.box.y + 12, 'SERVE HATCH', plateReady(pit.plate));
    // Bin.
    const bin = STATIONS[TRASH_ST];
    ctx.fillStyle = '#3a3a44';
    rr(ctx, bin.box.x, bin.box.y, bin.box.w, bin.box.h, 8);
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#8a8a94';
    ctx.fillRect(bin.box.x + 27, bin.box.y + 22, 26, 6);
    ctx.fillStyle = '#55555f';
    ctx.beginPath();
    ctx.moveTo(bin.box.x + 25, bin.box.y + 30);
    ctx.lineTo(bin.box.x + 55, bin.box.y + 30);
    ctx.lineTo(bin.box.x + 52, bin.box.y + 62);
    ctx.lineTo(bin.box.x + 28, bin.box.y + 62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a8a94';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bin.box.x + 35, bin.box.y + 36);
    ctx.lineTo(bin.box.x + 35, bin.box.y + 56);
    ctx.moveTo(bin.box.x + 45, bin.box.y + 36);
    ctx.lineTo(bin.box.x + 45, bin.box.y + 56);
    ctx.stroke();
    label(ctx, 'BIN', bin.box.x + 40, bin.box.y + 78, 12, COLORS.dim, 'bold', 'center');
    label(ctx, 'press T', bin.box.x + 40, bin.box.y + 96, 11, COLORS.dim, 'normal', 'center');
  }

  function paintBanner(pit) {
    if (!pit.banner) return;
    const alpha = Math.min(1, pit.bannerLeft);
    ctx.globalAlpha = alpha;
    ctx.font = `bold 15px ${TYPEFACE}`;
    const w = ctx.measureText(pit.banner).width + 40;
    ctx.fillStyle = 'rgba(20,12,28,0.9)';
    rr(ctx, 640 - w / 2 - 130, 640, w + 260, 34, 17);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    label(ctx, pit.banner, 640, 658, 15, COLORS.ink, 'bold', 'center');
    ctx.globalAlpha = 1;
  }

  function paintHints() {
    ctx.fillStyle = 'rgba(20,12,28,0.92)';
    ctx.fillRect(0, 682, BOARD_W, 38);
    label(ctx, '← → walk · click a station to stroll over · E grabs what the ticket needs · S serve · T bin · P pause · M mute', 640, 701, 14, COLORS.dim, 'normal', 'center');
  }

  function paintPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(16,8,24,0.78)';
    ctx.fillRect(0, 0, BOARD_W, BOARD_H);
    ctx.fillStyle = '#241530';
    rr(ctx, 340, 150, 600, 420, 18);
    ctx.fill();
    ctx.strokeStyle = COLORS.gold;
    ctx.lineWidth = 2.5;
    ctx.stroke();
    meatIcon(ctx, 610, 210, 'ribs');
    sauceIcon(ctx, 670, 208, 'smoky');
    label(ctx, title, 640, 268, 44, accent, 'bold', 'center');
    lines.forEach((line, index) => {
      label(ctx, line.text, 640, 316 + index * 30, line.size || 17, line.color || COLORS.ink, line.weight || 'normal', 'center');
    });
  }

  function paint(pit, screen, best, time = 0) {
    fit();
    paintYard(time);
    paintHud(pit, best);
    paintRail(pit);
    paintFridge();
    paintSmoker(pit, time);
    paintSauces();
    paintSides();
    paintBoardAndHatch(pit);
    if (screen === VIEW_PLAY || screen === VIEW_PAUSED) drawPitmaster(ctx, pit, time);
    paintBanner(pit);
    paintHints();
    if (screen === VIEW_TITLE) {
      paintPanel('SMOKEHOUSE BBQ', [
        { text: 'Run the busiest smokehouse at the festival!', size: 19 },
        { text: 'Smoke the meat low and slow, sauce it, side it,', size: 17, color: COLORS.dim },
        { text: 'and serve it before the guest walks off.', size: 17, color: COLORS.dim },
        { text: 'Match the ticket exactly — wrong plates cost patience.', size: 17, color: COLORS.dim },
        { text: 'Last 30 seconds: DINNER RUSH, faster guests, bigger tips!', size: 17, color: '#ffb347' },
        { text: 'Rush-order VIPs pay double — prime smoke earns a bonus!', size: 17, color: COLORS.coin },
        { text: best > 0 ? `Best shift: ${best} coins` : 'Your first shift awaits…', size: 16, color: COLORS.coin },
        { text: 'Press SPACE or click to start', size: 20, color: COLORS.gold },
      ], COLORS.ink);
    } else if (screen === VIEW_PAUSED) {
      paintPanel('PAUSED', [
        { text: 'The smoker waits for no one… well, just this once.', size: 17, color: COLORS.dim },
        { text: 'Press P or click to keep cooking', size: 19, color: COLORS.gold },
      ], COLORS.ink);
    } else if (screen === VIEW_OVER) {
      const stars = '★'.repeat(pit.stars) + '☆'.repeat(3 - pit.stars);
      paintPanel('SHIFT OVER!', [
        { text: stars, size: 34, color: COLORS.coin },
        { text: `Coins earned: ${pit.purse}`, size: 22 },
        { text: `Plates served: ${pit.served}   ·   Walked off: ${pit.lost}`, size: 17, color: COLORS.dim },
        { text: `Best streak: x${pit.bestStreak}   ·   Wrong plates: ${pit.wrong}`, size: 17, color: COLORS.dim },
        { text: `Prime plates served: ${pit.primePlates}`, size: 17, color: COLORS.coin },
        { text: best > 0 ? `Best shift: ${best} coins` : '', size: 16, color: COLORS.coin },
        { text: 'Press SPACE to run another shift', size: 19, color: COLORS.gold },
      ], COLORS.ink);
    }
  }

  return { draw: paint };
}
