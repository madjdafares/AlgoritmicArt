/*
  25 tiles (5x5). Each tile contains a UNIQUE 4x4 normal magic square (1..16).
  Uniqueness enforced up to rotation + mirror (8 symmetries).
  One continuous animated line, serpentine tile order.
  Loop: draw forward to end, then erase backward to start, forever.

  Keys: R regen, G overlay, Space restart, P pause, +/- speed
*/

const TG = 5, O = 4, PT = O * O, MS = 34;
const BG = [16, 17, 19], LINE = [245, 245, 245];

let seed = 0, paused = false;
let durationSeconds = 15;

let frameBox, matrixBox, tileBoxes = [];
let samples = [], cum = [], totalLen = 0;
let travel = 0, dir = 1;

let baseSpeed = 0, speedFactor = 1, speed = 0;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(Math.min(2, window.devicePixelRatio || 1));
  textFont("monospace");
  seed = floor(random(1e9));
  rebuild();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuild();
}

function keyPressed() {
  const k = key;
  if (k === "r" || k === "R") { seed = floor(random(1e9)); rebuild(); }
  else if (k === "p" || k === "P") paused = !paused;
  else if (k === " ") { travel = 0; dir = 1; paused = false; }
  else if (k === "+" || k === "=") bumpSpeed(1.2);
  else if (k === "-" || k === "_") bumpSpeed(0.8);
}

function bumpSpeed(mult) {
  speedFactor = constrain(speedFactor * mult, 0.05, 25);
  speed = baseSpeed * speedFactor;
}

function draw() {
  background(...BG);
  drawFrame();
  drawTitle(); 

  const dt = deltaTime / 1000;

  if (!paused) {
    travel += dir * speed * dt;
    if (travel >= totalLen) { travel = totalLen; dir = -1; }
    else if (travel <= 0) { travel = 0; dir = 1; }
  }

  drawPath(travel, 10, 18, false);
  drawPath(travel, 2.8, 240, true);

  drawStatus();
}

/* ---------- layout + rebuild ---------- */

function rebuild() {
  randomSeed(seed);

  // Frame (thick, centered, scaled down to leave title space)
  const outer = Math.max(24, Math.min(width, height) * 0.08);
  const scale = 0.88;
  const frameSide = (Math.min(width, height) - 2 * outer) * scale;

  frameBox = {
    x: (width - frameSide) * 0.5,
    y: (height - frameSide) * 0.5,
    w: frameSide,
    h: frameSide,
    sw: Math.max(10, frameSide * 0.02)
  };

  // Artwork square inside frame
  const inner = Math.max(14, frameSide * 0.06);
  const side = frameSide - 2 * inner;
  matrixBox = { x: frameBox.x + inner, y: frameBox.y + inner, w: side, h: side };

  // Tiles, gap 
  const gap = -side * 0.02;     
  const ts = (side - (TG - 1) * gap) / TG;

  tileBoxes.length = 0;
  for (let r = 0; r < TG; r++) for (let c = 0; c < TG; c++) {
    tileBoxes.push({
      r, c,
      x: matrixBox.x + c * (ts + gap),
      y: matrixBox.y + r * (ts + gap),
      w: ts, h: ts
    });
  }

  const squares = make25UniqueNice(seed);

  // Build points in serpentine tile visit order
  const pts = [];
  for (let r = 0; r < TG; r++) {
    for (let t = 0; t < TG; t++) {
      const c = (r % 2 === 0) ? t : (TG - 1 - t);
      const idx = r * TG + c;
      pts.push(...centers1toN2(squares[idx], tileBoxes[idx], O));
    }
  }

  const cell = tileBoxes[0].w / O;
  const segs = cubicSegsWithBridges(pts, cell, 0.86, PT);

  ({ samples, cum, totalLen } = resample(segs));

  travel = 0; dir = 1;
  baseSpeed = totalLen / durationSeconds;
  speed = baseSpeed * speedFactor;
}

/* ---------- drawing ---------- */

function drawFrame() {
  push();
  noFill();
  stroke(255);
  strokeWeight(frameBox.sw);
  rect(frameBox.x, frameBox.y, frameBox.w, frameBox.h);
  pop();
}

