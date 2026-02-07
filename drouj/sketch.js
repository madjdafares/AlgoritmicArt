/*  p5.js sketch
    Clean + organized + same output logic, ready to run,
    with generative rotating sector background colors.
*/

const BG = [217, 226, 184];
const CENTER_FILL = [172, 225, 238];

const Y_SHIFT_RATIO = 0.17;
const CENTER_R_RATIO = 0.075;
const CM_RATIO = 0.020;

// Stick angles are constant
const STICK_ANGLES_DEG = [70, 110, 165, 225, 300, 375]
  .map(d => ((d % 360) + 360) % 360)
  .sort((a, b) => a - b);

const STICK_ANGLES_RAD = STICK_ANGLES_DEG.map(d => (d * Math.PI) / 180);

// Keep the same layering order you had
const SECTOR_DRAW_ORDER = [3, 2, 0, 1, 4, 5];

// Background gradient assignment order
const SECTOR_BG_ORDER = [4, 3, 2, 1, 0, 5];

// ---- Generative background rotation ----
let sectorBgColors = new Array(6);
const SHIFT_EVERY = 16; // frames, tweak speed here

// Sector configs (same algorithm, different numbers)
const SECTORS = {
  0: {
    blockGapsCm: [1.7, 3.2, 2.6, 20.6, 85],
    insideGapsCm: [
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0, 0.4, 1.3, 1.5],
      [3, 2, 4, 4],
      [0.8, 0.12, 0.25, 0.5],
    ],
    slantPct: [0.07, 0.09, 0.11, 0.21, 0.55],
    slantSign: -1,
    thicknessFactors: [
      [0.12, 1.5, 1.8, 3.0],
      [1.2, 1.6, 2.0, 4.0],
      [1.3, 1.7, 4.5, 12.0],
      [1.4, 1.9, 5.0, 27.0],
      [1.6, 2.2, 3.0, 13.0],
    ],
  },

  1: {
    blockGapsCm: [1.2, 2.9, 2.4, 15.1, 85],
    insideGapsCm: [
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0.2, 0.3, 0.8, 1.1],
      [2.2, 1.8, 2.9, 3],
      [0.8, 0.12, 0.25, 0.5],
    ],
    slantPct: [0.05, 0.07, 0.09, 0.04, 0.55],
    slantSign: -1,
    thicknessFactors: [
      [0.12, 1.5, 1.8, 3.0],
      [1.2, 1.6, 2.0, 4.0],
      [1.3, 1.7, 4.0, 10.0],
      [1.4, 1.9, 5.0, 21.0],
      [1.6, 2.2, 3.0, 13.0],
    ],
  },

  2: {
    blockGapsCm: [0.9, 2.6, 2.1, 14.7, 85],
    insideGapsCm: [
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0.2, 0.3, 0.8, 1],
      [2.2, 1.8, 2.9, 3],
      [0.8, 0.12, 0.25, 0.5],
    ],
    slantPct: [0.05, 0.07, 0.09, 0.3, 0.55],
    slantSign: -1,
    thicknessFactors: [
      [0.12, 1.5, 1.8, 3.0],
      [1.2, 1.6, 2.0, 4.0],
      [1.3, 1.7, 3.0, 8.0],
      [1.4, 1.9, 5.0, 21.0],
      [1.6, 2.2, 3.0, 13.0],
    ],
  },

  3: {
    blockGapsCm: [0.6, 2.3, 3.3, 6.7, 41.2],
    insideGapsCm: [
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0, 0.12, 0.25, 0.5],
      [1.8, 1.2, 2.1, 2.2],
      [0.8, 0.12, 0.25, 0.5],
    ],
    slantPct: [0.05, 0.07, 0.09, 0.3, 0.55],
    slantSign: -1,
    thicknessFactors: [
      [0.12, 1.5, 1.8, 3.0],
      [1.2, 1.6, 2.0, 4.0],
      [1.3, 1.7, 2.2, 6.0],
      [1.4, 1.9, 5.0, 17.0],
      [1.6, 2.2, 3.0, 13.0],
    ],
  },

  4: {
    blockGapsCm: [0.4, 2, 2.8, 3.2, 22],
    insideGapsCm: [
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0.7, 0.8, 1.6, 1.6],
      [0.8, 0.12, 0.25, 0.5],
    ],
    slantPct: [0.05, 0.07, 0.09, 0.17, 0.25],
    slantSign: -1,
    thicknessFactors: [
      [0.12, 1.5, 1.8, 3.0],
      [1.2, 1.6, 2.0, 4.0],
      [1.3, 1.7, 2.2, 5.0],
      [1.4, 1.9, 4.5, 15.0],
      [1.6, 2.2, 3.0, 28.0],
    ],
  },

  5: {
    blockGapsCm: [0.2, 1.8, 2.4, 2.6, 11.4],
    insideGapsCm: [
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0.18, 0.12, 0.25, 0.5],
      [0.005, 0.6, 1.3, 1.3],
      [7.2, 2, 3.2, 3.8],
    ],
    slantPct: [-0.09, -0.03, 0.05, 0.03, 0.18],
    slantSign: +1, // keep your original behavior for this sector
    thicknessFactors: [
      [0.12, 1.2, 1.5, 3.0],
      [1.2, 1.6, 2.0, 4.0],
      [1.3, 1.7, 2.2, 5.0],
      [1.4, 1.9, 5.0, 14.0],
      [1.6, 2.2, 3.0, 30.0],
    ],
  },
};

