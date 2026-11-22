// The three jobs: room layouts, loot, patrol routes, cameras and exits. A level is
// plain data; the step function below moves the thief, grabs loot, watches the
// alarm and decides when a job is done, caught or blown.
import {
  ALARM_CAMERA_RATE, ALARM_DECAY_RATE, ALARM_GUARD_RATE, ALARM_MAX, ALARM_NEAR_BONUS,
  ALARM_SNEAK_FACTOR, CAMERA_HALF_ANGLE, CAMERA_RANGE, CONE_HALF_ANGLE, CONE_RANGE,
  DISGUISE_SECONDS, EMP_SECONDS, GRAB_SECONDS, GUARD_RADIUS, LOCKPICK_SECONDS, MISSION_NAMES,
  SMOKE_SECONDS, THIEF_RADIUS, THIEF_SNEAK_SPEED, THIEF_WALK_SPEED, VIEW_HEIGHT,
  VIEW_WIDTH,
} from './config.js';
import { createSeededRandom, jitter } from './rng.js';
import { moveGuardAlongPatrol, guardSeesThief, cameraSeesThief } from './guards.js';
import { TOOL_SMOKE, TOOL_EMP, TOOL_LOCKPICK, TOOL_DISGUISE } from './tools.js';

export const EVENT_NONE = 0;
export const EVENT_LOOT = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_MISSION_DONE = 8;
export const EVENT_ALARM_HIGH = 16;
export const EVENT_TOOL_USED = 32;

const WALL = { x: 0, y: 0, w: 0, h: 0 };
function wall(x, y, w, h) {
  return { ...WALL, x, y, w, h };
}

function lootPiece(id, kind, label, x, y, value, grabTime) {
  return { id, kind, label, x, y, value, grabTime, taken: false, progress: 0 };
}

function patroller(id, waypoints, pauseSeconds) {
  return { id, waypoints, waypointIndex: 0, pauseSeconds, pauseLeft: 0, x: waypoints[0][0], y: waypoints[0][1], facing: 0, alert: 0, speed: 62 };
}

function watcher(id, x, y, baseAngle, sweep, speed) {
  return { id, x, y, baseAngle, sweep, speed, phase: 0, disabledLeft: 0 };
}

function buildGalleryLevel() {
  return {
    name: MISSION_NAMES[0],
    brief: 'Lift the Marlowe Diamond and three paintings. Slip past the night guards.',
    floorTint: '#2b2f55',
    carpet: '#3a2f5e',
    walls: [
      wall(0, 0, VIEW_WIDTH, 26), wall(0, VIEW_HEIGHT - 26, VIEW_WIDTH, 26),
      wall(0, 0, 26, VIEW_HEIGHT), wall(VIEW_WIDTH - 26, 0, 26, VIEW_HEIGHT),
      wall(300, 190, 200, 26), wall(780, 190, 200, 26),
      wall(300, 560, 200, 26), wall(780, 560, 200, 26),
      wall(560, 330, 160, 26), wall(560, 440, 160, 26),
    ],
    covers: [
      { x: 330, y: 300, w: 110, h: 70, label: 'bench' },
      { x: 840, y: 430, w: 110, h: 70, label: 'bench' },
      { x: 600, y: 130, w: 80, h: 60, label: 'plinth' },
    ],
    loot: [
      lootPiece('diamond', 'diamond', 'Marlowe Diamond', 640, 385, 1200, LOCKPICK_SECONDS),
      lootPiece('paint1', 'painting', 'Velvet Sunrise', 180, 150, 350, GRAB_SECONDS),
      lootPiece('paint2', 'painting', 'Midnight Harbor', 1100, 150, 350, GRAB_SECONDS),
      lootPiece('paint3', 'painting', 'The Silent Dancer', 180, 650, 350, GRAB_SECONDS),
      lootPiece('paint4', 'painting', 'Gold Hour', 1100, 650, 350, GRAB_SECONDS),
    ],
    guards: [
      patroller('g1', [[330, 130], [950, 130], [950, 700], [330, 700]], 1.2),
      patroller('g2', [[640, 620], [640, 130], [1100, 130], [1100, 620]], 0.8),
    ],
    cameras: [
      watcher('c1', 640, 30, Math.PI / 2, 0.9, 0.5),
      watcher('c2', 1240, 400, Math.PI, 0.8, 0.42),
    ],
    exit: { x: 1160, y: 380, w: 90, h: 90, label: 'SERVICE DOOR' },
    start: { x: 90, y: 400 },
    requiredValue: 1200,
  };
}

