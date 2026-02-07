/* sketch.js */

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  // random speed \
  APP.SHIFT_EVERY = Math.floor(1 + Math.random() * 35);

  // random palette
  APP.pickRandomPalette();

  // init sector colors once
  APP.initSectorBgColors();

  // optional debug
  console.log("SHIFT_EVERY =", APP.SHIFT_EVERY, "palette =", APP.palette);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(...APP.BG);

  push();

  const yShift = APP.Y_SHIFT_RATIO * height;
  translate(width / 2, height / 2 - yShift);

  const s = min(width, height);
  const r = APP.CENTER_R_RATIO * s;

  const cm = APP.CM_RATIO * s;
  const TH = max(1, 0.002 * s);

  const R = max(width, height) * 1.6;

  if (frameCount % APP.SHIFT_EVERY === 0) APP.rotateSectorBgColors();

  APP.drawSectorBackground(APP.STICK_ANGLES_RAD, R);

  APP.drawCenterCircle(r, s);

  const bounds = APP.getLocalBounds(yShift);
  APP.drawSticks(APP.STICK_ANGLES_RAD, r, s, bounds);

  APP.drawLamps(r, s);

  for (const idx of APP.SECTOR_DRAW_ORDER) {
    APP.drawSectorArcBlocksSlanted(APP.STICK_ANGLES_RAD, idx, r, cm, TH, APP.SECTORS[idx]);
  }

  pop();
}
