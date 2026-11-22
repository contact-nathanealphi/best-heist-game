// Everything the player sees: the room, the cones, the loot, the thief, the HUD
// and every screen (title, briefing, play, caught, mission done, getaway win).
// Drawing is the only job here; rules live in world.js and guards.js.
import { ALARM_MAX, HUD_HEIGHT, VIEW_HEIGHT, VIEW_WIDTH } from './config.js';
import { cameraConePoints, guardConePoints } from './guards.js';
import { missionObjective } from './world.js';
import { TOOL_CATALOGUE, toolDisplayName } from './tools.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_BRIEFING = 'briefing';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_CAUGHT = 'caught';
export const SCREEN_MISSION_DONE = 'mission-done';
export const SCREEN_WIN = 'win';

const LOOT_GLYPHS = { diamond: '◆', painting: '▣', gold: '▤', cash: '$', vault: '▦', case: '▣', gem: '◆' };
const LOOT_COLORS = { diamond: '#7fe7ff', painting: '#ffd27f', gold: '#ffcf3d', cash: '#9be36d', vault: '#e8b64c', case: '#ff9d6b', gem: '#c99aff' };

function roundRect(ctx, x, y, w, h, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawCone(ctx, points, fill) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawWall(ctx, w) {
  ctx.fillStyle = '#171a26';
  ctx.fillRect(w.x, w.y, w.w, w.h);
  ctx.fillStyle = '#2c3048';
  ctx.fillRect(w.x, w.y, w.w, 4);
  ctx.fillRect(w.x, w.y, 4, w.h);
}

function drawLoot(ctx, piece, time) {
  const bob = Math.sin(time * 2 + piece.x * 0.01) * 2;
  const glyph = LOOT_GLYPHS[piece.kind] ?? '◆';
  const color = LOOT_COLORS[piece.kind] ?? '#ffd27f';
  ctx.save();
  ctx.translate(piece.x, piece.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(0, 14, 20, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1a1206';
  ctx.font = 'bold 16px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(glyph, 0, 1);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`$${piece.value}`, 0, -26);
  if (piece.progress > 0 && piece.progress < piece.grabTime) {
    ctx.fillStyle = '#20242f';
    ctx.fillRect(-20, 20, 40, 6);
    ctx.fillStyle = '#ffd24d';
    ctx.fillRect(-20, 20, 40 * (piece.progress / piece.grabTime), 6);
  }
  ctx.restore();
}

function drawGuard(ctx, guard, time) {
  const points = guardConePoints(guard);
  const hot = guard.alert > 0;
  drawCone(ctx, points, hot ? 'rgba(255,64,64,0.30)' : 'rgba(255,214,80,0.22)');
  ctx.strokeStyle = hot ? 'rgba(255,80,80,0.7)' : 'rgba(255,214,80,0.45)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.stroke();
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.beginPath();
  ctx.ellipse(0, 10, 15, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hot ? '#ff5a5a' : '#4d7dd1';
  ctx.beginPath();
  ctx.arc(0, 0, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#dfe6ff';
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2436';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.facing) * 3, Math.sin(guard.facing) * 3, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('GUARD', 0, -20);
  ctx.restore();
}

function drawCamera(ctx, camera, time) {
  const angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
  const disabled = camera.disabledLeft > 0;
  if (!disabled) {
    const points = cameraConePoints(camera, angle);
    drawCone(ctx, points, 'rgba(255,90,90,0.20)');
    ctx.strokeStyle = 'rgba(255,90,90,0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
    ctx.closePath();
    ctx.stroke();
  }
  ctx.save();
  ctx.translate(camera.x, camera.y);
  ctx.rotate(angle);
  ctx.fillStyle = disabled ? '#5a6272' : '#e5484d';
  roundRect(ctx, -4, -7, 22, 14, 4);
  ctx.fill();
  ctx.fillStyle = disabled ? '#8a93a6' : '#ffd24d';
  ctx.beginPath();
  ctx.arc(19, 0, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = disabled ? '#9aa3b5' : '#ff8a8a';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(disabled ? 'CCTV OFF' : 'CCTV', camera.x, camera.y + 30);
}

function drawThief(ctx, thief, time, disguised) {
  const bob = thief.moving ? Math.sin(time * 10) * 1.5 : 0;
  ctx.save();
  ctx.translate(thief.x, thief.y + bob);
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.beginPath();
  ctx.ellipse(0, 11, 14, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = disguised ? '#4d7dd1' : '#22252f';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = disguised ? '#dfe6ff' : '#ffd24d';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = disguised ? '#dfe6ff' : '#ffd24d';
  ctx.fillRect(-8, -3, 16, 5);
  ctx.fillStyle = '#0c0e14';
  ctx.fillRect(-6, -2, 4, 3);
  ctx.fillRect(2, -2, 4, 3);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(disguised ? 'UNDERCOVER' : 'VELVET', 0, -20);
  ctx.restore();
}

function drawSmoke(ctx, state, time) {
  if (state.smokeLeft <= 0) return;
  const thief = state.thief;
  ctx.save();
  for (let i = 0; i < 9; i += 1) {
    const angle = (i / 9) * Math.PI * 2 + time * 0.4;
    const radius = 46 + Math.sin(time * 2 + i) * 8;
    ctx.fillStyle = 'rgba(180,190,205,0.35)';
    ctx.beginPath();
    ctx.arc(thief.x + Math.cos(angle) * radius * 0.6, thief.y + Math.sin(angle) * radius * 0.6, 26, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawHud(ctx, state, time) {
  const level = state.level;
  ctx.fillStyle = '#10121c';
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = '#2c3048';
  ctx.fillRect(0, HUD_HEIGHT - 2, VIEW_WIDTH, 2);
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#ffd24d';
  ctx.font = 'bold 20px sans-serif';
  ctx.fillText(`◆ $${state.haul}`, 24, 24);
  ctx.fillStyle = '#c9cede';
  ctx.font = '14px sans-serif';
  ctx.fillText(`Mission ${state.missionIndex + 1}/3 · ${level.name}`, 24, 48);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ALARM', 560, 16);
  const alarmW = 260;
  const alarmX = 560 - alarmW / 2;
  ctx.fillStyle = '#262a3a';
  roundRect(ctx, alarmX, 26, alarmW, 18, 9);
  ctx.fill();
  const ratio = state.alarm / ALARM_MAX;
  const alarmColor = ratio < 0.4 ? '#57c465' : ratio < 0.7 ? '#ffb02e' : '#ff4d4d';
  if (ratio > 0) {
    ctx.fillStyle = alarmColor;
    roundRect(ctx, alarmX, 26, alarmW * ratio, 18, 9);
    ctx.fill();
  }
  ctx.fillStyle = ratio > 0.7 && Math.sin(time * 10) > 0 ? '#ffffff' : '#ffd2d2';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(`${Math.floor(state.alarm)}%`, 560, 52);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#c9cede';
  ctx.font = '14px sans-serif';
  ctx.fillText(missionObjective(level, state.missionHaul), VIEW_WIDTH - 24, 24);
  const toolsText = TOOL_CATALOGUE.map((tool) => {
    const count = state.tools[tool.kind] ?? 0;
    return `[${tool.key}] ${tool.name} ×${count}`;
  }).join('   ');
  ctx.fillText(toolsText, VIEW_WIDTH - 24, 48);
  const active = [];
  if (state.smokeLeft > 0) active.push(`SMOKE ${state.smokeLeft.toFixed(0)}s`);
  if (state.empLeft > 0) active.push(`EMP ${state.empLeft.toFixed(0)}s`);
  if (state.disguiseLeft > 0) active.push(`DISGUISE ${state.disguiseLeft.toFixed(0)}s`);
  if (active.length) {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#9be36d';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText(active.join(' · '), VIEW_WIDTH / 2, 48);
  }
}

function drawRoom(ctx, state, time) {
  const level = state.level;
  ctx.fillStyle = level.floorTint;
  ctx.fillRect(0, HUD_HEIGHT, VIEW_WIDTH, VIEW_HEIGHT - HUD_HEIGHT);
  ctx.fillStyle = level.carpet;
  ctx.fillRect(120, HUD_HEIGHT + 90, VIEW_WIDTH - 240, VIEW_HEIGHT - HUD_HEIGHT - 180);
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  for (let x = 0; x < VIEW_WIDTH; x += 64) {
    ctx.beginPath();
    ctx.moveTo(x, HUD_HEIGHT);
    ctx.lineTo(x, VIEW_HEIGHT);
    ctx.stroke();
  }
  for (let y = HUD_HEIGHT; y < VIEW_HEIGHT; y += 64) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(VIEW_WIDTH, y);
    ctx.stroke();
  }
  for (const cover of level.covers) {
    ctx.fillStyle = '#3d3a52';
    roundRect(ctx, cover.x, cover.y, cover.w, cover.h, 8);
    ctx.fill();
    ctx.fillStyle = '#8b87a8';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cover.label.toUpperCase(), cover.x + cover.w / 2, cover.y + cover.h / 2 + 4);
  }
  const exit = level.exit;
  const exitReady = state.missionHaul >= level.requiredValue;
  ctx.fillStyle = exitReady ? '#1f7a3a' : '#5a4a1f';
  roundRect(ctx, exit.x, exit.y, exit.w, exit.h, 10);
  ctx.fill();
  ctx.strokeStyle = exitReady ? '#9be36d' : '#ffd24d';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(exit.label, exit.x + exit.w / 2, exit.y + exit.h / 2 - 6);
  ctx.font = '11px sans-serif';
  ctx.fillText(exitReady ? 'OPEN — GO!' : `needs $${level.requiredValue}`, exit.x + exit.w / 2, exit.y + exit.h / 2 + 12);
  for (const w of level.walls) drawWall(ctx, w);
  for (const piece of level.loot) if (!piece.taken) drawLoot(ctx, piece, time);
  for (const camera of level.cameras) drawCamera(ctx, camera, time);
  for (const guard of level.guards) drawGuard(ctx, guard, time);
  drawThief(ctx, state.thief, time, state.disguiseLeft > 0);
  drawSmoke(ctx, state, time);
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(8,10,18,0.78)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
}

function bigTitle(ctx, text, y, color) {
  ctx.fillStyle = color;
  ctx.font = 'bold 64px Georgia, serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_WIDTH / 2, y);
}

function centerText(ctx, text, y, size, color, bold = false) {
  ctx.fillStyle = color;
  ctx.font = `${bold ? 'bold ' : ''}${size}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, VIEW_WIDTH / 2, y);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;

  function draw(state, screen, ui) {
    const time = performance.now() / 1000;
    ctx.clearRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
    if (screen === SCREEN_TITLE) {
      drawRoom(ctx, state, time);
      dimScreen(ctx);
      bigTitle(ctx, 'THE VELVET VAULT JOB', 250, '#ffd24d');
      centerText(ctx, 'Three jobs. One crew of one. Do not get seen.', 330, 22, '#e8eaf2');
      centerText(ctx, 'WASD / arrows to move · SHIFT to sneak · 1-4 tools · P pause', 380, 17, '#aab0c4');
      centerText(ctx, 'Press SPACE or click to plan the first job', 450, 20, '#ffffff', true);
      centerText(ctx, `Best haul $${ui.bestHaul} · Jobs finished ${ui.jobsFinished}`, 520, 15, '#8b87a8');
      centerText(ctx, 'An original game. No network. Everything here is drawn by its own code.', 590, 13, '#6f7488');
      return;
    }
    if (screen === SCREEN_BRIEFING) {
      ctx.fillStyle = '#14161f';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      bigTitle(ctx, 'PLAN THE JOB', 120, '#ffd24d');
      centerText(ctx, `${state.level.name} — ${state.level.brief}`, 190, 18, '#e8eaf2');
      centerText(ctx, `Budget: $${ui.budget} — click a tool to buy it, or press its number key`, 230, 16, '#aab0c4');
      TOOL_CATALOGUE.forEach((tool, index) => {
        const y = 300 + index * 88;
        const owned = ui.tools[tool.kind] ?? 0;
        const afford = ui.budget >= tool.price;
        ctx.fillStyle = '#20242f';
        roundRect(ctx, 240, y, 800, 68, 12);
        ctx.fill();
        ctx.strokeStyle = owned > 0 ? '#9be36d' : '#3a3f55';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`[${tool.key}] ${tool.name} ×${owned}`, 270, y + 22);
        ctx.fillStyle = '#aab0c4';
        ctx.font = '15px sans-serif';
        ctx.fillText(tool.blurb, 270, y + 48);
        ctx.textAlign = 'right';
        ctx.fillStyle = afford ? '#ffd24d' : '#8a6d6d';
        ctx.font = 'bold 20px sans-serif';
        ctx.fillText(`$${tool.price}`, 1010, y + 34);
      });
      centerText(ctx, 'Press SPACE to start the job', 680, 20, '#ffffff', true);
      return;
    }
    drawRoom(ctx, state, time);
    drawHud(ctx, state, time);
    if (screen === SCREEN_PAUSED) {
      dimScreen(ctx);
      bigTitle(ctx, 'PAUSED', 360, '#ffffff');
      centerText(ctx, 'Press P or SPACE to keep sneaking', 440, 20, '#c9cede');
    }
    if (screen === SCREEN_CAUGHT) {
      dimScreen(ctx);
      bigTitle(ctx, 'CAUGHT!', 300, '#ff5a5a');
      centerText(ctx, `The alarm hit ${Math.floor(state.alarm)}% — the crew walks away empty-handed.`, 380, 20, '#e8eaf2');
      centerText(ctx, `Haul kept: $${state.haul} · Best haul: $${ui.bestHaul}`, 430, 18, '#ffd24d');
      centerText(ctx, 'Press SPACE to try the job again', 500, 18, '#ffffff', true);
    }
    if (screen === SCREEN_MISSION_DONE) {
      dimScreen(ctx);
      bigTitle(ctx, 'CLEAN GETAWAY', 300, '#9be36d');
      centerText(ctx, `${state.level.name} cleared — $${state.missionHaul} lifted, alarm peaked at ${Math.floor(ui.peakAlarm)}%.`, 380, 20, '#e8eaf2');
      centerText(ctx, `Total haul so far: $${state.haul}`, 430, 18, '#ffd24d');
      centerText(ctx, 'Press SPACE for the next job', 500, 18, '#ffffff', true);
    }
    if (screen === SCREEN_WIN) {
      dimScreen(ctx);
      bigTitle(ctx, 'THE VELVET VAULT JOB', 250, '#ffd24d');
      centerText(ctx, 'All three jobs done. The crew vanishes into the night.', 330, 22, '#e8eaf2');
      centerText(ctx, `Final haul: $${state.haul}`, 400, 26, '#ffffff', true);
      centerText(ctx, `Best haul: $${ui.bestHaul} · Quiet time: ${Math.floor(ui.quietSeconds)}s`, 450, 17, '#aab0c4');
      centerText(ctx, 'Press SPACE to run it all again', 520, 18, '#ffffff', true);
    }
  }

  return { draw };
}