function drawTitle() {
  push();
  noStroke();
  fill(245, 220);                
  textAlign(CENTER, TOP);

  // size scales with frame size
  textSize(Math.max(18, frameBox.w * 0.04));

  // place it under the frame
  const x = frameBox.x + frameBox.w * 0.5;
  const y = frameBox.y + frameBox.h + frameBox.sw * 0.8 + 10;

  text("ViDi", x, y);
  pop();
}


function drawPath(dist, w, a, head) {
  if (!samples.length) return;
  const d = constrain(dist, 0, totalLen);

  // binary search cum[] for index
  let lo = 0, hi = cum.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cum[mid] < d) lo = mid + 1; else hi = mid;
  }
  let idx = lo, cur;

  if (idx <= 0) { idx = 0; cur = samples[0].copy(); }
  else if (idx >= cum.length) { idx = cum.length - 1; cur = samples[idx].copy(); }
  else {
    const d0 = cum[idx - 1], d1 = cum[idx];
    const f = (d1 - d0) ? (d - d0) / (d1 - d0) : 0;
    cur = p5.Vector.lerp(samples[idx - 1], samples[idx], f);
  }

  push();
  stroke(LINE[0], LINE[1], LINE[2], a);
  strokeWeight(w);
  noFill();
  strokeCap(ROUND);
  strokeJoin(ROUND);

  beginShape();
  for (let i = 0; i < idx; i++) vertex(samples[i].x, samples[i].y);
  vertex(cur.x, cur.y);
  endShape();

  if (head) {
    noStroke();
    fill(LINE[0], LINE[1], LINE[2], 220);
    circle(cur.x, cur.y, 8);
  }
  pop();
}



function drawStatus() {
  const msg =
    `tiles:25  ORDER:${O}  duration:${durationSeconds}s  ` +
    `speedFactor:${speedFactor.toFixed(2)}  speed:${speed.toFixed(1)}px/s  ` +
    `${paused ? "[PAUSED] " : ""}(R,Space,P,+/-)`;

  push();
  noStroke();
  fill(140, 150);
  textSize(12);
  textAlign(LEFT, TOP);
  text(msg, 18, 18);
  pop();
}

/* ---------- magic squares: generate 25 unique ---------- */

function make25UniqueNice(s) {
  const rng = mulberry32(s ^ 0xA5F1C3);
  const seen = new Set();
  const pool = [];

  const poolN = 150, cap = 60000;
  let tries = 0;

  while (pool.length < poolN && tries++ < cap) {
    const sq = genMS4(rng);
    if (!sq) continue;
    const k = canonKey4(sq);
    if (seen.has(k)) continue;
    seen.add(k);
    pool.push({ sq, sc: scorePath4(sq) });
  }

  pool.sort((a, b) => a.sc - b.sc);
  const out = pool.slice(0, 25).map(o => o.sq);

  while (out.length < 25) {
    const sq = genMS4(rng);
    if (!sq) continue;
    const k = canonKey4(sq);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(sq);
  }
  return out;
}