function buildBankLevel() {
  return {
    name: MISSION_NAMES[1],
    brief: 'Crack the vault. Gold bars first, then the vault door — and stay out of the cones.',
    floorTint: '#33302a',
    carpet: '#4a3f2a',
    walls: [
      wall(0, 0, VIEW_WIDTH, 26), wall(0, VIEW_HEIGHT - 26, VIEW_WIDTH, 26),
      wall(0, 0, 26, VIEW_HEIGHT), wall(VIEW_WIDTH - 26, 0, 26, VIEW_HEIGHT),
      wall(240, 0, 26, 300), wall(240, 420, 26, 380),
      wall(640, 190, 26, 420), wall(1010, 0, 26, 300), wall(1010, 420, 26, 380),
      wall(420, 560, 300, 26),
    ],
    covers: [
      { x: 330, y: 330, w: 130, h: 80, label: 'desk' },
      { x: 760, y: 250, w: 130, h: 80, label: 'desk' },
      { x: 760, y: 470, w: 130, h: 80, label: 'desk' },
      { x: 1120, y: 330, w: 110, h: 80, label: 'desk' },
    ],
    loot: [
      lootPiece('vault', 'vault', 'Main Vault', 1180, 400, 2500, 4.5),
      lootPiece('gold1', 'gold', 'Gold Bars', 350, 150, 600, GRAB_SECONDS),
      lootPiece('gold2', 'gold', 'Gold Bars', 850, 650, 600, GRAB_SECONDS),
      lootPiece('cash1', 'cash', 'Cash Drawer', 350, 680, 300, GRAB_SECONDS),
      lootPiece('cash2', 'cash', 'Cash Drawer', 850, 130, 300, GRAB_SECONDS),
    ],
    guards: [
      patroller('g1', [[300, 360], [620, 360], [620, 640], [300, 640]], 1.0),
      patroller('g2', [[700, 140], [980, 140], [980, 640], [700, 640]], 1.0),
      patroller('g3', [[1080, 360], [1240, 360], [1240, 700], [1080, 700]], 0.6),
    ],
    cameras: [
      watcher('c1', 640, 30, Math.PI / 2, 1.0, 0.55),
      watcher('c2', 30, 400, 0, 0.9, 0.45),
      watcher('c3', 1010, 740, -Math.PI / 2, 0.8, 0.5),
    ],
    exit: { x: 60, y: 60, w: 90, h: 90, label: 'SIDE DOOR' },
    start: { x: 120, y: 700 },
    requiredValue: 2500,
  };
}

function buildRooftopLevel() {
  return {
    name: MISSION_NAMES[2],
    brief: 'The alarm is already warm. Grab what you can, reach the helicopter pad.',
    floorTint: '#262b33',
    carpet: '#2e3d3a',
    walls: [
      wall(0, 0, VIEW_WIDTH, 26), wall(0, VIEW_HEIGHT - 26, VIEW_WIDTH, 26),
      wall(0, 0, 26, VIEW_HEIGHT), wall(VIEW_WIDTH - 26, 0, 26, VIEW_HEIGHT),
      wall(420, 200, 440, 26), wall(420, 540, 440, 26),
      wall(200, 330, 26, 180), wall(1050, 330, 26, 180),
    ],
    covers: [
      { x: 480, y: 280, w: 120, h: 70, label: 'vent' },
      { x: 680, y: 450, w: 120, h: 70, label: 'vent' },
      { x: 300, y: 600, w: 110, h: 70, label: 'crate' },
    ],
    loot: [
      lootPiece('case', 'case', 'Velvet Case', 640, 385, 1800, LOCKPICK_SECONDS),
      lootPiece('gem1', 'gem', 'Sapphire Set', 160, 140, 500, GRAB_SECONDS),
      lootPiece('gem2', 'gem', 'Ruby Set', 1120, 140, 500, GRAB_SECONDS),
      lootPiece('gem3', 'gem', 'Emerald Set', 160, 660, 500, GRAB_SECONDS),
      lootPiece('gem4', 'gem', 'Opal Set', 1120, 660, 500, GRAB_SECONDS),
    ],
    guards: [
      patroller('g1', [[200, 200], [1080, 200], [1080, 600], [200, 600]], 0.7),
      patroller('g2', [[640, 260], [640, 520], [900, 520], [900, 260]], 0.9),
      patroller('g3', [[140, 400], [420, 400], [420, 700], [140, 700]], 0.8),
    ],
    cameras: [
      watcher('c1', 640, 30, Math.PI / 2, 1.1, 0.6),
      watcher('c2', 30, 400, 0, 1.0, 0.5),
      watcher('c3', 1230, 400, Math.PI, 1.0, 0.5),
    ],
    exit: { x: 590, y: 60, w: 100, h: 90, label: 'HELIPAD' },
    start: { x: 640, y: 720 },
    requiredValue: 1800,
  };
}

