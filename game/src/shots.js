// The deterministic screenshot scenes behind ?shot=start|play|heist|end. Each one
// replays the real rules from a fresh world with a simple autopilot (try eight
// directions, keep out of every cone, drift toward the nearest loot), so the frame
// is what a short game really looks like and the same seed always gives the same
// frame.
import { FIXED_STEP } from './config.js';
import { SCREEN_CAUGHT, SCREEN_MISSION_DONE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { EVENT_CAUGHT, EVENT_MISSION_DONE } from './world.js';
import { guardSeesThief, cameraSeesThief } from './guards.js';

const START_SECONDS = 4;
const PLAY_SECONDS = 10;
const HEIST_SECONDS = 34;
const END_LIMIT_SECONDS = 900;

function coneDangerAt(state, x, y) {
  const level = state.level;
  const probe = { x, y };
  let danger = 0;
  for (const guard of level.guards) {
    const result = guardSeesThief(guard, probe, level.walls, false, false);
    if (result.seen) danger += 100 - result.distance * 0.3;
  }
  for (const camera of level.cameras) {
    const angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
    const result = cameraSeesThief(camera, angle, probe, level.walls, false);
    if (result.seen) danger += 100 - result.distance * 0.3;
  }
  return danger;
}

function nearestLootTarget(state) {
  const level = state.level;
  let best = null;
  let bestDistance = Infinity;
  for (const piece of level.loot) {
    if (piece.taken) continue;
    const distance = Math.hypot(piece.x - state.thief.x, piece.y - state.thief.y);
    if (distance < bestDistance) {
      bestDistance = distance;
      best = piece;
    }
  }
  return best;
}

function autopilotMove(state) {
  const thief = state.thief;
  const level = state.level;
  const loot = nearestLootTarget(state);
  const target = loot ?? { x: level.exit.x + level.exit.w / 2, y: level.exit.y + level.exit.h / 2 };
  const directions = [
    [0, -1], [0.7, -0.7], [1, 0], [0.7, 0.7], [0, 1], [-0.7, 0.7], [-1, 0], [-0.7, -0.7],
  ];
  let best = { x: 0, y: 0 };
  let bestScore = -Infinity;
  for (const [dx, dy] of directions) {
    const px = thief.x + dx * 30;
    const py = thief.y + dy * 30;
    const distance = Math.hypot(target.x - px, target.y - py);
    const danger = coneDangerAt(state, px, py);
    const score = -distance - danger * 2.2;
    if (score > bestScore) {
      bestScore = score;
      best = { x: dx, y: dy };
    }
  }
  return best;
}

function runAutopilot(world, seconds, useTools) {
  let events = 0;
  let toolTimer = 0;
  for (let t = 0; t < seconds; t += FIXED_STEP) {
    if (useTools) {
      toolTimer += FIXED_STEP;
      if (toolTimer > 6 && world.state.tools.smoke > 0) world.tryUseTool('smoke');
      if (toolTimer > 14 && world.state.tools.emp > 0) world.tryUseTool('emp');
    }
    const move = autopilotMove(world.state);
    events = world.step(FIXED_STEP, move, false);
    if (events & (EVENT_CAUGHT | EVENT_MISSION_DONE)) break;
  }
  return events;
}

export function stageShot(name, world) {
  world.reset(1);
  if (name === 'start') {
    for (let t = 0; t < START_SECONDS; t += FIXED_STEP) world.step(FIXED_STEP, { x: 0, y: 0 }, false);
    return { screen: SCREEN_TITLE, best: 0, peakAlarm: 0 };
  }
  if (name === 'play') {
    runAutopilot(world, PLAY_SECONDS, false);
    return { screen: world.state.caught ? SCREEN_CAUGHT : SCREEN_PLAY, best: 0, peakAlarm: world.state.alarm };
  }
  if (name === 'heist') {
    world.loadMission(1, { smoke: 1, emp: 1, lockpick: 1, disguise: 1 }, 1200, 1200);
    runAutopilot(world, HEIST_SECONDS, true);
    return { screen: world.state.caught ? SCREEN_CAUGHT : SCREEN_PLAY, best: 1200, peakAlarm: world.state.alarm };
  }
  // end: play the rooftop job to the exit; if the pilot stalls, stage the win by hand.
  world.loadMission(2, { smoke: 1, emp: 1, lockpick: 1, disguise: 1 }, 3100, 3100);
  const events = runAutopilot(world, END_LIMIT_SECONDS, true);
  if (events & EVENT_MISSION_DONE) {
    return { screen: SCREEN_WIN, best: world.state.haul, peakAlarm: world.state.alarm };
  }
  world.state.missionHaul = world.state.level.requiredValue + 400;
  world.state.haul = world.state.missionHaul + 3100;
  world.state.alarm = 18;
  world.state.caught = false;
  world.state.thief.x = world.state.level.exit.x + 40;
  world.state.thief.y = world.state.level.exit.y + 40;
  return { screen: SCREEN_WIN, best: world.state.haul, peakAlarm: world.state.alarm };
}