function genMS4(rng) {
  const g = Array(16).fill(0), used = Array(17).fill(false);
  const rs = [0,0,0,0], cs = [0,0,0,0], rc = [0,0,0,0], cc = [0,0,0,0];
  const ds = [0,0], dc = [0,0];
  const ord = [0,5,10,15, 3,6,9,12, 1,2,4,7, 8,11,13,14];

  const ok = (v,r,c) => {
    if (used[v]) return false;
    if (rs[r] + v > MS || cs[c] + v > MS) return false;
    if (r === c && ds[0] + v > MS) return false;
    if (r + c === 3 && ds[1] + v > MS) return false;

    if (rc[r] === 3 && rs[r] + v !== MS) return false;
    if (cc[c] === 3 && cs[c] + v !== MS) return false;
    if (r === c && dc[0] === 3 && ds[0] + v !== MS) return false;
    if (r + c === 3 && dc[1] === 3 && ds[1] + v !== MS) return false;

    return true;
  };

  const place = (i,v) => {
    const r = (i / 4) | 0, c = i & 3;
    g[i] = v; used[v] = true;
    rs[r] += v; rc[r]++; cs[c] += v; cc[c]++;
    if (r === c) { ds[0] += v; dc[0]++; }
    if (r + c === 3) { ds[1] += v; dc[1]++; }
    return { r, c };
  };

  const unplace = (i,v) => {
    const r = (i / 4) | 0, c = i & 3;
    g[i] = 0; used[v] = false;
    rs[r] -= v; rc[r]--; cs[c] -= v; cc[c]--;
    if (r === c) { ds[0] -= v; dc[0]--; }
    if (r + c === 3) { ds[1] -= v; dc[1]--; }
  };

  const fwd = (r,c) => {
    if (rc[r] === 3) { const x = MS - rs[r]; if (x < 1 || x > 16 || used[x]) return false; }
    if (cc[c] === 3) { const x = MS - cs[c]; if (x < 1 || x > 16 || used[x]) return false; }
    if (r === c && dc[0] === 3) { const x = MS - ds[0]; if (x < 1 || x > 16 || used[x]) return false; }
    if (r + c === 3 && dc[1] === 3) { const x = MS - ds[1]; if (x < 1 || x > 16 || used[x]) return false; }
    return true;
  };

  function bt(k) {
    if (k === 16) return true;
    const i = ord[k], r = (i / 4) | 0, c = i & 3;

    // forced value if row/col/diag needs exact completion soon
    let req = null;
    const need = (cond, val) => {
      if (!cond) return true;
      if (req == null) req = val;
      else if (req !== val) return false;
      return true;
    };

    if (!need(rc[r] === 3, MS - rs[r])) return false;
    if (!need(cc[c] === 3, MS - cs[c])) return false;
    if (!need(r === c && dc[0] === 3, MS - ds[0])) return false;
    if (!need(r + c === 3 && dc[1] === 3, MS - ds[1])) return false;

    if (req != null) {
      if (req < 1 || req > 16 || used[req] || !ok(req,r,c)) return false;
      const p = place(i, req);
      const good = fwd(p.r, p.c) && bt(k + 1);
      if (good) return true;
      unplace(i, req);
      return false;
    }

    const cand = [];
    for (let v = 1; v <= 16; v++) if (!used[v]) cand.push(v);
    shuffleInPlace(cand, rng);

    for (const v of cand) {
      if (!ok(v,r,c)) continue;
      const p = place(i, v);
      if (fwd(p.r, p.c) && bt(k + 1)) return true;
      unplace(i, v);
    }
    return false;
  }

  if (!bt(0)) return null;

  const sq = [];
  for (let r = 0; r < 4; r++) sq.push(g.slice(r * 4, r * 4 + 4));
  return sq;
}

/* ---------- canonical key (8 symmetries) without building rotated squares ---------- */

function canonKey4(sq) {
  const v = (r,c) => sq[r][c];
  const maps = [
    (r,c)=>v(r,c),
    (r,c)=>v(3-c,r),
    (r,c)=>v(3-r,3-c),
    (r,c)=>v(c,3-r),
    (r,c)=>v(r,3-c),
    (r,c)=>v(c,r),
    (r,c)=>v(3-r,c),
    (r,c)=>v(3-c,3-r),
  ];

  let best = null;
  for (const f of maps) {
    let s = "";
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s += f(r,c) + ",";
    if (best == null || s < best) best = s;
  }
  return best;
}

/* ---------- aesthetic score ---------- */

