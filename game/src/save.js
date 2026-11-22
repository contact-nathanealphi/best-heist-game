// Progress that survives a visit: best total haul, best alarm-free streak and which
// jobs are unlocked. Everything is guarded so a blocked localStorage never breaks
// the game; the save is a convenience, not a requirement.
import { SAVE_KEY } from './config.js';

function blankSave() {
  return { bestHaul: 0, bestQuiet: 0, unlockedMission: 0, jobsFinished: 0, plays: 0 };
}

export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return blankSave();
    const parsed = JSON.parse(raw);
    return { ...blankSave(), ...parsed };
  } catch {
    return blankSave();
  }
}

export function storeSave(save) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch {
    // Private windows and disabled storage: the run still counts, it just is not kept.
  }
}

export function recordRun(save, haul, quietSeconds, missionsDone) {
  const next = { ...save };
  next.bestHaul = Math.max(next.bestHaul, haul);
  next.bestQuiet = Math.max(next.bestQuiet, Math.floor(quietSeconds));
  next.unlockedMission = Math.max(next.unlockedMission, Math.min(2, missionsDone));
  next.jobsFinished = Math.max(next.jobsFinished, missionsDone);
  next.plays += 1;
  storeSave(next);
  return next;
}
