let table;
let actorEvents = [];
let shards = [];
let anchors = {};
let grainSeed = [];
let focusPoint;

let tokenSpriteCache = {};
let measureG;

let skyDay, skyDusk, skyNight, skyBlack;

let startMs = 0;
let collisionStarted = false;
let collisionStartMs = 0;
let collisionStartFrame = 0;
let frozenPlay = 1;
let collisionPoint = { x: 0, y: 0 };

const CONFIG = {
  pieceDuration: 24,
  collisionHold: 0.8,
  bgFade: 34,
  cornerOffset: 0.18,
  grainCount: 160,
  timeScale: 0.032,
  frontSegmentCap: 24,
  postWhiteFrames: 120
};

function preload() {
  table = loadTable('combined_transcript_timeline.csv', 'csv', 'header');
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  noFill();
  noSmooth();
  strokeCap(SQUARE);
  textAlign(CENTER, CENTER);
  textFont('Helvetica');
  textStyle(NORMAL);
  imageMode(CENTER);

  skyDay = color(125, 185, 255);
  skyDusk = color(36, 66, 130);
  skyNight = color(5, 10, 24);
  skyBlack = color(0, 0, 0);

  measureG = createGraphics(1, 1);
  measureG.pixelDensity(1);
  measureG.textFont('Helvetica');
  measureG.textStyle(NORMAL);
  measureG.textAlign(CENTER, CENTER);

  randomSeed(27);
  noiseSeed(27);

  parseDataset();
  rebuildScene();
  resetPiece();
}

function resetPiece() {
  startMs = millis();
  collisionStarted = false;
  collisionStartMs = 0;
  collisionStartFrame = 0;
  frozenPlay = 1;
  collisionPoint = { x: width * 0.5, y: height * 0.5 };
  background(skyDay);
  loop();
}

function parseDataset() {
  actorEvents = [];

  const rows = [];
  let impactRow = table.getRowCount();

  for (let i = 0; i < table.getRowCount(); i++) {
    const timeStr = safeCell(i, 'time');
    const helicopter = safeCell(i, 'helicopter');
    const atc = safeCell(i, 'atc');
    const airplane = safeCell(i, 'airplane');
    const blob = `${helicopter} ${atc} ${airplane}`.toLowerCase();

    if (/impact|transmission cut off by impact|elt signal/.test(blob)) {
      impactRow = i;
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

  console.log(`Parsed ${actorEvents.length} actor events, cut before row ${impactRow}.`);
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
    text: cleaned,
    wordCount,
    urgent,
    energy,
    tokens
  };
}

function rebuildScene() {
  background(skyDay);
  buildAnchors();
  buildShards();
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
    y: -dy
  };

  anchors.airplane = {
    x: width + dx,
    y: height + dy
  };

  for (const key of ['helicopter', 'airplane']) {
    const a = anchors[key];
    a.angleCenter = atan2(focusPoint.y - a.y, focusPoint.x - a.x);
    a.distToFocus = dist(a.x, a.y, focusPoint.x, focusPoint.y);
    a.startRadiusMin = a.distToFocus * 0.12;
    a.startRadiusMax = a.distToFocus * 0.50;
    a.targetRadius = a.distToFocus * 0.985;
    a.arrivalSpread = a.distToFocus * 0.012;
  }
}

function buildShards() {
  shards = [];

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
    helicopter: constrain(sqrt(maxScore / max(heliScore, 0.0001)), 1, 1.45),
    airplane: constrain(sqrt(maxScore / max(planeScore, 0.0001)), 1, 1.45)
  };

  for (const event of actorEvents) {
    const anchor = anchors[event.actor];
    const wordFactor = map(event.wordCount, 1, 20, 0.9, 1.35, true);
    const baseCount = floor(map(event.energy, 0.45, 2.6, 2, 5, true));
    const count = max(1, floor(baseCount * wordFactor * actorBoost[event.actor]));

    for (let i = 0; i < count; i++) {
      const startRadius = random(anchor.startRadiusMin, anchor.startRadiusMax);
      const targetRadius = anchor.targetRadius + randomGaussian(0, anchor.arrivalSpread);

      const lengthBase = map(event.energy, 0.45, 2.6, 12, 34, true) * random(0.75, 1.2);
      const thickness = random(0.9, 2.4);

      const angleOffset = randomGaussian(0, map(event.energy, 0.45, 2.6, 0.30, 0.10, true));
      const motionAmp = random(0.008, 0.030) + (event.urgent ? 0.010 : 0);
      const radialAmp = random(anchor.distToFocus * 0.002, anchor.distToFocus * 0.010);

      const phase = random(TWO_PI);
      const drift = random(0.9, 2.2);
      const alpha = random(95, 220);

      const spawn = lerp(0.01, 0.76, event.rel);

      const token = pickToken(event.tokens, event.actor);
      const textSize = random(3.8, 5.0);
      const sprite = getTokenSprite(token, textSize);

      shards.push({
        actor: event.actor,
        spawn,
        energy: event.energy,
        urgent: event.urgent,
        startRadius,
        targetRadius,
        angleOffset,
        motionAmp,
        radialAmp,
        phase,
        drift,
        alpha,
        lengthBase,
        thickness,
        token,
        textSize,
        sprite
      });
    }
  }

  shards.sort((a, b) => a.spawn - b.spawn);
}

