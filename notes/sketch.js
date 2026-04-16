/**
 * Horizontal "music roll" text scroll (ping-pong) + sound
 * - Keeps each CSV row as one text line, rotated like your screenshot
 * - Scrolls from row 1 -> end -> back to row 1
 * - Adds notes: pitch + duration depend on the value magnitude
 *
 * Controls:
 *   Click: enable audio
 *   Space: pause/resume
 *   Mouse wheel: speed up/down
 *   R: restart from row 1
 *   M: mute/unmute
 */

let table;
let rows = [];

let xOffset = 0;
let dir = 1;
let paused = false;

let speed = 260;        // px/sec
let textSz = 16;
let colStep = 26;
let bottomMargin = 18;

const COLS = ["real_seconds", "user_seconds", "sys_seconds", "cpu_seconds"];

// ---- visuals ----
let colColors;

// ---- sound ----
let audioReady = false;
let muted = false;
let voices = [];          // { osc, env }
let ranges = {};          // per col: { lo, hi } in log space
let lastPlayIndex = -1;   // last row index that triggered sound
let lastSoundAt = 0;      // ms

function preload() {
  table = loadTable("poutine_times.csv", "csv", "header");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);

  textFont("monospace");
  textSize(textSz);
  textAlign(LEFT, CENTER);

  colColors = [
    color(110, 180, 255),  // real
    color(240, 220, 140),  // user
    color(120, 220, 160),  // sys
    color(255, 160, 110),  // cpu
  ];

  // store raw strings so the file stays visually "as is"
  const n = table.getRowCount();
  for (let i = 0; i < n; i++) {
    const file = table.getString(i, "file");
    const vals = COLS.map(c => table.getString(i, c));
    rows.push({ file, vals });
  }

  computeRanges();
}

function draw() {
  background(18);

  if (rows.length === 0) {
    fill(220);
    text("CSV is empty or not loaded.", 20, 30);
    return;
  }

  const totalW = rows.length * colStep;
  const maxOffset = max(0, totalW - width);

  // update scroll (ping-pong)
  if (!paused && maxOffset > 0) {
    xOffset += dir * speed * (deltaTime / 1000);

    if (xOffset >= maxOffset) { xOffset = maxOffset; dir = -1; }
    if (xOffset <= 0)        { xOffset = 0;        dir =  1; }
  }

  // draw only visible columns
  const first = max(0, floor(xOffset / colStep) - 2);
  const last  = min(rows.length - 1, first + ceil(width / colStep) + 4);

  for (let i = first; i <= last; i++) {
    const x = i * colStep - xOffset;
    drawRowAsVerticalColumn(rows[i], x);
  }

  // trigger sound when playhead crosses a new row
  soundTick(maxOffset);

  drawHUD(maxOffset);
}

function drawRowAsVerticalColumn(row, x) {
  push();
  translate(x, height - bottomMargin);
  rotate(-HALF_PI);

  let cursor = 0;

  fill(220);
  text(row.file, cursor, 0);
  cursor += textWidth(row.file);

  for (let k = 0; k < row.vals.length; k++) {
    const seg = ", " + row.vals[k];
    fill(colColors[k]);
    text(seg, cursor, 0);
    cursor += textWidth(seg);
  }

  pop();
}

/* -------------------- SOUND -------------------- */

function mousePressed() {
  initAudioIfNeeded();
}

function initAudioIfNeeded() {
  if (audioReady) return;
  userStartAudio();

    // set overall volume (works even if masterVolume isn't exposed globally)
    if (typeof masterVolume === "function") {
    masterVolume(0.22);
    } else if (typeof outputVolume === "function") {
    outputVolume(0.22);
    } else if (window.p5 && p5.soundOut && p5.soundOut.output && p5.soundOut.output.gain) {
    p5.soundOut.output.gain.value = 0.22;
    }

  const types = ["sine", "triangle", "square", "sawtooth"];
  for (let k = 0; k < COLS.length; k++) {
    const osc = new p5.Oscillator(types[k]);
    osc.start();
    osc.amp(0);

    const env = new p5.Envelope();
    // percussive by default, we will tweak per note
    env.setADSR(0.005, 0.06, 0.0, 0.08);
    env.setRange(0.25, 0);

    voices.push({ osc, env });
  }

  audioReady = true;
}

