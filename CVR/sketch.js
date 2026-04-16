let table;
let actorEvents = [];
let glyphs = [];
let anchors = {};
let grainSeed = [];
let focusPoint;

let tokenSpriteCache = {};
let measureG;

let skyDay, skyDusk, skyNight, skyBlack;

let startMs = 0;
let collisionStarted = false;
let collisionStartMs = 0;
let frozenPlay = 1;

const CONFIG = {
  pieceDuration: 24,
  restartDelay: 3.0,
  collisionHold: 0.8,
  bgFade: 26,
  cornerOffset: 0.16,
  grainCount: 120,
  timeScale: 0.028,
  frontGlyphCap: 28
};

//////////////////////////////////////////////////////////////////

function preload() {
  table = loadTable('combined_transcript_timeline.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noSmooth();
  imageMode(CENTER);

  skyDay = color(135, 195, 255);
  skyDusk = color(42, 78, 145);
  skyNight = color(8, 14, 30);
  skyBlack = color(0, 0, 0);

  measureG = createGraphics(1, 1);
  measureG.pixelDensity(1);
  measureG.textFont('Helvetica');
  measureG.textStyle(NORMAL);
  measureG.textAlign(CENTER, CENTER);

  randomSeed(27);

  parseDataset();
  rebuildScene();
  resetPiece();
}

//////////////////////////////////////////////////////////////////

function resetPiece() {
  startMs = millis();
  collisionStarted = false;
  collisionStartMs = 0;
  frozenPlay = 1;
  background(skyDay);
}

function parseDataset() {
  actorEvents = [];
  const rows = [];

  for (let i = 0; i < table.getRowCount(); i++) {
    const timeStr = safeCell(i, 'time');
    const helicopter = safeCell(i, 'helicopter');
    const atc = safeCell(i, 'atc');
    const airplane = safeCell(i, 'airplane');
    const blob = `${helicopter} ${atc} ${airplane}`.toLowerCase();

    if (/impact|transmission cut off by impact|elt signal/.test(blob)) {
      break;
    }

    rows.push({
      time: parseTimeToSeconds(timeStr),
      helicopter,
      airplane
    });
  }

  const validRows = rows.filter(r => Number.isFinite(r.time));
  if (!validRows.length) {
    console.error('No valid rows found in CSV.');
    return;
  }

  const t0 = validRows[0].time;
  const t1 = validRows[validRows.length - 1].time;
  const span = max(1, t1 - t0);

  for (const row of validRows) {
    const rel = (row.time - t0) / span;

    if (isMeaningful(row.helicopter)) {
      actorEvents.push(makeEvent('helicopter', row.helicopter, rel));
    }
    if (isMeaningful(row.airplane)) {
      actorEvents.push(makeEvent('airplane', row.airplane, rel));
    }
  }
}

function makeEvent(actor, text, rel) {
  const cleaned = cleanText(text);
  const wordCount = cleaned ? cleaned.split(/\s+/).filter(Boolean).length : 0;
  const urgent = /(traffic|in sight|behind|visual|maintain|hold|takeoff|runway|contact|clear|cleared|departure|no delay)/i.test(cleaned);
  const interruptions = (cleaned.match(/\*|-/g) || []).length;
  const tokens = extractVisualTokens(cleaned);

  const energy = constrain(
    0.42 + wordCount * 0.045 + interruptions * 0.09 + (urgent ? 0.55 : 0),
    0.45,
    2.6
  );

  return {
    actor,
    rel,
    wordCount,
    urgent,
    energy,
    tokens
  };
}

//////////////////////////////////////////////////////////////////

function rebuildScene() {
  background(skyDay);
  buildAnchors();
  buildGlyphs();
  buildGrain();
}

function buildAnchors() {
  const dx = width * CONFIG.cornerOffset;
  const dy = height * CONFIG.cornerOffset;

  focusPoint = {
    x: width * 0.5,
    y: height * 0.5
  };

  anchors.helicopter = {
    x: -dx,
    y: -dy,
    dir: 1
  };

  anchors.airplane = {
    x: width + dx,
    y: height + dy,
    dir: -1
  };

  for (const key of ['helicopter', 'airplane']) {
    const a = anchors[key];
    const vx = focusPoint.x - a.x;
    const vy = focusPoint.y - a.y;
    const mag = max(0.0001, Math.hypot(vx, vy));
    const nvx = vx / mag;
    const nvy = vy / mag;

    a.px = -nvy;
    a.py = nvx;
  }
}

function buildGlyphs() {
  glyphs = [];

  const stats = {
    helicopter: { events: 0, energy: 0 },
    airplane: { events: 0, energy: 0 }
  };

  for (const event of actorEvents) {
    stats[event.actor].events += 1;
    stats[event.actor].energy += event.energy;
  }

  const heliScore = stats.helicopter.events * 0.8 + stats.helicopter.energy;
  const planeScore = stats.airplane.events * 0.8 + stats.airplane.energy;
  const maxScore = max(heliScore, planeScore, 0.0001);

  const actorBoost = {
    helicopter: constrain(sqrt(maxScore / max(heliScore, 0.0001)), 1, 1.35),
    airplane: constrain(sqrt(maxScore / max(planeScore, 0.0001)), 1, 1.35)
  };

  for (const event of actorEvents) {
    const wordFactor = map(event.wordCount, 1, 20, 0.9, 1.35, true);
    const baseCount = floor(map(event.energy, 0.45, 2.6, 2, 6, true));
    const count = max(1, floor(baseCount * wordFactor * actorBoost[event.actor]));

    for (let i = 0; i < count; i++) {
      const token = pickToken(event.tokens, event.actor);
      const textSize = random(3.8, 5.4);
      const sprite = getTokenSprite(token, textSize);

      glyphs.push({
        actor: event.actor,
        spawn: constrain(lerp(0.02, 0.82, event.rel) + random(-0.012, 0.012), 0, 0.9),
        urgent: event.urgent,
        alpha: random(95, 220),
        phase: random(TWO_PI),
        band: pow(random(), 0.78),
        turns: random(1.2, 3.8),
        spinSpeed: random(0.65, 1.35) + (event.urgent ? 0.18 : 0),
        radialJitter: random(0.92, 1.08),
        inwardPull: random(0.30, 0.62),
        sprite
      });
    }
  }

  glyphs.sort((a, b) => a.spawn - b.spawn);
}

function buildGrain() {
  grainSeed = [];
  for (let i = 0; i < CONFIG.grainCount; i++) {
    grainSeed.push({
      x: random(width),
      y: random(height),
      a: random(5, 18),
      p: random(TWO_PI)
    });
  }
}

//////////////////////////////////////////////////////////////////

function draw() {
  const elapsed = (millis() - startMs) / 1000;
  const rawPlay = min(elapsed / CONFIG.pieceDuration, 1);
  const play = collisionStarted ? frozenPlay : rawPlay;
  const t = frameCount * CONFIG.timeScale;
  const collisionT = getCollisionAmount();

  blendMode(BLEND);
  drawSkyBackground(play, collisionT);
  drawGrain(collisionT);

  const actorFrames = computeActorFrames(play, t);
  const frameStates = computeFrameGlyphStates(play, t, actorFrames);

  blendMode(ADD);
  drawGlyphs(frameStates);
  blendMode(BLEND);

  const touched = findSpiralContact(frameStates);

  if (!collisionStarted && touched) {
    collisionStarted = true;
    collisionStartMs = millis();
    frozenPlay = play;
  }

  if (collisionStarted) {
    drawCollisionFlash(collisionT);

    const sinceCollision = (millis() - collisionStartMs) / 1000;
    if (sinceCollision >= CONFIG.collisionHold + CONFIG.restartDelay) {
      resetPiece();
      return;
    }
  }
}

function drawSkyBackground(play, collisionT) {
  let baseSky;
  const dayToNight = smoothstep(0.0, 0.92, play);

  if (dayToNight < 0.55) {
    const t = map(dayToNight, 0.0, 0.55, 0, 1, true);
    baseSky = lerpColor(skyDay, skyDusk, t);
  } else {
    const t = map(dayToNight, 0.55, 1.0, 0, 1, true);
    baseSky = lerpColor(skyDusk, skyNight, t);
  }

  const finalSky = lerpColor(baseSky, skyBlack, collisionT);

  noStroke();
  rectMode(CORNER);
  fill(red(finalSky), green(finalSky), blue(finalSky), CONFIG.bgFade);
  rect(0, 0, width, height);
}

function computeActorFrames(play, t) {
  const frames = {};

  for (const key of ['helicopter', 'airplane']) {
    const a = anchors[key];
    const moveT = smoothstep(0.0, 0.94, play);

    const baseX = lerp(a.x, focusPoint.x, pow(moveT, 0.92));
    const baseY = lerp(a.y, focusPoint.y, pow(moveT, 0.92));

    const sideOffset = (1 - moveT) * min(width, height) * 0.09 * a.dir;
    const orbitOffset =
      sin(t * 0.8 + (key === 'helicopter' ? 0.0 : PI)) *
      min(width, height) *
      0.012 *
      (1 - moveT);

    const cx = baseX + a.px * sideOffset + a.px * orbitOffset;
    const cy = baseY + a.py * sideOffset + a.py * orbitOffset;

    const outerRadius = lerp(min(width, height) * 0.24, min(width, height) * 0.055, moveT);

    frames[key] = {
      x: cx,
      y: cy,
      dir: a.dir,
      outerRadius
    };
  }

  return frames;
}

function computeFrameGlyphStates(play, t, actorFrames) {
  const states = [];

  for (const glyph of glyphs) {
    const st = getGlyphState(glyph, play, t, actorFrames[glyph.actor]);
    if (!st) continue;
    st.glyph = glyph;
    states.push(st);
  }

  return states;
}

function getGlyphState(glyph, play, t, actorFrame) {
  if (play < glyph.spawn) return null;

  const life = constrain((play - glyph.spawn) / max(0.10, 1 - glyph.spawn), 0, 1);
  const reveal = constrain(life * 7.0, 0, 1);
  if (reveal <= 0) return null;

  const tighten = smoothstep(0.0, 1.0, life);
  const spiralSpin = actorFrame.dir * t * glyph.spinSpeed;
  const spiralWrap = actorFrame.dir * glyph.turns * TWO_PI * glyph.band;
  const inwardSpin = actorFrame.dir * tighten * 2.6;

  const theta = glyph.phase + spiralSpin + spiralWrap + inwardSpin;

  let radius = actorFrame.outerRadius * (0.16 + 0.84 * glyph.band) * glyph.radialJitter;
  radius *= 1.0 - glyph.inwardPull * tighten;
  radius = max(3, radius);

  const x = actorFrame.x + cos(theta) * radius;
  const y = actorFrame.y + sin(theta) * radius;

  const rot = theta + HALF_PI;
  const dFocus = dist(x, y, focusPoint.x, focusPoint.y);
  const hitRadius = max(glyph.sprite.w, glyph.sprite.h) * 0.34 + 1.0;

  return {
    x,
    y,
    rot,
    alpha: glyph.alpha * reveal,
    dFocus,
    hitRadius
  };
}

function drawGlyphs(frameStates) {
  for (const st of frameStates) {
    const glyph = st.glyph;

    push();
    translate(st.x, st.y);
    rotate(st.rot);
    tint(255, min(255, st.alpha));
    image(glyph.sprite.img, 0, 0, glyph.sprite.w, glyph.sprite.h);
    pop();
  }
  noTint();
}

function findSpiralContact(frameStates) {
  const heli = [];
  const plane = [];

  for (const st of frameStates) {
    if (st.glyph.actor === 'helicopter') heli.push(st);
    else if (st.glyph.actor === 'airplane') plane.push(st);
  }

  heli.sort((a, b) => a.dFocus - b.dFocus);
  plane.sort((a, b) => a.dFocus - b.dFocus);

  const heliFront = heli.slice(0, CONFIG.frontGlyphCap);
  const planeFront = plane.slice(0, CONFIG.frontGlyphCap);

  let bestDist = Infinity;
  let bestA = null;
  let bestB = null;

  for (const a of heliFront) {
    for (const b of planeFront) {
      const d = dist(a.x, a.y, b.x, b.y);
      if (d < bestDist) {
        bestDist = d;
        bestA = a;
        bestB = b;
      }
    }
  }

  if (!bestA || !bestB) return false;

  const touchThreshold = bestA.hitRadius + bestB.hitRadius;
  return bestDist <= touchThreshold;
}

function drawCollisionFlash(collisionT) {
  if (collisionT <= 0) return;

  const alpha = map(collisionT, 0, 0.12, 0, 255, true);

  noStroke();
  rectMode(CORNER);
  fill(255, alpha);
  rect(0, 0, width, height);
}

function drawGrain(collisionT) {
  strokeWeight(1);
  for (const g of grainSeed) {
    const alpha =
      g.a *
      (0.45 + 0.55 * sin(frameCount * 0.03 + g.p)) *
      (1.0 - collisionT * 0.75);
    stroke(255, alpha);
    point(g.x, g.y);
  }
}

function getCollisionAmount() {
  if (!collisionStarted) return 0;
  return constrain((millis() - collisionStartMs) / (CONFIG.collisionHold * 1000), 0, 1);
}

function extractVisualTokens(str) {
  return cleanText(str)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 2)
    .map(w => w.slice(0, min(w.length, 4)));
}