function buildGrain() {
  grainSeed = [];
  for (let i = 0; i < CONFIG.grainCount; i++) {
    grainSeed.push({
      x: random(width),
      y: random(height),
      a: random(6, 22),
      p: random(TWO_PI)
    });
  }
}

function draw() {
  const elapsed = (millis() - startMs) / 1000;
  const rawPlay = min(elapsed / CONFIG.pieceDuration, 1);
  const play = collisionStarted ? frozenPlay : rawPlay;
  const t = frameCount * CONFIG.timeScale;
  const tension = tensionAt(play);
  const collisionT = getCollisionAmount();

  blendMode(BLEND);
  drawSkyBackground(play, collisionT);
  drawGrain(collisionT);

  const frameStates = computeFrameStates(play, t, tension);

  blendMode(ADD);
  drawShards(frameStates, tension);
  blendMode(BLEND);

  const contact = findArcContactFromStates(frameStates);

  if (!collisionStarted && contact.touched) {
    collisionStarted = true;
    collisionStartMs = millis();
    collisionStartFrame = frameCount;
    frozenPlay = play;
    collisionPoint = contact.point;
  }

  if (collisionStarted) {
    drawCollisionFlash(collisionT);
  }

  if (
    collisionStarted &&
    collisionT >= 1 &&
    frameCount - collisionStartFrame > CONFIG.postWhiteFrames
  ) {
    noLoop();
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

function computeFrameStates(play, t, tension) {
  const states = [];
  for (const shard of shards) {
    const st = getSegmentState(shard, play, t, tension);
    if (!st) continue;
    st.shard = shard;
    states.push(st);
  }
  return states;
}

function drawShards(frameStates, tension) {
  for (const st of frameStates) {
    const shard = st.shard;
    const alpha = min(255, shard.alpha * st.reveal * (0.78 + tension * 0.28));

    push();
    translate(st.cx, st.cy);
    rotate(st.rot);
    tint(255, alpha);
    image(shard.sprite.img, 0, 0, shard.sprite.w, shard.sprite.h);
    pop();
  }
  noTint();
}

function getSegmentState(shard, play, t, tension) {
  if (play < shard.spawn) return null;

  const anchor = anchors[shard.actor];
  const life = constrain((play - shard.spawn) / max(0.08, 1 - shard.spawn), 0, 1);
  const reveal = constrain(life * 7.2, 0, 1);
  if (reveal <= 0) return null;

  const pull = pow(life, 0.72);
  const tighten = smoothstep(0.0, 1.0, life);

  const angleWobble =
    sin(t * (4.0 + shard.drift) + shard.phase) * shard.motionAmp * (1.0 + tension * 0.15) +
    (noise(shard.phase * 0.31, t * 0.85) - 0.5) * shard.motionAmp * 0.7;

  const angle =
    anchor.angleCenter +
    shard.angleOffset * (1.0 - 0.86 * tighten) +
    angleWobble;

  const radialBreath =
    sin(t * (5.2 + shard.drift * 0.5) + shard.phase * 1.4) *
    shard.radialAmp *
    (1.0 - 0.72 * tighten);

  const radius = lerp(shard.startRadius, shard.targetRadius, pull) + radialBreath;

  const cx = anchor.x + cos(angle) * radius;
  const cy = anchor.y + sin(angle) * radius;

  const len =
    shard.lengthBase *
    reveal *
    (0.88 + 0.12 * sin(t * 6.0 + shard.phase)) *
    (1.0 + tension * 0.12);

  const rot = angle + HALF_PI + sin(t * 4.5 + shard.phase) * 0.06;

  const hx = cos(rot) * len * 0.5;
  const hy = sin(rot) * len * 0.5;

  return {
    cx,
    cy,
    len,
    rot,
    reveal,
    x1: cx - hx,
    y1: cy - hy,
    x2: cx + hx,
    y2: cy + hy,
    thickness: shard.thickness,
    dFocus: dist(cx, cy, focusPoint.x, focusPoint.y)
  };
}

function findArcContactFromStates(frameStates) {
  const heli = [];
  const plane = [];

  for (const st of frameStates) {
    if (st.shard.actor === 'helicopter') heli.push(st);
    if (st.shard.actor === 'airplane') plane.push(st);
  }

  heli.sort((a, b) => a.dFocus - b.dFocus);
  plane.sort((a, b) => a.dFocus - b.dFocus);

  const heliFront = heli.slice(0, CONFIG.frontSegmentCap);
  const planeFront = plane.slice(0, CONFIG.frontSegmentCap);

  let bestDist = Infinity;
  let bestA = null;
  let bestB = null;

  for (const a of heliFront) {
    for (const b of planeFront) {
      const d = segmentDistance(a, b);
      if (d < bestDist) {
        bestDist = d;
        bestA = a;
        bestB = b;
      }
    }
  }

  if (!bestA || !bestB) {
    return {
      touched: false,
      bestDist: Infinity,
      point: { x: focusPoint.x, y: focusPoint.y }
    };
  }

  const touchThreshold = (bestA.thickness + bestB.thickness) * 0.65 + 1.5;

  return {
    touched: bestDist <= touchThreshold,
    bestDist,
    point: {
      x: (bestA.cx + bestB.cx) * 0.5,
      y: (bestA.cy + bestB.cy) * 0.5
    }
  };
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
    const alpha = g.a * (0.45 + 0.55 * sin(frameCount * 0.03 + g.p)) * (1.0 - collisionT * 0.75);
    stroke(255, alpha);
    point(g.x, g.y);
  }
}

function getCollisionAmount() {
  if (!collisionStarted) return 0;
  return constrain((millis() - collisionStartMs) / (CONFIG.collisionHold * 1000), 0, 1);
}

function tensionAt(play) {
  const dense = actorDensity(play);
  const lateRamp = smoothstep(0.50, 0.95, play);
  return constrain(dense * 0.7 + lateRamp * 1.0, 0, 1.3);
}

function actorDensity(play) {
  let score = 0;
  for (const e of actorEvents) {
    const d = abs(e.rel - play);
    if (d < 0.05) {
      score += (1 - d / 0.05) * e.energy;
    }
  }
  return constrain(score / 10.5, 0, 1.2);
}

function segmentDistance(a, b) {
  if (segmentsIntersect(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1, b.x2, b.y2)) {
    return 0;
  }

  return min(
    pointSegmentDistance(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2),
    pointSegmentDistance(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2),
    pointSegmentDistance(b.x1, b.y1, a.x1, a.y1, a.x2, a.y2),
    pointSegmentDistance(b.x2, b.y2, a.x1, a.y1, a.x2, a.y2)
  );
}

function pointSegmentDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) return dist(px, py, x1, y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = constrain(t, 0, 1);

  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return dist(px, py, cx, cy);
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const o1 = orientation(x1, y1, x2, y2, x3, y3);
  const o2 = orientation(x1, y1, x2, y2, x4, y4);
  const o3 = orientation(x3, y3, x4, y4, x1, y1);
  const o4 = orientation(x3, y3, x4, y4, x2, y2);

  if (o1 !== o2 && o3 !== o4) return true;

  if (o1 === 0 && onSegment(x1, y1, x3, y3, x2, y2)) return true;
  if (o2 === 0 && onSegment(x1, y1, x4, y4, x2, y2)) return true;
  if (o3 === 0 && onSegment(x3, y3, x1, y1, x4, y4)) return true;
  if (o4 === 0 && onSegment(x3, y3, x2, y2, x4, y4)) return true;

  return false;
}

function orientation(ax, ay, bx, by, cx, cy) {
  const v = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (abs(v) < 0.000001) return 0;
  return v > 0 ? 1 : 2;
}

function onSegment(x1, y1, px, py, x2, y2) {
  return (
    px <= max(x1, x2) && px >= min(x1, x2) &&
    py <= max(y1, y2) && py >= min(y1, y2)
  );
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
  if (tokens && tokens.length) {
    return random(tokens);
  }
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

function keyPressed() {
  if (key === 'r' || key === 'R') resetPiece();
  if (key === 's' || key === 'S') saveCanvas('collision-arcs-frame', 'png');
}