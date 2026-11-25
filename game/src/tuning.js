// Smokehouse BBQ — all the numbers that tune the game, in one place.
//
// The pit runs on a fixed 1280x720 board. The painter scales that board to whatever
// window the game opens in, so nothing in here cares about the screen size.

export const BOARD_W = 1280;
export const BOARD_H = 720;

/** One simulation tick: the pit advances sixty times a second. */
export const TICK = 1 / 60;

/** A full shift at the smokehouse lasts two and a half minutes. */
export const SHIFT_LENGTH = 150;
/** The last half-minute is the dinner rush: guests arrive quicker, tips are fatter. */
export const RUSH_TAIL = 30;

/** The pitmaster walks the floor in front of the counter. */
export const PITMASTER = {
  startX: 640,
  floorY: 602,
  speed: 520,
  /** How close the pitmaster must stand before a station can be worked. */
  reach: 95,
};

/** The smoker: how long meat takes, how long it stays prime, when it turns to charcoal. */
export const SMOKER = {
  slots: 3,
  readyAt: 6,
  primeUntil: 11,
  /** Meat pulled in this window after readyAt is prime — worth a bonus. */
  primeWindow: 2.5,
};

/** A guest's patience, and what a wrong plate costs them. */
export const PATIENCE = { full: 55, wrongCost: 10 };

/** What a plate pays, before tip, rush extra and bonuses. */
export const PAY = {
  base: 10,
  tipMax: 8,
  rushBonus: 3,
  comboEvery: 5,
  comboBonus: 12,
  /** Extra for a plate whose meat came out of the smoker prime. */
  perfectBonus: 3,
  /** Extra for serving while the guest still has most of their patience. */
  speedyBonus: 4,
  speedyAt: 0.7,
};

/** Rush-order VIPs: every Nth guest is one — pays double, waits half as long. */
export const VIP = { every: 5, patience: 32, payMult: 2 };

/** Arrivals: the first guest shows up fast, then they come on this rhythm. */
export const ARRIVALS = {
  first: 2,
  gap: 14,
  rushGap: 8,
  maxWaiting: 4,
};

/** What the fridge stocks, the sauces on the bar, and the sides on the pass. */
export const MEATS = ['brisket', 'ribs', 'chicken'];
export const SAUCES = ['sweet', 'spicy', 'smoky'];
export const SIDES = ['slaw', 'beans', 'cornbread'];

/** Station ids, left to right along the counter. */
export const FRIDGE = 'fridge';
export const SMOKER_ST = 'smoker';
export const SAUCE_ST = 'sauce';
export const SIDES_ST = 'sides';
export const PLATE_ST = 'plate';
export const SERVE_ST = 'serve';
export const TRASH_ST = 'trash';

/**
 * Where every station sits. `box` is the clickable area, `x` is where the pitmaster
 * stands to work it, `bins` are the clickable trays, racks and bowls inside it.
 */
export const STATIONS = {
  [FRIDGE]: {
    label: 'Fridge · meat',
    box: { x: 316, y: 164, w: 138, h: 124 },
    x: 385,
    bins: [
      { id: 'brisket', label: 'Brisket', box: { x: 324, y: 192, w: 40, h: 72 } },
      { id: 'ribs', label: 'Ribs', box: { x: 370, y: 192, w: 40, h: 72 } },
      { id: 'chicken', label: 'Chicken', box: { x: 416, y: 192, w: 40, h: 72 } },
    ],
  },
  [SMOKER_ST]: {
    label: 'Smoker',
    box: { x: 464, y: 150, w: 220, h: 138 },
    x: 574,
    bins: [
      { id: '0', label: 'Rack 1', box: { x: 476, y: 204, w: 62, h: 62 } },
      { id: '1', label: 'Rack 2', box: { x: 544, y: 204, w: 62, h: 62 } },
      { id: '2', label: 'Rack 3', box: { x: 612, y: 204, w: 62, h: 62 } },
    ],
  },
  [SAUCE_ST]: {
    label: 'Sauce bar',
    box: { x: 694, y: 164, w: 140, h: 124 },
    x: 764,
    bins: [
      { id: 'sweet', label: 'Sweet', box: { x: 702, y: 196, w: 40, h: 68 } },
      { id: 'spicy', label: 'Spicy', box: { x: 748, y: 196, w: 40, h: 68 } },
      { id: 'smoky', label: 'Smoky', box: { x: 794, y: 196, w: 40, h: 68 } },
    ],
  },
  [SIDES_ST]: {
    label: 'Sides',
    box: { x: 844, y: 164, w: 196, h: 124 },
    x: 942,
    bins: [
      { id: 'slaw', label: 'Slaw', box: { x: 852, y: 192, w: 40, h: 72 } },
      { id: 'beans', label: 'Beans', box: { x: 900, y: 192, w: 40, h: 72 } },
      { id: 'cornbread', label: 'Corn', box: { x: 948, y: 192, w: 40, h: 72 } },
    ],
  },
  [PLATE_ST]: {
    label: 'Plating board',
    box: { x: 380, y: 368, w: 260, h: 150 },
    x: 510,
    bins: [],
  },
  [SERVE_ST]: {
    label: 'Serve hatch',
    box: { x: 660, y: 368, w: 260, h: 150 },
    x: 790,
    bins: [],
  },
  [TRASH_ST]: {
    label: 'Bin',
    box: { x: 940, y: 388, w: 80, h: 110 },
    x: 980,
    bins: [],
  },
};

/** The ticket rail on the left: one card per guest waiting. */
export const RAIL = { x: 16, y: 70, w: 284, h: 560, cardH: 128, gap: 10 };

export const COLORS = {
  night: '#1f1030',
  dusk: '#5c2438',
  ember: '#2e1a2e',
  stripeA: '#d94040',
  stripeB: '#ffe9c4',
  timber: '#4a2c1c',
  counterTop: '#9c6b3f',
  counterSide: '#6e4526',
  gold: '#ffc94d',
  floor: '#1c1226',
  lane: '#3d2c50',
  plate: '#f7f1e3',
  ink: '#fff8e7',
  dim: '#cbb79f',
  coin: '#ffc94d',
  good: '#7ed491',
  bad: '#ff6b6b',
  warn: '#ffb347',
  smoker: '#232028',
  flame: '#ff9f1c',
};

export const TYPEFACE = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best shift is saved between visits (this browser only). */
export const BEST_KEY = 'smokehouse-bbq.best';
