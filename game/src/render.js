// Ember & Thyme — everything you see: the hearth kitchen drawn on one
// canvas. Warm wood, brick and firelight; every station reads at a glance.

import { INGREDIENTS, ingredientById, needLabel, plateProgress, recipeById } from './recipes.js';
import { SHIFT_SECONDS } from './state.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const LAYOUT = {
  board: { x: 336, y: 356, w: 224, h: 168 },
  grill: [
    { x: 608, y: 356, w: 128, h: 168 },
    { x: 744, y: 356, w: 128, h: 168 },
  ],
  plate: { x: 920, y: 356, w: 344, h: 168 },
  window: { x: 920, y: 84, w: 344, h: 196 },
  trash: { x: 1200, y: 560, w: 64, h: 120 },
  bins: INGREDIENTS.map((g, i) => ({
    ing: g.id,
    x: 16 + i * 196,
    y: 560,
    w: 184,
    h: 120,
  })),
  orders: [
    { x: 16, y: 84, w: 300, h: 140 },
    { x: 16, y: 232, w: 300, h: 140 },
    { x: 16, y: 380, w: 300, h: 140 },
  ],
};

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function text(ctx, s, x, y, size, color, align, weight) {
  ctx.fillStyle = color;
  ctx.font = `${weight || 700} ${size}px Georgia, 'Times New Roman', serif`;
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(s, x, y);
}

