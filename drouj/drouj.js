function setup() {
    createCanvas(windowWidth, windowHeight);
    pixelDensity(1);
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function draw() {
    background(211, 203, 127);

    push();

    const yShift = 0.17 * height;                 // SAME as in translate
    translate(width / 2, height / 2 - yShift);

    const s = min(width, height);

    // center circle
    const r = 0.075 * s;
    noStroke();
    fill(170, 210, 255);
    circle(0, 0, 2 * r);

    noFill();
    stroke(0);
    strokeWeight(max(0.8, 0.0012 * s)); // tiny, scales a bit with canvas
    circle(0, 0, 2 * r);

    // define local bounds (IN YOUR SHIFTED COORDINATE SYSTEM)
    const left   = -width / 2;
    const right  =  width / 2;
    const top    = -(height / 2 - yShift);
    const bottom =  (height / 2 + yShift);

    // sticks (thicker toward edge, and ALWAYS reach edge)
    const stickAnglesDeg = [70, 110, 165, 225, 300, 375]
        .map(d => ((d % 360) + 360) % 360)
        .sort((a,b) => a-b);
    const stickInner = r;

    stroke(0);

    for (const deg of stickAnglesDeg) {
        const a = radians(deg);
        const dx = cos(a);
        const dy = sin(a);

        let tEdge = Infinity;

        // hit left/right
        if (dx > 0) tEdge = min(tEdge, right / dx);
        else if (dx < 0) tEdge = min(tEdge, left / dx);

        // hit top/bottom
        if (dy > 0) tEdge = min(tEdge, bottom / dy);
        else if (dy < 0) tEdge = min(tEdge, top / dy);

        const x1 = dx * stickInner;
        const y1 = dy * stickInner;
        const x2 = dx * (tEdge + 2);
        const y2 = dy * (tEdge + 2);

        const segs = 80;
        for (let i = 0; i < segs; i++) {
            const u0 = i / segs;
            const u1 = (i + 1) / segs;

            const ax = lerp(x1, x2, u0);
            const ay = lerp(y1, y2, u0);
            const bx = lerp(x1, x2, u1);
            const by = lerp(y1, y2, u1);

            const w0 = max(2, 0.0025 * s);
            const w1 = max(6, 0.02 * s);
            strokeWeight(lerp(w0, w1, u0));

            line(ax, ay, bx, by);
        }
    }

    // ---- SECTORS (between sticks) ----


    const stickAngles = stickAnglesDeg.map(d => radians(d));

    // radius to cover the canvas
    const R = max(width, height) * 1.3;

    const cm = 0.020 * s;     // your “1 cm” scale
    







    







    // ---------------- LAMPS (fully controlled) ----------------
    rectMode(CENTER);
    noStroke();
    fill(255);

    // Each lamp is: { y: ..., w: ..., h: ... } in LOCAL coords (after translate)
    // Negative y = top, positive y = bottom

    const lampsTop = [
    { y: -(r * 3.8), w: 0.023 * s, h: 0.2 * s },
    { y: -(r * 2.2), w: 0.023 * s, h: 0.05 * s },
    { y: -(r * 1.5), w: 0.02 * s, h: 0.018 * s },
    { y: -(r * 1.11), w: 0.0125 * s, h: 0.016 * s },
    ];

    const lampsBottom = [
    { y:  (r * 1.18), w: 0.0125 * s, h: 0.026 * s },
    { y:  (r * 1.84), w: 0.02 * s, h: 0.035 * s },
    { y:  (r * 2.76), w: 0.023 * s, h: 0.06 * s },
    { y:  (r * 6.4), w: 0.025 * s, h: 0.45 * s },
    ];

    // draw them
    for (const L of lampsTop)    rect(0, L.y, L.w, L.h);
    for (const L of lampsBottom) rect(0, L.y, L.w, L.h);


    drawSectorArcBlocksSlanted3(stickAngles, 3, r, cm);
    drawSectorArcBlocksSlanted2(stickAngles, 2, r, cm);
    drawSectorArcBlocksSlanted0(stickAngles, 0, r, cm);
    drawSectorArcBlocksSlanted1(stickAngles, 1, r, cm);
    drawSectorArcBlocksSlanted4(stickAngles, 4, r, cm);
    drawSectorArcBlocksSlanted5(stickAngles, 5, r, cm);

  pop();
}

function drawWedge(a0, a1, rInner, rOuter) {
    const steps = 80;
    const d = angleDelta(a0, a1);

    beginShape();
    for (let k = 0; k <= steps; k++) {
        const t = k / steps;
        const a = a0 + d * t;
        vertex(cos(a) * rOuter, sin(a) * rOuter);
    }
    for (let k = steps; k >= 0; k--) {
        const t = k / steps;
        const a = a0 + d * t;
        vertex(cos(a) * rInner, sin(a) * rInner);
    }
    endShape(CLOSE);
}


function angleDelta(a0, a1) {
    // smallest positive CCW delta from a0 to a1 (0..TWO_PI)
    let d = (a1 - a0) % TWO_PI;
    if (d < 0) d += TWO_PI;
    return d;
}


function drawSlantedArc(rStart, rEnd, a0, a1, sw, steps = 180) {
    const d = angleDelta(a0, a1);   // CCW delta from stick1 -> stick2

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



function drawSectorArcBlocksSlanted3(stickAngles, sectorIndex, rCircle, cm) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  // ----- YOU CONTROL THESE -----

  // distance from previous block to next block (b1..b5)
  const blockGapsCm = [0.6, 2.3, 3.3, 6.7, 41.2];

  // inside each block: place 4 arcs (3 thin + 1 thick)
  const insideGapsCm = [
        [0.18, 0.12, 0.25, 0.5], // b1
        [0.18, 0.12, 0.25, 0.5], // b2
        [0, 0.12, 0.25, 0.5], // b3
        [1.8, 1.2, 2.1, 2.2], // b4
        [0.8, 0.12, 0.25, 0.5], // b5
        ];

  // slant per block: rEnd = rStart + rStart*slant (positive = BD bigger)
  // if you want the other direction (BD smaller), make them negative.
  const slantPct = [0.05, 0.07, 0.09, 0.3, 0.55];

  // thickness per block per arc: [ [arc1, arc2, arc3, arc4], ... ]
  // arc4 is your “thick” one by default, but you can change anything.
  const m = min(windowWidth, windowHeight);
  const TH = max(1, 0.002 * m); // base unit
  const thickness = [
    [0.12*TH, 1.5*TH, 1.8*TH,  3.0*TH],  // b1
    [1.2*TH, 1.6*TH, 2.0*TH,  4*TH],  // b2
    [1.3*TH, 1.7*TH, 2.2*TH, 6.0*TH],  // b3
    [1.4*TH, 1.9*TH, 5*TH, 17.0*TH],  // b4
    [1.6*TH, 2.2*TH, 3.0*TH, 13.0*TH],  // b5
  ];

  // --------------------------------

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < blockGapsCm.length; b++) {
    baseR += blockGapsCm[b] * cm;

    let rr = baseR;

    for (let i = 0; i < insideGapsCm.length; i++) {
      rr += insideGapsCm[b][i] * cm;

      const rStart = rr;
      const rEnd   = rr - rr * slantPct[b]; // BD > AC (slants outward)

      strokeWeight(thickness[b][i]);
      drawSlantedArc(rStart, rEnd, a0, a1, thickness[b][i], 220);
    }
  }
}



