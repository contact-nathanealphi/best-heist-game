// Keyboard and mouse state for the heist: WASD or arrows to move, Shift to sneak,
// Space or click to confirm, number keys 1-4 to spend a tool, P or Esc to pause.
// The module only reports what is pressed; the world decides what it means.
export const PRESS_CONFIRM = 1;
export const PRESS_PAUSE = 2;
export const PRESS_TOOL_SMOKE = 4;
export const PRESS_TOOL_EMP = 8;
export const PRESS_TOOL_LOCKPICK = 16;
export const PRESS_TOOL_DISGUISE = 32;

const MOVE_KEYS = {
  ArrowUp: [0, -1], KeyW: [0, -1],
  ArrowDown: [0, 1], KeyS: [0, 1],
  ArrowLeft: [-1, 0], KeyA: [-1, 0],
  ArrowRight: [1, 0], KeyD: [1, 0],
};

export function createInput(target) {
  const held = new Set();
  let queued = 0;
  let mousePoint = null;

  function onKeyDown(event) {
    if (event.code === 'Space' || event.code === 'Enter') {
      queued |= PRESS_CONFIRM;
      event.preventDefault();
    }
    if (event.code === 'KeyP' || event.code === 'Escape') queued |= PRESS_PAUSE;
    if (event.code === 'Digit1') queued |= PRESS_TOOL_SMOKE;
    if (event.code === 'Digit2') queued |= PRESS_TOOL_EMP;
    if (event.code === 'Digit3') queued |= PRESS_TOOL_LOCKPICK;
    if (event.code === 'Digit4') queued |= PRESS_TOOL_DISGUISE;
    if (MOVE_KEYS[event.code]) {
      held.add(event.code);
      event.preventDefault();
    }
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.add('Shift');
  }

  function onKeyUp(event) {
    held.delete(event.code);
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') held.delete('Shift');
  }

  function onPointerDown(event) {
    const rect = target.getBoundingClientRect();
    mousePoint = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    queued |= PRESS_CONFIRM;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  target.addEventListener('pointerdown', onPointerDown);

  return {
    movementVector() {
      let x = 0;
      let y = 0;
      for (const code of held) {
        const step = MOVE_KEYS[code];
        if (step) {
          x += step[0];
          y += step[1];
        }
      }
      const length = Math.hypot(x, y);
      if (length === 0) return { x: 0, y: 0 };
      return { x: x / length, y: y / length };
    },
    isSneaking() {
      return held.has('Shift');
    },
    takePresses() {
      const presses = queued;
      queued = 0;
      return presses;
    },
    takeClick() {
      const point = mousePoint;
      mousePoint = null;
      return point;
    },
  };
}