// ----------------- P5 LIFECYCLE -----------------

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  initSectorBgColors();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(...BG);

  push();

  const yShift = Y_SHIFT_RATIO * height;
  translate(width / 2, height / 2 - yShift);

  const s = min(width, height);
  const r = CENTER_R_RATIO * s;

  const cm = CM_RATIO * s;
  const TH = max(1, 0.002 * s);

  // Big radius so wedges cover the whole canvas
  const R = max(width, height) * 1.6;

  // rotate background colors over time
  if (frameCount % SHIFT_EVERY === 0) rotateSectorBgColors();

  // Sector background (behind everything)
  drawSectorBackgroundGradient(STICK_ANGLES_RAD, R);

  drawCenterCircle(r, s);

  const bounds = getLocalBounds(yShift);
  drawSticks(STICK_ANGLES_RAD, r, s, bounds);

  drawLamps(r, s);

  for (const idx of SECTOR_DRAW_ORDER) {
    drawSectorArcBlocksSlanted(STICK_ANGLES_RAD, idx, r, cm, TH, SECTORS[idx]);
  }

  pop();
}

// ----------------- BACKGROUND WEDGES -----------------

function initSectorBgColors() {
  const bright = color(217, 226, 184);
  const dark   = color(107, 77, 1);

  // initial gradient assignment along order: 4 -> 3 -> 2 -> 1 -> 0 -> 5
  for (let i = 0; i < SECTOR_BG_ORDER.length; i++) {
    const sectorIndex = SECTOR_BG_ORDER[i];
    const t = i / (SECTOR_BG_ORDER.length - 1);
    sectorBgColors[sectorIndex] = lerpColor(bright, dark, t);
  }
}

// sector 4 takes color of 5, 5 takes color of 0, 0 takes color of 1, etc...
function rotateSectorBgColors() {
  const old = sectorBgColors.slice();
  for (let i = 0; i < 6; i++) {
    sectorBgColors[i] = old[(i + 1) % 6];
  }
}

function drawSectorBackgroundGradient(stickAngles, R) {
  noStroke();

  for (let i = 0; i < SECTOR_BG_ORDER.length; i++) {
    const sectorIndex = SECTOR_BG_ORDER[i];
    fill(sectorBgColors[sectorIndex]);

    const a0 = stickAngles[sectorIndex];
    const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

    drawWedgeFilled(a0, a1, R, 140);
  }
}

function drawWedgeFilled(a0, a1, rOuter, steps = 120) {
  const d = angleDelta(a0, a1);

  beginShape();
  vertex(0, 0);
  for (let k = 0; k <= steps; k++) {
    const tt = k / steps;
    const a = a0 + d * tt;
    vertex(cos(a) * rOuter, sin(a) * rOuter);
  }
  endShape(CLOSE);
}

// ----------------- DRAW HELPERS -----------------

function drawCenterCircle(r, s) {
  noStroke();
  fill(...CENTER_FILL);
  circle(0, 0, 2 * r);

  noFill();
  stroke(0);
  strokeWeight(max(0.8, 0.0012 * s));
  circle(0, 0, 2 * r);
}