export const LEVEL_BUILDERS = [buildGalleryLevel, buildBankLevel, buildRooftopLevel];

export function circleHitsWall(x, y, radius, walls) {
  for (const w of walls) {
    const nearestX = Math.max(w.x, Math.min(x, w.x + w.w));
    const nearestY = Math.max(w.y, Math.min(y, w.y + w.h));
    const dx = x - nearestX;
    const dy = y - nearestY;
    if (dx * dx + dy * dy < radius * radius) return true;
  }
  return false;
}

export function segmentBlocked(x1, y1, x2, y2, walls) {
  for (const w of walls) {
    if (segmentHitsRect(x1, y1, x2, y2, w)) return true;
  }
  return false;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  let low = 0;
  let high = 1;
  if (dx === 0) {
    if (x1 < rect.x || x1 > rect.x + rect.w) return false;
  } else {
    let t1 = (rect.x - x1) / dx;
    let t2 = (rect.x + rect.w - x1) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    low = Math.max(low, t1);
    high = Math.min(high, t2);
    if (low > high) return false;
  }
  if (dy === 0) {
    if (y1 < rect.y || y1 > rect.y + rect.h) return false;
  } else {
    let t1 = (rect.y - y1) / dy;
    let t2 = (rect.y + rect.h - y1) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    low = Math.max(low, t1);
    high = Math.min(high, t2);
    if (low > high) return false;
  }
  return true;
}

