/* render.js */

APP.drawCenterCircle = function (r, s) {
  noStroke();
  fill(...APP.CENTER_FILL);
  circle(0, 0, 2 * r);

  noFill();
  stroke(0);
  strokeWeight(max(0.8, 0.0012 * s));
  circle(0, 0, 2 * r);
};

APP.getLocalBounds = function (yShift) {
  return {
    left: -width / 2,
    right: width / 2,
    top: -(height / 2 - yShift),
    bottom: height / 2 + yShift,
  };
};

APP.rayToEdgeT = function (dx, dy, b) {
  let tEdge = Infinity;

  if (dx > 0) tEdge = min(tEdge, b.right / dx);
  else if (dx < 0) tEdge = min(tEdge, b.left / dx);

  if (dy > 0) tEdge = min(tEdge, b.bottom / dy);
  else if (dy < 0) tEdge = min(tEdge, b.top / dy);

  return tEdge;
};

APP.drawSticks = function (anglesRad, r, s, bounds) {
  stroke(0);

  const stickInner = r;
  const segs = 80;

  for (const a of anglesRad) {
    const dx = cos(a);
    const dy = sin(a);

    const tEdge = APP.rayToEdgeT(dx, dy, bounds);

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
};

APP.drawLamps = function (r, s) {
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
};

APP.angleDelta = function (a0, a1) {
  let d = (a1 - a0) % TWO_PI;
  if (d < 0) d += TWO_PI;
  return d;
};

APP.drawSlantedArc = function (rStart, rEnd, a0, a1, sw, steps = 180) {
  const d = APP.angleDelta(a0, a1);

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
};

APP.drawSectorArcBlocksSlanted = function (stickAngles, sectorIndex, rCircle, cm, TH, cfg) {
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
      APP.drawSlantedArc(rStart, rEnd, a0, a1, sw, 220);
    }
  }
};
