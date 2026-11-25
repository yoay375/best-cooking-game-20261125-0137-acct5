// Taco Truck Fiesta — every tuning number, colour and station position in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the window,
// so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** One festival shift lasts two and a half minutes. */
export const SHIFT_SECONDS = 150;
/** The last 30 seconds are rush hour: orders arrive faster and tips are bigger. */
export const RUSH_SECONDS = 30;

/** The cook walks along the floor in front of the counter. */
export const COOK = {
  startX: 640,
  walkY: 596,
  speed: 540,
  /** How close the cook must be to a station to work it. */
  reach: 92,
};

/** The grill: how long meat takes, how long it stays perfect, and when it burns. */
export const GRILL = {
  slots: 3,
  cookSeconds: 6,
  perfectSeconds: 5,
  /** Meat pulled off inside this window (after cookSeconds) is a perfect grill. */
  perfectWindowSeconds: 2.5,
};

/** A customer's patience, in seconds, and how fast it drains when served the wrong taco. */
export const PATIENCE = { start: 50, wrongOrderPenalty: 10 };

/** Coins for a taco, before the patience tip and the rush bonus. */
export const PRICES = {
  base: 8, maxTip: 6, rushBonus: 2, comboBonusEvery: 5, comboBonus: 10,
  /** Bonus for a taco whose meat came off the grill in the perfect window. */
  perfectBonus: 2,
  /** Bonus for serving while the customer's patience is still high. */
  speedyBonus: 3, speedyPatience: 0.75,
};

/** VIP customers: every Nth arrival is a festival VIP — pays double, waits less. */
export const VIP = { every: 5, patience: 30, payMultiplier: 2 };

/** Order flow: first customer arrives fast, then a new one on this schedule. */
export const ORDERS = {
  firstAt: 2,
  interval: 13,
  rushInterval: 7,
  maxQueue: 4,
};

/** The proteins the fridge holds, the shells, the salsas and the toppings. */
export const PROTEINS = ['beef', 'chicken', 'beans'];
export const SHELLS = ['soft', 'crunchy'];
export const SALSAS = ['mild', 'hot', 'verde'];
export const TOPPINGS = ['lettuce', 'cheese', 'jalapeno', 'lime'];

/** Station ids, in counter order from left to right. */
export const STATION_FRIDGE = 'fridge';
export const STATION_TORTILLA = 'tortilla';
export const STATION_GRILL = 'grill';
export const STATION_SALSA = 'salsa';
export const STATION_TOPPINGS = 'toppings';
export const STATION_PLATE = 'plate';
export const STATION_SERVE = 'serve';
export const STATION_TRASH = 'trash';

/**
 * Where each station sits. `rect` is its clickable box; `x` is where the cook stands
 * to work it; `sub` boxes are the clickable bins/slots/bowls inside it.
 */
export const STATIONS = {
  [STATION_FRIDGE]: {
    label: 'Fridge · protein',
    rect: { x: 316, y: 168, w: 150, h: 128 },
    x: 391,
    sub: [
      { id: 'beef', label: 'Beef', rect: { x: 326, y: 196, w: 42, h: 76 } },
      { id: 'chicken', label: 'Chicken', rect: { x: 374, y: 196, w: 42, h: 76 } },
      { id: 'beans', label: 'Beans', rect: { x: 422, y: 196, w: 42, h: 76 } },
    ],
  },
  [STATION_TORTILLA]: {
    label: 'Tortillas',
    rect: { x: 476, y: 168, w: 104, h: 128 },
    x: 528,
    sub: [
      { id: 'soft', label: 'Soft', rect: { x: 486, y: 196, w: 40, h: 76 } },
      { id: 'crunchy', label: 'Crunchy', rect: { x: 532, y: 196, w: 40, h: 76 } },
    ],
  },
  [STATION_GRILL]: {
    label: 'Grill',
    rect: { x: 590, y: 168, w: 190, h: 128 },
    x: 685,
    sub: [
      { id: '0', label: 'Slot 1', rect: { x: 600, y: 208, w: 54, h: 64 } },
      { id: '1', label: 'Slot 2', rect: { x: 662, y: 208, w: 54, h: 64 } },
      { id: '2', label: 'Slot 3', rect: { x: 724, y: 208, w: 54, h: 64 } },
    ],
  },
  [STATION_SALSA]: {
    label: 'Salsa bar',
    rect: { x: 790, y: 168, w: 150, h: 128 },
    x: 865,
    sub: [
      { id: 'mild', label: 'Mild', rect: { x: 800, y: 200, w: 42, h: 72 } },
      { id: 'hot', label: 'Hot', rect: { x: 848, y: 200, w: 42, h: 72 } },
      { id: 'verde', label: 'Verde', rect: { x: 896, y: 200, w: 42, h: 72 } },
    ],
  },
  [STATION_TOPPINGS]: {
    label: 'Toppings',
    rect: { x: 950, y: 168, w: 190, h: 128 },
    x: 1045,
    sub: [
      { id: 'lettuce', label: 'Lettuce', rect: { x: 960, y: 196, w: 42, h: 76 } },
      { id: 'cheese', label: 'Cheese', rect: { x: 1008, y: 196, w: 42, h: 76 } },
      { id: 'jalapeno', label: 'Jalapeño', rect: { x: 1056, y: 196, w: 42, h: 76 } },
      { id: 'lime', label: 'Lime', rect: { x: 1104, y: 196, w: 42, h: 76 } },
    ],
  },
  [STATION_PLATE]: {
    label: 'Assembly plate',
    rect: { x: 380, y: 372, w: 250, h: 150 },
    x: 505,
    sub: [],
  },
  [STATION_SERVE]: {
    label: 'Serve window',
    rect: { x: 650, y: 372, w: 250, h: 150 },
    x: 775,
    sub: [],
  },
  [STATION_TRASH]: {
    label: 'Trash',
    rect: { x: 920, y: 392, w: 90, h: 110 },
    x: 965,
    sub: [],
  },
};

/** The order board on the left: one ticket card per waiting customer. */
export const BOARD = { x: 16, y: 70, w: 284, h: 560, ticketH: 128, gap: 10 };

export const PALETTE = {
  sky: '#2b1a3e',
  skyLow: '#7a2e4d',
  awningA: '#e5484d',
  awningB: '#fff3d6',
  wall: '#3d2b52',
  counterTop: '#8a5a33',
  counterFront: '#6b4423',
  counterTrim: '#ffd166',
  floor: '#241a2e',
  walkway: '#4a3560',
  plate: '#f6f1e7',
  panel: '#241a2e',
  panelEdge: '#ffd166',
  text: '#fff8e7',
  muted: '#c9b8a3',
  coin: '#ffd166',
  good: '#7bd88a',
  bad: '#ff6b6b',
  warn: '#ffb347',
  grill: '#1d1d24',
  flame: '#ff9f1c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift score is kept between visits (this browser only). */
export const BEST_KEY = 'taco-truck-fiesta.best';