export function createWorld(random) {
  const state = {
    missionIndex: 0,
    level: null,
    thief: { x: 90, y: 400, facing: 0, moving: false, sneaking: false },
    haul: 0,
    missionHaul: 0,
    alarm: 0,
    timeLeft: 0,
    elapsed: 0,
    quietSeconds: 0,
    smokeLeft: 0,
    empLeft: 0,
    disguiseLeft: 0,
    grabbing: null,
    caught: false,
    missionDone: false,
    alarmWasHigh: false,
    tools: { smoke: 1, emp: 1, lockpick: 1, disguise: 0 },
    budget: 0,
    seed: 0,
  };

  function loadMission(index, tools, budget, haulSoFar) {
    state.missionIndex = index;
    state.level = LEVEL_BUILDERS[index]();
    state.thief.x = state.level.start.x;
    state.thief.y = state.level.start.y;
    state.thief.facing = 0;
    state.missionHaul = 0;
    state.haul = haulSoFar;
    state.alarm = index === 2 ? 25 : 0;
    state.timeLeft = 0;
    state.elapsed = 0;
    state.smokeLeft = 0;
    state.empLeft = 0;
    state.disguiseLeft = 0;
    state.grabbing = null;
    state.caught = false;
    state.missionDone = false;
    state.alarmWasHigh = false;
    state.tools = { ...tools };
    state.budget = budget;
  }

  function reset(seed) {
    state.seed = seed;
    state.haul = 0;
    state.quietSeconds = 0;
    loadMission(0, { smoke: 1, emp: 1, lockpick: 1, disguise: 0 }, 0, 0);
  }

  function tryUseTool(kind) {
    if (state.caught || state.missionDone) return 0;
    if (state.tools[kind] <= 0) return 0;
    state.tools[kind] -= 1;
    if (kind === TOOL_SMOKE) state.smokeLeft = SMOKE_SECONDS;
    if (kind === TOOL_EMP) state.empLeft = EMP_SECONDS;
    if (kind === TOOL_DISGUISE) state.disguiseLeft = DISGUISE_SECONDS;
    if (kind === TOOL_LOCKPICK && state.grabbing) {
      state.grabbing.progress = state.grabbing.grabTime;
    }
    return EVENT_TOOL_USED;
  }

  function step(dt, move, sneaking, timeScale = 1) {
    if (state.caught || state.missionDone) return EVENT_NONE;
    let events = EVENT_NONE;
    const level = state.level;
    const thief = state.thief;
    const speed = sneaking ? THIEF_SNEAK_SPEED : THIEF_WALK_SPEED;
    const nextX = thief.x + move.x * speed * dt;
    const nextY = thief.y + move.y * speed * dt;
    if (!circleHitsWall(nextX, thief.y, THIEF_RADIUS, level.walls)) thief.x = nextX;
    if (!circleHitsWall(thief.x, nextY, THIEF_RADIUS, level.walls)) thief.y = nextY;
    thief.moving = move.x !== 0 || move.y !== 0;
    thief.sneaking = sneaking;
    if (thief.moving) thief.facing = Math.atan2(move.y, move.x);
    state.elapsed += dt;
    if (state.smokeLeft > 0) state.smokeLeft -= dt;
    if (state.empLeft > 0) state.empLeft -= dt;
    if (state.disguiseLeft > 0) state.disguiseLeft -= dt;

    const hiddenBySmoke = state.smokeLeft > 0;
    const disguised = state.disguiseLeft > 0;
    let seen = false;
    let nearestSeen = Infinity;

    for (const guard of level.guards) {
      moveGuardAlongPatrol(guard, dt, level.walls, timeScale);
      if (hiddenBySmoke) continue;
      const result = guardSeesThief(guard, thief, level.walls, disguised, sneaking);
      if (result.seen) {
        seen = true;
        nearestSeen = Math.min(nearestSeen, result.distance);
      }
    }
    for (const camera of level.cameras) {
      camera.phase += dt * camera.speed;
      if (camera.disabledLeft > 0) camera.disabledLeft -= dt;
      if (hiddenBySmoke || camera.disabledLeft > 0) continue;
      const angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
      const result = cameraSeesThief(camera, angle, thief, level.walls, sneaking);
      if (result.seen) {
        seen = true;
        nearestSeen = Math.min(nearestSeen, result.distance);
        state.alarm = Math.min(ALARM_MAX, state.alarm + ALARM_CAMERA_RATE * dt * (sneaking ? ALARM_SNEAK_FACTOR : 1));
      }
    }
    if (seen) {
      const rate = ALARM_GUARD_RATE * (sneaking ? ALARM_SNEAK_FACTOR : 1);
      const near = nearestSeen < 120 ? ALARM_NEAR_BONUS : 0;
      state.alarm = Math.min(ALARM_MAX, state.alarm + (rate + near) * dt);
      if (!state.alarmWasHigh && state.alarm >= 70) {
        state.alarmWasHigh = true;
        events |= EVENT_SPOTTED | EVENT_ALARM_HIGH;
      }
    } else {
      state.alarm = Math.max(0, state.alarm - ALARM_DECAY_RATE * dt);
      state.quietSeconds += dt;
    }

    for (const guard of level.guards) {
      const dx = thief.x - guard.x;
      const dy = thief.y - guard.y;
      if (dx * dx + dy * dy < (GUARD_RADIUS + THIEF_RADIUS + 2) ** 2 && !hiddenBySmoke && !disguised) {
        state.caught = true;
        return EVENT_CAUGHT;
      }
    }

    let nearestLoot = null;
    let nearestDistance = 46;
    for (const piece of level.loot) {
      if (piece.taken) continue;
      const distance = Math.hypot(piece.x - thief.x, piece.y - thief.y);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestLoot = piece;
      }
    }
    if (nearestLoot) {
      if (state.grabbing !== nearestLoot) state.grabbing = nearestLoot;
      const piece = state.grabbing;
      piece.progress += dt;
      if (piece.progress >= piece.grabTime) {
        piece.taken = true;
        state.missionHaul += piece.value;
        state.haul += piece.value;
        state.grabbing = null;
        events |= EVENT_LOOT;
      }
    } else {
      state.grabbing = null;
      for (const piece of level.loot) if (!piece.taken) piece.progress = 0;
    }

    const exit = level.exit;
    const insideExit = thief.x > exit.x && thief.x < exit.x + exit.w && thief.y > exit.y && thief.y < exit.y + exit.h;
    if (insideExit && state.missionHaul >= level.requiredValue) {
      state.missionDone = true;
      return events | EVENT_MISSION_DONE;
    }

    if (state.alarm >= ALARM_MAX) {
      state.caught = true;
      return events | EVENT_CAUGHT;
    }
    return events;
  }

  return { state, reset, loadMission, step, tryUseTool };
}

export function remainingLootValue(level) {
  return level.loot.filter((piece) => !piece.taken).reduce((sum, piece) => sum + piece.value, 0);
}

export function missionObjective(level, missionHaul) {
  const target = level.loot.find((piece) => piece.value === level.requiredValue);
  const main = target && !target.taken ? `Steal the ${target.label}` : 'Reach the exit';
  return `${main} — $${missionHaul} / $${level.requiredValue} to escape`;
}