function drawSectorArcBlocksSlanted2(stickAngles, sectorIndex, rCircle, cm) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  // ----- YOU CONTROL THESE -----

  // distance from previous block to next block (b1..b5)
  const blockGapsCm = [0.9, 2.6, 2.1, 14.7, 85];

  // inside each block: place 4 arcs (3 thin + 1 thick)
    const insideGapsCm = [
        [0.18, 0.12, 0.25, 0.5], // b1
        [0.18, 0.12, 0.25, 0.5], // b2
        [0.2, 0.3, 0.8, 1], // b3
        [2.2, 1.8, 2.9, 3], // b4
        [0.8, 0.12, 0.25, 0.5], // b5
        ];

  // slant per block: rEnd = rStart + rStart*slant (positive = BD bigger)
  // if you want the other direction (BD smaller), make them negative.
  const slantPct = [0.05, 0.07, 0.09, 0.3, 0.55];

  // thickness per block per arc: [ [arc1, arc2, arc3, arc4], ... ]
  // arc4 is your “thick” one by default, but you can change anything.
  const m = min(windowWidth, windowHeight);
  const TH = max(1, 0.002 * m); // base unit
  const thickness = [
    [0.12*TH, 1.5*TH, 1.8*TH,  3.0*TH],  // b1
    [1.2*TH, 1.6*TH, 2.0*TH,  4*TH],  // b2
    [1.3*TH, 1.7*TH, 3*TH, 8.0*TH],  // b3
    [1.4*TH, 1.9*TH, 5*TH, 21.0*TH],  // b4
    [1.6*TH, 2.2*TH, 3.0*TH, 13.0*TH],  // b5
  ];

  // --------------------------------

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < blockGapsCm.length; b++) {
    baseR += blockGapsCm[b] * cm;

    let rr = baseR;

    for (let i = 0; i < insideGapsCm.length; i++) {
      rr += insideGapsCm[b][i] * cm;

      const rStart = rr;
      const rEnd   = rr - rr * slantPct[b]; // BD > AC (slants outward)

      strokeWeight(thickness[b][i]);
      drawSlantedArc(rStart, rEnd, a0, a1, thickness[b][i], 220);
    }
  }
}