function scorePath4(sq) {
  const pos = Array(17);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) pos[sq[r][c]] = { x:c, y:r };

  const P = [];
  for (let k = 1; k <= 16; k++) P.push(pos[k]);

  let dist = 0, longJ = 0, cross = 0;
  for (let i = 0; i < 15; i++) {
    const a = P[i], b = P[i+1];
    const d = Math.hypot(b.x-a.x, b.y-a.y);
    dist += d; if (d > 2.2) longJ++;
  }

  const inter = (a,b,c,d) => {
    const o = (p,q,r) => (q.x-p.x)*(r.y-p.y) - (q.y-p.y)*(r.x-p.x);
    const on = (p,q,r) =>
      Math.min(p.x,q.x) <= r.x && r.x <= Math.max(p.x,q.x) &&
      Math.min(p.y,q.y) <= r.y && r.y <= Math.max(p.y,q.y);

    if ((a.x===c.x && a.y===c.y) || (a.x===d.x && a.y===d.y) ||
        (b.x===c.x && b.y===c.y) || (b.x===d.x && b.y===d.y)) return false;

    const o1=o(a,b,c), o2=o(a,b,d), o3=o(c,d,a), o4=o(c,d,b);
    if (o1===0 && on(a,b,c)) return true;
    if (o2===0 && on(a,b,d)) return true;
    if (o3===0 && on(c,d,a)) return true;
    if (o4===0 && on(c,d,b)) return true;
    return (o1>0)!==(o2>0) && (o3>0)!==(o4>0);
  };

  for (let i = 0; i < 15; i++) for (let j = i + 2; j < 15; j++) {
    if (j === i + 1) continue;
    if (inter(P[i], P[i+1], P[j], P[j+1])) cross++;
  }

  return dist + 1.8*cross + 1.6*longJ;
}

/* ---------- points + curves ---------- */

function centers1toN2(sq, box, n) {
  const pos = Array(n*n+1);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) pos[sq[r][c]] = { r, c };
  const cell = box.w / n;
  const out = [];
  for (let k = 1; k <= n*n; k++) {
    const { r, c } = pos[k];
    out.push(createVector(box.x + (c+0.5)*cell, box.y + (r+0.5)*cell));
  }
  return out;
}

function cubicSegsWithBridges(pts, cell, round, chunk) {
  const segs = [];
  const base = cell * (0.14 + 0.38*round);

  const boundary = i => (i % chunk === 0) || (i % chunk === chunk-1);
  const bridge = i => ((i+1) % chunk === 0) && (i < pts.length-1);

  const T = pts.map((p,i) => {
    if (boundary(i)) return createVector(0,0);
    return p5.Vector.sub(pts[i+1], pts[i-1]).mult(0.5);
  });

  for (let i = 0; i < pts.length-1; i++) {
    const A = pts[i].copy(), B = pts[i+1].copy();

    if (bridge(i)) {
      segs.push({ A, C1:p5.Vector.lerp(A,B,1/3), C2:p5.Vector.lerp(A,B,2/3), B });
      continue;
    }

    const len = p5.Vector.dist(A,B);
    const h = Math.min(base, len*0.45);
    const tA = T[i].copy(), tB = T[i+1].copy();
    if (tA.mag()>0) tA.setMag(h);
    if (tB.mag()>0) tB.setMag(h);

    let C1 = p5.Vector.add(A,tA);
    let C2 = p5.Vector.sub(B,tB);

    const dir = p5.Vector.sub(B,A);
    let nrm = createVector(-dir.y, dir.x);
    if (nrm.mag()>0) nrm.normalize();


    segs.push({ A, C1, C2, B });
  }
  return segs;
}

function bez(A,C1,C2,B,t) {
  const u = 1-t, u2=u*u, u3=u2*u, t2=t*t, t3=t2*t;
  return createVector(
    u3*A.x + 3*u2*t*C1.x + 3*u*t2*C2.x + t3*B.x,
    u3*A.y + 3*u2*t*C1.y + 3*u*t2*C2.y + t3*B.y
  );
}

function resample(segs) {
  const S = [segs[0].A.copy()], C = [0];
  let L = 0;

  for (let i = 0; i < segs.length; i++) {
    const { A, C1, C2, B } = segs[i];
    const steps = Math.max(16, (p5.Vector.dist(A,B)/12) | 0);

    for (let s = 1; s <= steps; s++) {
      const p = bez(A,C1,C2,B, s/steps);
      L += p5.Vector.dist(S[S.length-1], p);
      S.push(p); C.push(L);
    }
  }
  return { samples:S, cum:C, totalLen:L };
}

/* ---------- utils ---------- */

function shuffleInPlace(a, rng) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = (rng() * (i + 1)) | 0;
    [a[i], a[j]] = [a[j], a[i]];
  }
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
