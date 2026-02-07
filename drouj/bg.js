/* background.js */

APP.sectorBgColors = new Array(6);
APP.palette = { bright: APP.BG.slice(), dark: [107, 77, 1] };

APP.pickRandomPalette = function () {
  const p = APP.PALETTES[Math.floor(Math.random() * APP.PALETTES.length)];
  APP.palette = { bright: p.bright.slice(), dark: p.dark.slice() };

  
  APP.BG = APP.palette.bright.slice();
};

APP.initSectorBgColors = function () {
  const bright = color(...APP.palette.bright);
  const dark   = color(...APP.palette.dark);

  for (let i = 0; i < APP.SECTOR_BG_ORDER.length; i++) {
    const sectorIndex = APP.SECTOR_BG_ORDER[i];
    const t = i / (APP.SECTOR_BG_ORDER.length - 1);
    APP.sectorBgColors[sectorIndex] = lerpColor(bright, dark, t);
  }
};

APP.rotateSectorBgColors = function () {
  const old = APP.sectorBgColors.slice();
  for (let i = 0; i < 6; i++) {
    APP.sectorBgColors[i] = old[(i + 1) % 6];
  }
};

APP.drawSectorBackground = function (stickAngles, R) {
  noStroke();

  for (let i = 0; i < APP.SECTOR_BG_ORDER.length; i++) {
    const sectorIndex = APP.SECTOR_BG_ORDER[i];
    fill(APP.sectorBgColors[sectorIndex]);

    const a0 = stickAngles[sectorIndex];
    const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

    APP.drawWedgeFilled(a0, a1, R, 140);
  }
};

APP.drawWedgeFilled = function (a0, a1, rOuter, steps = 120) {
  const d = APP.angleDelta(a0, a1);

  beginShape();
  vertex(0, 0);
  for (let k = 0; k <= steps; k++) {
    const tt = k / steps;
    const a = a0 + d * tt;
    vertex(cos(a) * rOuter, sin(a) * rOuter);
  }
  endShape(CLOSE);
};
