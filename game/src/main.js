// Boot and the one loop for The Velvet Vault Job: input is read every frame, the
// world advances in fixed 1/60 s steps, and the renderer paints what is there.
// Screens: title, briefing (buy tools), play, paused, caught, mission done, win.
//
// ?seed=N fixes the patrol drift. ?shot=start|play|heist|end (with &seed=N) stages
// that scene instead of running the loop, paints it twice and sets
// window.__shotReady so a screenshot tool knows the frame is settled.
import { FIXED_STEP, MISSION_BONUS, MISSION_PAR, TOOL_START_BUDGET } from './config.js';
import { createSeededRandom } from './rng.js';
import { createWorld, EVENT_CAUGHT, EVENT_LOOT, EVENT_MISSION_DONE, EVENT_SPOTTED, EVENT_TOOL_USED } from './world.js';
import { PRESS_CONFIRM, PRESS_PAUSE, PRESS_TOOL_DISGUISE, PRESS_TOOL_EMP, PRESS_TOOL_LOCKPICK, PRESS_TOOL_SMOKE, createInput } from './input.js';
import { createSoundBank } from './audio.js';
import { loadSave, recordRun } from './save.js';
import { TOOL_CATALOGUE } from './tools.js';
import { createRenderer, SCREEN_BRIEFING, SCREEN_CAUGHT, SCREEN_MISSION_DONE, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const MISSION_TIME_BONUS = 1;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createSeededRandom(seed));
const renderer = createRenderer(canvas);
const sounds = createSoundBank();

function runShot(name) {
  const scene = stageShot(name, world);
  const ui = { bestHaul: scene.best, jobsFinished: 0, budget: 0, tools: world.state.tools, peakAlarm: scene.peakAlarm, quietSeconds: world.state.quietSeconds };
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, ui);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let save = loadSave();
  let budget = TOOL_START_BUDGET;
  let tools = { smoke: 1, emp: 1, lockpick: 1, disguise: 0 };
  let peakAlarm = 0;
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function uiState() {
    return { bestHaul: save.bestHaul, jobsFinished: save.jobsFinished, budget, tools, peakAlarm, quietSeconds: world.state.quietSeconds };
  }

  function openBriefing(missionIndex) {
    world.loadMission(missionIndex, tools, budget, world.state.haul);
    screen = SCREEN_BRIEFING;
    announce(`${world.state.level.name}. Buy tools, then press Space to start.`);
  }

  function startMission() {
    world.loadMission(world.state.missionIndex, tools, budget, world.state.haul);
    screen = SCREEN_PLAY;
    sounds.unlock();
    announce(`Playing ${world.state.level.name}.`);
  }

  function finishMission() {
    const timeBonus = Math.max(0, MISSION_PAR[world.state.missionIndex] - Math.floor(world.state.elapsed)) * MISSION_TIME_BONUS;
    world.state.haul += MISSION_BONUS[world.state.missionIndex] + timeBonus;
    budget += Math.floor(world.state.missionHaul / 2);
    save = recordRun(save, world.state.haul, world.state.quietSeconds, world.state.missionIndex + 1);
    sounds.escapeWin();
    if (world.state.missionIndex >= 2) {
      screen = SCREEN_WIN;
      announce(`All jobs done. Final haul $${world.state.haul}.`);
    } else {
      screen = SCREEN_MISSION_DONE;
      announce(`Job done. Haul $${world.state.haul}. Press Space for the next job.`);
    }
  }

  function failMission() {
    save = recordRun(save, world.state.haul, world.state.quietSeconds, world.state.missionIndex);
    sounds.caughtSting();
    screen = SCREEN_CAUGHT;
    announce(`Caught. Haul $${world.state.haul}. Press Space to retry.`);
  }

  function buyTool(kind) {
    const entry = TOOL_CATALOGUE.find((tool) => tool.kind === kind);
    if (!entry || budget < entry.price) return;
    budget -= entry.price;
    tools[kind] = (tools[kind] ?? 0) + 1;
    sounds.clickUi();
  }

  function handlePresses() {
    const presses = input.takePresses();
    if (presses & PRESS_CONFIRM) sounds.unlock();
    if (screen === SCREEN_TITLE && presses & PRESS_CONFIRM) {
      world.reset(seed);
      tools = { smoke: 1, emp: 1, lockpick: 1, disguise: 0 };
      budget = TOOL_START_BUDGET;
      openBriefing(0);
      return;
    }
    if (screen === SCREEN_BRIEFING) {
      if (presses & PRESS_TOOL_SMOKE) buyTool('smoke');
      if (presses & PRESS_TOOL_EMP) buyTool('emp');
      if (presses & PRESS_TOOL_LOCKPICK) buyTool('lockpick');
      if (presses & PRESS_TOOL_DISGUISE) buyTool('disguise');
      if (presses & PRESS_CONFIRM) startMission();
      return;
    }
    if (screen === SCREEN_PLAY) {
      if (presses & PRESS_TOOL_SMOKE) world.tryUseTool('smoke');
      if (presses & PRESS_TOOL_EMP) world.tryUseTool('emp');
      if (presses & PRESS_TOOL_LOCKPICK) world.tryUseTool('lockpick');
      if (presses & PRESS_TOOL_DISGUISE) world.tryUseTool('disguise');
      if (presses & PRESS_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      }
      return;
    }
    if (screen === SCREEN_PAUSED && (presses & (PRESS_PAUSE | PRESS_CONFIRM))) {
      screen = SCREEN_PLAY;
      announce('Playing.');
      return;
    }
    if (screen === SCREEN_CAUGHT && presses & PRESS_CONFIRM) {
      tools = { smoke: 1, emp: 1, lockpick: 1, disguise: 0 };
      budget = TOOL_START_BUDGET;
      world.reset(seed);
      openBriefing(0);
      return;
    }
    if (screen === SCREEN_MISSION_DONE && presses & PRESS_CONFIRM) {
      openBriefing(world.state.missionIndex + 1);
      return;
    }
    if (screen === SCREEN_WIN && presses & PRESS_CONFIRM) {
      world.reset(seed);
      tools = { smoke: 1, emp: 1, lockpick: 1, disguise: 0 };
      budget = TOOL_START_BUDGET;
      screen = SCREEN_TITLE;
      announce('The Velvet Vault Job. Press Space or click to start.');
    }
  }

  function stepWorld() {
    if (screen === SCREEN_TITLE) {
      world.step(FIXED_STEP, { x: 0, y: 0 }, false);
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    const events = world.step(FIXED_STEP, input.movementVector(), input.isSneaking());
    peakAlarm = Math.max(peakAlarm, world.state.alarm);
    if (events & EVENT_LOOT) sounds.pickupLoot();
    if (events & EVENT_TOOL_USED) sounds.toolPop();
    if (events & EVENT_SPOTTED) sounds.spotted();
    if (events & EVENT_CAUGHT) failMission();
    else if (events & EVENT_MISSION_DONE) finishMission();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handlePresses();
    while (accumulator >= FIXED_STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
      stepWorld();
      accumulator -= FIXED_STEP;
    }
    if (screen !== SCREEN_TITLE && screen !== SCREEN_PLAY) accumulator = 0;
    renderer.draw(world.state, screen, uiState());
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  world.reset(seed);
  announce('The Velvet Vault Job. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