function pickToken(tokens, fallbackActor) {
  if (tokens && tokens.length) return random(tokens);
  return fallbackActor === 'helicopter' ? 'HEL' : 'AIR';
}

function getTokenSprite(token, size) {
  const key = token + '_' + size.toFixed(2);
  if (tokenSpriteCache[key]) return tokenSpriteCache[key];

  measureG.textSize(size);
  const pad = 3;
  const tw = max(4, ceil(measureG.textWidth(token)));
  const w = tw + pad * 2;
  const h = ceil(size * 1.8) + pad * 2;

  const g = createGraphics(w, h);
  g.pixelDensity(1);
  g.clear();
  g.noSmooth();
  g.textAlign(CENTER, CENTER);
  g.textFont('Helvetica');
  g.textStyle(NORMAL);
  g.textSize(size);
  g.noStroke();
  g.fill(255);
  g.text(token, w * 0.5, h * 0.52);

  const sprite = { img: g, w, h };
  tokenSpriteCache[key] = sprite;
  return sprite;
}

function parseTimeToSeconds(str) {
  if (!str) return NaN;
  const m = String(str).trim().match(/^(\d{1,2}):(\d{2}):(\d{2}(?:\.\d+)?)$/);
  if (!m) return NaN;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function cleanText(str) {
  return String(str || '')
    .replace(/^\s+|\s+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^nan$/i, '')
    .replace(/^START OF COMBINED TRANSCRIPT$/i, '');
}

function isMeaningful(str) {
  return cleanText(str).length > 0;
}

function safeCell(row, col) {
  const value = table.getString(row, col);
  return value == null ? '' : String(value).trim();
}

function smoothstep(edge0, edge1, x) {
  const t = constrain((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  rebuildScene();
  resetPiece();
}