function drawSectorArcBlocksSlanted0(stickAngles, sectorIndex, rCircle, cm) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  // ----- YOU CONTROL THESE -----

  // distance from previous block to next block (b1..b5)
  const blockGapsCm = [1.7, 3.2, 2.6, 20.6, 85];

  // inside each block: place 4 arcs (3 thin + 1 thick)
  const insideGapsCm = [
  [0.18, 0.12, 0.25, 0.5], // b1
  [0.18, 0.12, 0.25, 0.5], // b2
  [0, 0.4, 1.3, 1.5], // b3
  [3, 2, 4, 4], // b4
  [0.8, 0.12, 0.25, 0.5], // b5
];

  // slant per block: rEnd = rStart + rStart*slant (positive = BD bigger)
  // if you want the other direction (BD smaller), make them negative.
  const slantPct = [0.07, 0.09, 0.11, 0.21, 0.55];

  // thickness per block per arc: [ [arc1, arc2, arc3, arc4], ... ]
  // arc4 is your “thick” one by default, but you can change anything.
  const m = min(windowWidth, windowHeight);
  const TH = max(1, 0.002 * m); // base unit
  const thickness = [
    [0.12*TH, 1.5*TH, 1.8*TH,  3.0*TH],  // b1
    [1.2*TH, 1.6*TH, 2.0*TH,  4*TH],  // b2
    [1.3*TH, 1.7*TH, 4.5*TH, 12*TH],  // b3
    [1.4*TH, 1.9*TH, 5*TH, 27.0*TH],  // b4
    [1.6*TH, 2.2*TH, 3.0*TH, 13.0*TH],  // b5
  ];

  // --------------------------------

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < blockGapsCm.length; b++) {
    baseR += blockGapsCm[b] * cm;

    let rr = baseR;

    for (let i = 0; i < insideGapsCm.length; i++) {
      rr += insideGapsCm[b][i] * cm;

      const rStart = rr;
      const rEnd   = rr - rr * slantPct[b]; // BD > AC (slants outward)

      strokeWeight(thickness[b][i]);
      drawSlantedArc(rStart, rEnd, a0, a1, thickness[b][i], 220);
    }
  }
}

function drawSectorArcBlocksSlanted1(stickAngles, sectorIndex, rCircle, cm) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  // ----- YOU CONTROL THESE -----

  // distance from previous block to next block (b1..b5)
  const blockGapsCm = [1.2, 2.9, 2.4, 15.1, 85];

  // inside each block: place 4 arcs (3 thin + 1 thick)
    const insideGapsCm = [
    [0.18, 0.12, 0.25, 0.5], // b1
    [0.18, 0.12, 0.25, 0.5], // b2
    [0.2, 0.3, 0.8, 1.1], // b3
    [2.2, 1.8, 2.9, 3], // b4
    [0.8, 0.12, 0.25, 0.5], // b5
    ];

  // slant per block: rEnd = rStart + rStart*slant (positive = BD bigger)
  // if you want the other direction (BD smaller), make them negative.
  const slantPct = [0.05, 0.07, 0.09, 0.04, 0.55];

  // thickness per block per arc: [ [arc1, arc2, arc3, arc4], ... ]
  // arc4 is your “thick” one by default, but you can change anything.
  const m = min(windowWidth, windowHeight);
  const TH = max(1, 0.002 * m); // base unit
  const thickness = [
    [0.12*TH, 1.5*TH, 1.8*TH,  3.0*TH],  // b1
    [1.2*TH, 1.6*TH, 2.0*TH,  4*TH],  // b2
    [1.3*TH, 1.7*TH, 4*TH, 10.0*TH],  // b3
    [1.4*TH, 1.9*TH, 5*TH, 21.0*TH],  // b4
    [1.6*TH, 2.2*TH, 3.0*TH, 13.0*TH],  // b5
  ];

  // --------------------------------

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < blockGapsCm.length; b++) {
    baseR += blockGapsCm[b] * cm;

    let rr = baseR;

    for (let i = 0; i < insideGapsCm.length; i++) {
      rr += insideGapsCm[b][i] * cm;

      const rStart = rr;
      const rEnd   = rr - rr * slantPct[b]; // BD > AC (slants outward)

      strokeWeight(thickness[b][i]);
      drawSlantedArc(rStart, rEnd, a0, a1, thickness[b][i], 220);
    }
  }
}