function soundTick(maxOffset) {
  if (!audioReady || muted || paused) return;
  if (rows.length === 0) return;

  // pick a playhead x position on screen, like a "listener point"
  const playX = width * 0.18;
  let i = floor((xOffset + playX) / colStep);
  i = constrain(i, 0, rows.length - 1);

  if (i === lastPlayIndex) return;

  // tiny throttle so it doesn't machine-gun if speed is insane
  const now = millis();
  if (now - lastSoundAt < 35) return;
  lastSoundAt = now;

  playRow(i);
  lastPlayIndex = i;
}

function playRow(i) {
  const row = rows[i];

  for (let k = 0; k < COLS.length; k++) {
    const raw = row.vals[k];
    let v = parseFloat(raw);
    if (!isFinite(v)) continue;
    if (v < 0) v = 0;

    const n = normLog(v, ranges[COLS[k]].lo, ranges[COLS[k]].hi); // 0..1

    // map n to a pentatonic scale across 3 octaves
    const baseMidi = [48, 55, 62, 69][k]; // C3, G3, D4, A4 vibe
    const freq = midiToFreq(quantizePentatonic(n, baseMidi));

    // duration "fits" the magnitude
    const dur = lerp(0.05, 0.32, n);

    // quieter for lower lanes, avoids chaos
    const amp = lerp(0.05, 0.18, n) * (k === 0 ? 1.0 : 0.75);

    const voice = voices[k];
    voice.osc.freq(freq);

    // shape envelope based on duration
    const a = 0.004;
    const d = max(0.015, dur * 0.35);
    const r = max(0.03,  dur * 0.65);
    voice.env.setADSR(a, d, 0.0, r);
    voice.env.setRange(amp, 0);

    voice.env.play(voice.osc, 0, dur);
  }
}

function computeRanges() {
  // robust percentile min/max in log space per column
  const n = table.getRowCount();
  for (const col of COLS) {
    let vals = [];
    for (let i = 0; i < n; i++) {
      let v = table.getNum(i, col);
      if (!isFinite(v)) continue;
      if (v < 0) v = 0;
      vals.push(Math.log1p(v));
    }
    vals.sort((a, b) => a - b);
    const lo = percentile(vals, 5);
    const hi = percentile(vals, 95);
    ranges[col] = { lo, hi: max(hi, lo + 1e-6) };
  }
}

function normLog(v, lo, hi) {
  const x = Math.log1p(max(0, v));
  return constrain((x - lo) / (hi - lo), 0, 1);
}

function quantizePentatonic(n, baseMidi) {
  const scale = [0, 3, 5, 7, 10]; // minor pentatonic steps
  const octaves = 3;
  const steps = scale.length * octaves;

  let idx = floor(n * (steps - 1));
  idx = constrain(idx, 0, steps - 1);

  const oct = floor(idx / scale.length);
  const deg = idx % scale.length;
  return baseMidi + 12 * oct + scale[deg];
}

function percentile(sortedArr, p) {
  if (!sortedArr || sortedArr.length === 0) return 0;
  const idx = (p / 100) * (sortedArr.length - 1);
  const lo = floor(idx), hi = ceil(idx);
  const t = idx - lo;
  return lerp(sortedArr[lo], sortedArr[hi], t);
}

/* -------------------- UI + CONTROLS -------------------- */

function drawHUD(maxOffset) {
  push();
  noStroke();
  fill(255, 200);
  textSize(12);

  const status = paused ? "paused" : "playing";
  const direction = dir === 1 ? "forward" : "back";
  const sound = audioReady ? (muted ? "muted" : "on") : "click to enable sound";

  text(`scroll: ${status}, ${direction} | speed: ${speed.toFixed(0)} px/s | sound: ${sound}`, 12, 18);

  if (maxOffset > 0) {
    const p = xOffset / maxOffset;
    fill(255, 40);
    rect(12, 28, 180, 6, 3);
    fill(255, 140);
    rect(12, 28, 180 * p, 6, 3);
  }
  pop();
}

function keyPressed() {
  if (key === " ") {
    initAudioIfNeeded();
    paused = !paused;
  }
  if (key === "r" || key === "R") {
    xOffset = 0;
    dir = 1;
    lastPlayIndex = -1;
  }
  if (key === "m" || key === "M") {
    initAudioIfNeeded();
    muted = !muted;
  }
}

function mouseWheel(e) {
  speed *= (e.deltaY > 0) ? 0.92 : 1.08;
  speed = constrain(speed, 40, 1600);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}