function getLocalBounds(yShift) {
  return {
    left: -width / 2,
    right: width / 2,
    top: -(height / 2 - yShift),
    bottom: height / 2 + yShift,
  };
}

function rayToEdgeT(dx, dy, b) {
  let tEdge = Infinity;

  if (dx > 0) tEdge = min(tEdge, b.right / dx);
  else if (dx < 0) tEdge = min(tEdge, b.left / dx);

  if (dy > 0) tEdge = min(tEdge, b.bottom / dy);
  else if (dy < 0) tEdge = min(tEdge, b.top / dy);

  return tEdge;
}

function drawSticks(anglesRad, r, s, bounds) {
  stroke(0);

  const stickInner = r;
  const segs = 80;

  for (const a of anglesRad) {
    const dx = cos(a);
    const dy = sin(a);

    const tEdge = rayToEdgeT(dx, dy, bounds);

    const x1 = dx * stickInner;
    const y1 = dy * stickInner;
    const x2 = dx * (tEdge + 2);
    const y2 = dy * (tEdge + 2);

    const w0 = max(2, 0.0025 * s);
    const w1 = max(6, 0.02 * s);

    for (let i = 0; i < segs; i++) {
      const u0 = i / segs;
      const u1 = (i + 1) / segs;

      const ax = lerp(x1, x2, u0);
      const ay = lerp(y1, y2, u0);
      const bx = lerp(x1, x2, u1);
      const by = lerp(y1, y2, u1);

      strokeWeight(lerp(w0, w1, u0));
      line(ax, ay, bx, by);
    }
  }
}

function drawLamps(r, s) {
  rectMode(CENTER);
  noStroke();
  fill(247, 255, 247);

  const lampsTop = [
    { y: -(r * 3.8), w: 0.023 * s, h: 0.2 * s },
    { y: -(r * 2.2), w: 0.023 * s, h: 0.05 * s },
    { y: -(r * 1.5), w: 0.02 * s, h: 0.018 * s },
    { y: -(r * 1.11), w: 0.0125 * s, h: 0.016 * s },
  ];

  const lampsBottom = [
    { y: r * 1.18, w: 0.0125 * s, h: 0.026 * s },
    { y: r * 1.84, w: 0.02 * s, h: 0.035 * s },
    { y: r * 2.76, w: 0.023 * s, h: 0.06 * s },
    { y: r * 6.4, w: 0.025 * s, h: 0.45 * s },
  ];

  for (const L of lampsTop) rect(0, L.y, L.w, L.h);
  for (const L of lampsBottom) rect(0, L.y, L.w, L.h);
}

// ----------------- ARC / SECTOR CORE -----------------

function angleDelta(a0, a1) {
  let d = (a1 - a0) % TWO_PI;
  if (d < 0) d += TWO_PI;
  return d;
}

function drawSlantedArc(rStart, rEnd, a0, a1, sw, steps = 180) {
  const d = angleDelta(a0, a1);

  strokeWeight(sw);
  for (let k = 0; k < steps; k++) {
    const t0 = k / steps;
    const t1 = (k + 1) / steps;

    const ang0 = a0 + d * t0;
    const ang1 = a0 + d * t1;

    const rr0 = lerp(rStart, rEnd, t0);
    const rr1 = lerp(rStart, rEnd, t1);

    line(
      cos(ang0) * rr0, sin(ang0) * rr0,
      cos(ang1) * rr1, sin(ang1) * rr1
    );
  }
}

function drawSectorArcBlocksSlanted(stickAngles, sectorIndex, rCircle, cm, TH, cfg) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < cfg.blockGapsCm.length; b++) {
    baseR += cfg.blockGapsCm[b] * cm;

    let rr = baseR;
    const inside = cfg.insideGapsCm[b];
    const thickFactors = cfg.thicknessFactors[b];

    for (let i = 0; i < inside.length; i++) {
      rr += inside[i] * cm;

      const rStart = rr;
      const rEnd = rr + (rr * cfg.slantPct[b] * cfg.slantSign);

      const sw = thickFactors[i] * TH;
      drawSlantedArc(rStart, rEnd, a0, a1, sw, 220);
    }
  }
}