function panel(ctx, x, y, w, h, fill, stroke) {
  rr(ctx, x, y, w, h, 12);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

/** One ingredient drawn as a little still life. */
export function drawIngredient(ctx, ingId, stage, cx, cy, size) {
  const g = ingredientById(ingId);
  if (!g) return;
  const s = size / 2;
  ctx.save();
  ctx.translate(cx, cy);
  if (stage === 'grilled') {
    ctx.rotate(0.12);
  }
  if (ingId === 'tomato') {
    ctx.fillStyle = stage === 'grilled' ? '#a82318' : g.color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.35, s * 0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f7a33';
    ctx.fillRect(-s * 0.08, -s * 1.05, s * 0.16, s * 0.35);
  } else if (ingId === 'onion') {
    ctx.fillStyle = stage === 'grilled' ? '#c9a86a' : g.color;
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#b39a6d';
    ctx.lineWidth = 2;
    for (let i = 1; i <= 2; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9 * (i / 3), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = '#7d5a33';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.9);
    ctx.lineTo(-s * 0.2, -s * 1.25);
    ctx.lineTo(s * 0.2, -s * 1.25);
    ctx.closePath();
    ctx.fill();
  } else if (ingId === 'mushroom') {
    ctx.fillStyle = '#efe0c0';
    rr(ctx, -s * 0.28, -s * 0.1, s * 0.56, s * 0.95, s * 0.2);
    ctx.fill();
    ctx.fillStyle = stage === 'grilled' ? '#8a5a28' : g.color;
    ctx.beginPath();
    ctx.arc(0, -s * 0.1, s * 0.95, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(-s * 0.35, -s * 0.55, s * 0.16, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.4, s * 0.12, 0, Math.PI * 2);
    ctx.fill();
  } else if (ingId === 'pepper') {
    ctx.fillStyle = stage === 'grilled' ? '#2a7a34' : g.color;
    rr(ctx, -s * 0.8, -s * 0.6, s * 1.6, s * 1.35, s * 0.5);
    ctx.fill();
    ctx.fillStyle = '#1f5c28';
    ctx.beginPath();
    ctx.arc(0, -s * 0.6, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    rr(ctx, -s * 0.55, -s * 0.35, s * 0.3, s * 0.8, s * 0.12);
    ctx.fill();
  } else if (ingId === 'cheese') {
    ctx.fillStyle = stage === 'grilled' ? '#d99a16' : g.color;
    ctx.beginPath();
    ctx.moveTo(-s * 0.9, s * 0.6);
    ctx.lineTo(s * 0.9, s * 0.6);
    ctx.lineTo(s * 0.9, -s * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = g.dark;
    ctx.beginPath();
    ctx.arc(-s * 0.3, s * 0.15, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.35, -s * 0.1, s * 0.12, 0, Math.PI * 2);
    ctx.arc(s * 0.05, s * 0.4, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  } else if (ingId === 'bread') {
    ctx.fillStyle = stage === 'grilled' ? '#8a5420' : g.color;
    rr(ctx, -s * 0.95, -s * 0.55, s * 1.9, s * 1.1, s * 0.55);
    ctx.fill();
    ctx.fillStyle = '#e0aa5e';
    rr(ctx, -s * 0.8, -s * 0.4, s * 1.6, s * 0.55, s * 0.25);
    ctx.fill();
    ctx.fillStyle = '#a8763a';
    ctx.beginPath();
    ctx.arc(-s * 0.4, -s * 0.15, s * 0.08, 0, Math.PI * 2);
    ctx.arc(s * 0.3, -s * 0.2, s * 0.08, 0, Math.PI * 2);
    ctx.fill();
  }
  if (stage === 'chopped') {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.5, -s * 0.4);
    ctx.lineTo(s * 0.5, s * 0.4);
    ctx.moveTo(s * 0.5, -s * 0.4);
    ctx.lineTo(-s * 0.5, s * 0.4);
    ctx.stroke();
  }
  if (stage === 'grilled') {
    ctx.strokeStyle = 'rgba(60,20,5,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.2);
    ctx.lineTo(s * 0.6, -s * 0.2);
    ctx.moveTo(-s * 0.6, s * 0.25);
    ctx.lineTo(s * 0.6, s * 0.25);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlame(ctx, x, y, size, t) {
  const wob = Math.sin(t * 6 + x) * size * 0.08;
  ctx.save();
  ctx.translate(x + wob, y);
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.quadraticCurveTo(size * 0.7, -size * 0.3, size * 0.35, size * 0.4);
  ctx.quadraticCurveTo(0, size * 0.7, -size * 0.35, size * 0.4);
  ctx.quadraticCurveTo(-size * 0.7, -size * 0.3, 0, -size);
  ctx.fill();
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath();
  ctx.moveTo(0, -size * 0.55);
  ctx.quadraticCurveTo(size * 0.4, -size * 0.1, size * 0.2, size * 0.35);
  ctx.quadraticCurveTo(0, size * 0.5, -size * 0.2, size * 0.35);
  ctx.quadraticCurveTo(-size * 0.4, -size * 0.1, 0, -size * 0.55);
  ctx.fill();
  ctx.restore();
}

function drawOrderTicket(ctx, order, rect, plate, t) {
  const recipe = recipeById(order.recipeId);
  const share = Math.max(0, order.patience / order.maxPatience);
  const urgent = share < 0.35;
  const bg = urgent ? '#4a1d12' : '#2e1c10';
  panel(ctx, rect.x, rect.y, rect.w, rect.h, bg, urgent ? '#ff6b4a' : '#5a3a1e');
  text(ctx, `#${order.id}  ${recipe.name}`, rect.x + 14, rect.y + 24, 19, '#ffd98a');
  text(ctx, recipe.blurb, rect.x + 14, rect.y + 46, 13, '#c9a886', 'left', 400);
  const hit = plateProgress(plate, recipe);
  recipe.needs.forEach((need, i) => {
    const y = rect.y + 72 + i * 20;
    const done = i < hit;
    ctx.fillStyle = done ? '#7ed491' : '#f3e3c8';
    ctx.font = '700 14px Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${done ? '✓' : '·'} ${needLabel(need)}`, rect.x + 14, y);
  });
  const barX = rect.x + 14;
  const barY = rect.y + rect.h - 18;
  const barW = rect.w - 28;
  ctx.fillStyle = '#17100b';
  rr(ctx, barX, barY, barW, 9, 4);
  ctx.fill();
  ctx.fillStyle = urgent ? '#ff6b4a' : share < 0.6 ? '#ffb347' : '#7ed491';
  if (share > 0) {
    rr(ctx, barX, barY, barW * share, 9, 4);
    ctx.fill();
  }
  text(ctx, `${Math.ceil(order.patience)}s`, rect.x + rect.w - 14, rect.y + 24, 15, urgent ? '#ff8a6b' : '#e8d3ae', 'right');
  text(ctx, `${recipe.price}c`, rect.x + rect.w - 14, rect.y + 46, 13, '#ffd98a', 'right');
  if (urgent && Math.sin(t * 8) > 0) {
    ctx.strokeStyle = 'rgba(255,107,74,0.9)';
    ctx.lineWidth = 3;
    rr(ctx, rect.x + 1, rect.y + 1, rect.w - 2, rect.h - 2, 12);
    ctx.stroke();
  }
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = '#1d110a';
  ctx.fillRect(0, 0, VIEW_W, 64);
  ctx.fillStyle = '#4a2f1d';
  ctx.fillRect(0, 63, VIEW_W, 1);
  text(ctx, '🔥 Ember & Thyme', 18, 32, 26, '#ffb347');
  const share = state.timeLeft / SHIFT_SECONDS;
  const barX = 420;
  const barW = 440;
  ctx.fillStyle = '#17100b';
  rr(ctx, barX, 22, barW, 20, 10);
  ctx.fill();
  ctx.fillStyle = share < 0.2 ? '#ff6b4a' : '#ffb347';
  if (share > 0) {
    rr(ctx, barX, 22, barW * share, 20, 10);
    ctx.fill();
  }
  const mins = Math.floor(state.timeLeft / 60);
  const secs = Math.floor(state.timeLeft % 60);
  text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, barX + barW / 2, 32, 17, '#fff3d6', 'center');
  text(ctx, `🪙 ${state.coins}`, 900, 32, 22, '#ffd98a');
  text(ctx, `Served ${state.served} · Lost ${state.lost}`, 990, 32, 15, '#e8d3ae');
  if (state.combo >= 2) {
    text(ctx, `Combo x${state.combo}`, 1262, 32, 17, '#ff9d5c', 'right');
  }
  if (state.timeLeft <= 30 && state.screen === 'play') {
    text(ctx, 'RUSH HOUR', 640, 56, 13, '#ff8a6b', 'center');
  }
}

function drawBins(ctx, state, t) {
  text(ctx, 'PANTRY — click a bin, or press 1–6', 16, 548, 14, '#c9a886', 'left', 400);
  for (const bin of LAYOUT.bins) {
    const g = ingredientById(bin.ing);
    const held = state.hand && state.hand.ing === bin.ing;
    panel(ctx, bin.x, bin.y, bin.w, bin.h, held ? '#4a2c14' : '#2e1c10', held ? '#ffb347' : '#5a3a1e');
    drawIngredient(ctx, bin.ing, 'raw', bin.x + bin.w / 2, bin.y + 46, 56);
    text(ctx, g.name, bin.x + bin.w / 2, bin.y + 94, 16, '#f3e3c8', 'center');
    text(ctx, `[${g.key}]`, bin.x + bin.w - 10, bin.y + 16, 12, '#c9a886', 'right', 400);
    if (held) {
      text(ctx, 'IN HAND', bin.x + bin.w / 2, bin.y + 112, 11, '#ffb347', 'center');
    }
  }
}

function drawStations(ctx, state, t) {
  // Chopping board
  const b = LAYOUT.board;
  panel(ctx, b.x, b.y, b.w, b.h, '#3a2412', '#6b4423');
  text(ctx, 'CHOPPING BOARD', b.x + b.w / 2, b.y + 20, 14, '#e8d3ae', 'center');
  ctx.fillStyle = '#8a5a28';
  rr(ctx, b.x + 22, b.y + 42, b.w - 44, 92, 8);
  ctx.fill();
  ctx.fillStyle = '#a8763a';
  rr(ctx, b.x + 22, b.y + 42, b.w - 44, 14, 8);
  ctx.fill();
  if (state.board) {
    drawIngredient(ctx, state.board.ing, state.board.stage, b.x + b.w / 2, b.y + 88, 64);
    if (state.board.stage === 'raw') {
      text(ctx, `chop ${state.board.chopsLeft} more`, b.x + b.w / 2, b.y + 148, 14, '#ffd98a', 'center');
    } else {
      text(ctx, 'chopped — click to pick up', b.x + b.w / 2, b.y + 148, 13, '#bfe8a8', 'center');
    }
  } else {
    text(ctx, 'click with an ingredient', b.x + b.w / 2, b.y + 88, 13, '#c9a886', 'center', 400);
    text(ctx, 'Space chops too', b.x + b.w / 2, b.y + 148, 12, '#8a6a45', 'center', 400);
  }

  // Hearth grill
  const gx = 600;
  panel(ctx, gx, 340, 280, 184, '#33200f', '#6b4423');
  text(ctx, 'HEARTH — click a slot to grill / take', gx + 140, 360, 14, '#e8d3ae', 'center');
  LAYOUT.grill.forEach((slot, i) => {
    const item = state.grill[i];
    ctx.fillStyle = '#1d110a';
    rr(ctx, slot.x + 4, slot.y + 30, slot.w - 8, 92, 8);
    ctx.fill();
    drawFlame(ctx, slot.x + slot.w / 2 - 18, slot.y + 118, 13, t + i);
    drawFlame(ctx, slot.x + slot.w / 2 + 18, slot.y + 118, 10, t + i * 2);
    if (item) {
      drawIngredient(ctx, item.ing, item.burnt ? 'grilled' : 'chopped', slot.x + slot.w / 2, slot.y + 72, 52);
      if (item.burnt) {
        text(ctx, 'BURNT — click to bin', slot.x + slot.w / 2, slot.y + 148, 12, '#ff8a6b', 'center');
      } else {
        const share = Math.min(1, item.cook / item.cookMax);
        ctx.fillStyle = '#17100b';
        rr(ctx, slot.x + 10, slot.y + 140, slot.w - 20, 8, 4);
        ctx.fill();
        ctx.fillStyle = share >= 1 ? '#7ed491' : '#ffb347';
        rr(ctx, slot.x + 10, slot.y + 140, (slot.w - 20) * share, 8, 4);
        ctx.fill();
        if (share >= 1) text(ctx, 'ready!', slot.x + slot.w / 2, slot.y + 164, 12, '#bfe8a8', 'center');
      }
    } else {
      text(ctx, 'empty grate', slot.x + slot.w / 2, slot.y + 72, 12, '#8a6a45', 'center', 400);
    }
  });

  // Plating counter
  const p = LAYOUT.plate;
  const ready = !!state.readyDish;
  panel(ctx, p.x, p.y, p.w, p.h, ready ? '#3d2a10' : '#2e1c10', ready ? '#ffd23e' : '#5a3a1e');
  text(ctx, 'PLATING COUNTER', p.x + p.w / 2, p.y + 20, 14, '#e8d3ae', 'center');
  ctx.fillStyle = '#efe6d2';
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + 96, 120, 44, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9b48a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y + 96, 120, 44, 0, 0, Math.PI * 2);
  ctx.stroke();
  state.plate.forEach((piece, i) => {
    const spread = state.plate.length > 1 ? (i - (state.plate.length - 1) / 2) * 62 : 0;
    drawIngredient(ctx, piece.ing, piece.stage, p.x + p.w / 2 + spread, p.y + 92, 52);
  });
  if (state.plate.length === 0) {
    text(ctx, 'stack the dish here', p.x + p.w / 2, p.y + 96, 13, '#a08c5f', 'center', 400);
  }
  if (ready) {
    text(ctx, '✓ DISH COMPLETE — serve it!', p.x + p.w / 2, p.y + 148, 15, '#ffd23e', 'center');
  } else if (state.plate.length > 0) {
    text(ctx, `${state.plate.length}/3 pieces on the plate`, p.x + p.w / 2, p.y + 148, 13, '#e8d3ae', 'center');
  }

  // Serving window
  const w = LAYOUT.window;
  panel(ctx, w.x, w.y, w.w, w.h, '#241610', ready ? '#ffd23e' : '#5a3a1e');
  ctx.fillStyle = '#0f0805';
  rr(ctx, w.x + 14, w.y + 34, w.w - 28, 110, 8);
  ctx.fill();
  text(ctx, 'SERVING WINDOW', w.x + w.w / 2, w.y + 20, 14, '#e8d3ae', 'center');
  if (ready) {
    const order = state.orders.find((o) => o.id === state.readyDish);
    text(ctx, '🔔', w.x + w.w / 2, w.y + 62, 34, '#ffd23e', 'center');
    text(ctx, order ? `for guest #${order.id} — click to serve` : 'click to serve', w.x + w.w / 2, w.y + 108, 15, '#ffd98a', 'center');
    text(ctx, 'or press S', w.x + w.w / 2, w.y + 130, 12, '#c9a886', 'center', 400);
  } else {
    text(ctx, '🔔', w.x + w.w / 2, w.y + 62, 30, '#8a6a45', 'center');
    text(ctx, 'guests wait beyond the pass', w.x + w.w / 2, w.y + 108, 14, '#c9a886', 'center', 400);
    text(ctx, 'a finished plate rings the bell', w.x + w.w / 2, w.y + 130, 12, '#8a6a45', 'center', 400);
  }
  text(ctx, `served ${state.served} · lost ${state.lost}`, w.x + w.w / 2, w.y + 168, 13, '#e8d3ae', 'center', 400);

  // Trash bin
  const tr = LAYOUT.trash;
  panel(ctx, tr.x, tr.y, tr.w, tr.h, '#2e1c10', '#5a3a1e');
  text(ctx, '🗑', tr.x + tr.w / 2, tr.y + 42, 30, '#c9a886', 'center');
  text(ctx, 'BIN [T]', tr.x + tr.w / 2, tr.y + 88, 12, '#c9a886', 'center');
}

function drawHand(ctx, state) {
  if (!state.hand || !state.mouse) return;
  const g = ingredientById(state.hand.ing);
  ctx.save();
  ctx.globalAlpha = 0.95;
  ctx.fillStyle = '#17100b';
  rr(ctx, state.mouse.x + 14, state.mouse.y - 34, 150, 30, 8);
  ctx.fill();
  ctx.strokeStyle = '#ffb347';
  ctx.lineWidth = 1.5;
  rr(ctx, state.mouse.x + 14, state.mouse.y - 34, 150, 30, 8);
  ctx.stroke();
  drawIngredient(ctx, state.hand.ing, state.hand.stage, state.mouse.x + 32, state.mouse.y - 19, 26);
  text(ctx, `${g.name} (${state.hand.stage})`, state.mouse.x + 50, state.mouse.y - 19, 13, '#ffd98a');
  ctx.restore();
}

function drawTitle(ctx, state, t) {
  ctx.fillStyle = 'rgba(15,8,5,0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  drawFlame(ctx, 300, 250, 46, t);
  drawFlame(ctx, 980, 250, 46, t + 1.5);
  text(ctx, '🔥', 640, 150, 64, '#ffb347', 'center');
  text(ctx, 'EMBER & THYME', 640, 235, 62, '#ffb347', 'center');
  text(ctx, 'a hearthside kitchen game', 640, 285, 24, '#e8d3ae', 'center', 400);
  text(ctx, 'Chop it. Grill it. Plate it. Serve it before the guest walks out.', 640, 330, 19, '#f3e3c8', 'center', 400);
  panel(ctx, 440, 380, 400, 64, '#3a2412', '#ffb347');
  text(ctx, '▶  CLICK OR PRESS ENTER TO START', 640, 412, 20, '#ffd98a', 'center');
  text(ctx, '150-second shift · 5 house recipes · the rush comes at the end', 640, 480, 15, '#c9a886', 'center', 400);
  text(ctx, 'Mouse + keyboard · 1–6 grab · Space chop · S serve · T bin · P pause', 640, 512, 14, '#8a6a45', 'center', 400);
  const demo = ['tomato', 'mushroom', 'cheese'];
  demo.forEach((ing, i) => drawIngredient(ctx, ing, i === 1 ? 'grilled' : 'raw', 560 + i * 80, 590, 56));
}

function drawGameOver(ctx, state) {
  ctx.fillStyle = 'rgba(15,8,5,0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  text(ctx, 'SHIFT OVER', 640, 190, 56, '#ffb347', 'center');
  text(ctx, `You served ${state.served} dishes and earned ${state.coins} coins`, 640, 260, 24, '#f3e3c8', 'center', 400);
  text(ctx, `Best combo x${state.bestCombo} · ${state.lost} guest${state.lost === 1 ? '' : 's'} walked out`, 640, 300, 18, '#e8d3ae', 'center', 400);
  const grade = state.served >= 14 ? '★★★' : state.served >= 10 ? '★★' : state.served >= 6 ? '★' : '☆';
  text(ctx, grade, 640, 360, 54, '#ffd23e', 'center');
  text(ctx, state.served >= 14 ? 'Three Ember Stars — a legendary shift!' : state.served >= 10 ? 'Two Ember Stars — the hearth sings!' : state.served >= 6 ? 'One Ember Star — a solid shift.' : 'The hearth kept burning — practice makes the cook.', 640, 420, 19, '#ffd98a', 'center', 400);
  panel(ctx, 440, 470, 400, 60, '#3a2412', '#ffb347');
  text(ctx, 'PRESS ENTER TO COOK AGAIN', 640, 500, 19, '#ffd98a', 'center');
}

export function draw(ctx, state, t) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  const glow = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  glow.addColorStop(0, '#2a1810');
  glow.addColorStop(0.6, '#241610');
  glow.addColorStop(1, '#1a0f09');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Brick hearth glow behind the grill.
  const hearthGlow = ctx.createRadialGradient(740, 440, 10, 740, 440, 260);
  hearthGlow.addColorStop(0, 'rgba(255,122,26,0.28)');
  hearthGlow.addColorStop(1, 'rgba(255,122,26,0)');
  ctx.fillStyle = hearthGlow;
  ctx.fillRect(440, 200, 600, 360);

  drawTopBar(ctx, state);
  if (state.screen !== 'title') {
    text(ctx, 'ORDER BOARD', 16, 76, 14, '#c9a886', 'left');
    state.orders.forEach((order, i) => {
      if (i < LAYOUT.orders.length) drawOrderTicket(ctx, order, LAYOUT.orders[i], state.plate, t);
    });
    for (let i = state.orders.length; i < LAYOUT.orders.length; i++) {
      panel(ctx, LAYOUT.orders[i].x, LAYOUT.orders[i].y, LAYOUT.orders[i].w, LAYOUT.orders[i].h, '#20140c', '#3a2412');
      text(ctx, 'no order yet', LAYOUT.orders[i].x + LAYOUT.orders[i].w / 2, LAYOUT.orders[i].y + 64, 14, '#8a6a45', 'center', 400);
    }
    drawStations(ctx, state, t);
    drawBins(ctx, state, t);
    drawHand(ctx, state);
  }
  if (state.message) {
    ctx.fillStyle = 'rgba(15,8,5,0.85)';
    const w = Math.min(720, 24 + state.message.length * 8.4);
    rr(ctx, (VIEW_W - w) / 2, 668, w, 34, 10);
    ctx.fill();
    text(ctx, state.message, VIEW_W / 2, 685, 15, '#ffd98a', 'center');
  }
  if (state.flash && state.flash.t > 0) {
    ctx.globalAlpha = Math.min(1, state.flash.t);
    text(ctx, state.flash.text, VIEW_W / 2, 130, 30, state.flash.color, 'center');
    ctx.globalAlpha = 1;
  }
  if (state.screen === 'title') drawTitle(ctx, state, t);
  if (state.screen === 'over') drawGameOver(ctx, state);
  if (state.paused && state.screen === 'play') {
    ctx.fillStyle = 'rgba(15,8,5,0.7)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    text(ctx, 'PAUSED — press P to keep cooking', 640, 360, 30, '#ffd98a', 'center');
  }
}