function drawSectorArcBlocksSlanted4(stickAngles, sectorIndex, rCircle, cm) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  // ----- YOU CONTROL THESE -----

  // distance from previous block to next block (b1..b5)
  const blockGapsCm = [0.4, 2, 2.8, 3.2, 22];

  // inside each block: place 4 arcs (3 thin + 1 thick)
  const insideGapsCm = [
        [0.18, 0.12, 0.25, 0.5], // b1
        [0.18, 0.12, 0.25, 0.5], // b2
        [0.18, 0.12, 0.25, 0.5], // b3
        [0.7, 0.8, 1.6, 1.6], // b4
        [0.8, 0.12, 0.25, 0.5], // b5
        ];

  // slant per block: rEnd = rStart + rStart*slant (positive = BD bigger)
  // if you want the other direction (BD smaller), make them negative.
  const slantPct = [0.05, 0.07, 0.09, 0.17, 0.25];

  // thickness per block per arc: [ [arc1, arc2, arc3, arc4], ... ]
  // arc4 is your “thick” one by default, but you can change anything.
  const m = min(windowWidth, windowHeight);
  const TH = max(1, 0.002 * m); // base unit
  const thickness = [
    [0.12*TH, 1.5*TH, 1.8*TH,  3.0*TH],  // b1
    [1.2*TH, 1.6*TH, 2.0*TH,  4*TH],  // b2
    [1.3*TH, 1.7*TH, 2.2*TH, 5.0*TH],  // b3
    [1.4*TH, 1.9*TH, 4.5*TH, 15.0*TH],  // b4
    [1.6*TH, 2.2*TH, 3.0*TH, 28.0*TH],  // b5
  ];

  // --------------------------------

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < blockGapsCm.length; b++) {
    baseR += blockGapsCm[b] * cm;

    let rr = baseR;

    for (let i = 0; i < insideGapsCm.length; i++) {
      rr += insideGapsCm[b][i] * cm;

      const rStart = rr;
      const rEnd   = rr - rr * slantPct[b]; // BD > AC (slants outward)

      strokeWeight(thickness[b][i]);
      drawSlantedArc(rStart, rEnd, a0, a1, thickness[b][i], 220);
    }
  }
}


function drawSectorArcBlocksSlanted5(stickAngles, sectorIndex, rCircle, cm) {
  const a0 = stickAngles[sectorIndex];
  const a1 = stickAngles[(sectorIndex + 1) % stickAngles.length];

  // ----- YOU CONTROL THESE -----

  // distance from previous block to next block (b1..b5)
  const blockGapsCm = [0.2, 1.8, 2.4, 2.6, 11.4];

  // inside each block: place 4 arcs (3 thin + 1 thick)
    const insideGapsCm = [
    [0.18, 0.12, 0.25, 0.5], // b1
    [0.18, 0.12, 0.25, 0.5], // b2
    [0.18, 0.12, 0.25, 0.5], // b3
    [0.005, 0.6, 1.3, 1.3], // b4
    [7.2, 2, 3.2, 3.8], // b5
    ];

  // slant per block: rEnd = rStart + rStart*slant (positive = BD bigger)
  // if you want the other direction (BD smaller), make them negative.
  const slantPct = [-0.09, -0.03, 0.05, 0.03, 0.18];

  // thickness per block per arc: [ [arc1, arc2, arc3, arc4], ... ]
  // arc4 is your “thick” one by default, but you can change anything.
  const m = min(windowWidth, windowHeight);
  const TH = max(1, 0.002 * m); // base unit
  const thickness = [
    [0.12*TH, 1.2*TH, 1.5*TH,  3*TH],  // b1
    [1.2*TH, 1.6*TH, 2.0*TH,  4*TH],  // b2
    [1.3*TH, 1.7*TH, 2.2*TH, 5.0*TH],  // b3
    [1.4*TH, 1.9*TH, 5*TH, 14.0*TH],  // b4
    [1.6*TH, 2.2*TH, 3.0*TH, 30.0*TH],  // b5
  ];

  // --------------------------------

  noFill();
  stroke(0);
  strokeCap(SQUARE);

  let baseR = rCircle;

  for (let b = 0; b < blockGapsCm.length; b++) {
    baseR += blockGapsCm[b] * cm;

    let rr = baseR;

    for (let i = 0; i < insideGapsCm.length; i++) {
      rr += insideGapsCm[b][i] * cm;

      const rStart = rr;
      const rEnd   = rr + rr * slantPct[b]; // BD > AC (slants outward)

      strokeWeight(thickness[b][i]);
      drawSlantedArc(rStart, rEnd, a0, a1, thickness[b][i], 220);
    }
  }
}
