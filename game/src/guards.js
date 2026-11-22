// Guards and cameras: patrol waypoints, sweeping vision cones and the line-of-sight
// test that decides whether the thief is seen. A cone alone is not enough — a wall
// between the watcher and the thief blocks the view.
import { CAMERA_HALF_ANGLE, CAMERA_RANGE, CONE_HALF_ANGLE, CONE_RANGE, GUARD_RADIUS } from './config.js';
import { segmentBlocked } from './world.js';

function angleDifference(a, b) {
  let diff = a - b;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function insideCone(fromX, fromY, facing, range, halfAngle, targetX, targetY) {
  const dx = targetX - fromX;
  const dy = targetY - fromY;
  const distance = Math.hypot(dx, dy);
  if (distance > range) return { seen: false, distance };
  const angleTo = Math.atan2(dy, dx);
  if (Math.abs(angleDifference(angleTo, facing)) > halfAngle) return { seen: false, distance };
  return { seen: true, distance };
}

export function moveGuardAlongPatrol(guard, dt, walls, timeScale = 1) {
  if (guard.pauseLeft > 0) {
    guard.pauseLeft -= dt;
    return;
  }
  const target = guard.waypoints[guard.waypointIndex];
  const dx = target[0] - guard.x;
  const dy = target[1] - guard.y;
  const distance = Math.hypot(dx, dy);
  const speed = guard.speed * timeScale;
  if (distance < 6) {
    guard.waypointIndex = (guard.waypointIndex + 1) % guard.waypoints.length;
    guard.pauseLeft = guard.pauseSeconds;
    return;
  }
  const stepX = (dx / distance) * speed * dt;
  const stepY = (dy / distance) * speed * dt;
  guard.x += stepX;
  guard.y += stepY;
  guard.facing = Math.atan2(dy, dx);
}

export function guardSeesThief(guard, thief, walls, disguised, sneaking) {
  const range = CONE_RANGE * (sneaking ? 0.72 : 1);
  const result = insideCone(guard.x, guard.y, guard.facing, range, CONE_HALF_ANGLE, thief.x, thief.y);
  if (!result.seen) return result;
  if (disguised && result.distance > 70) return { seen: false, distance: result.distance };
  if (segmentBlocked(guard.x, guard.y, thief.x, thief.y, walls)) return { seen: false, distance: result.distance };
  return result;
}

export function cameraSeesThief(camera, angle, thief, walls, sneaking) {
  const range = CAMERA_RANGE * (sneaking ? 0.8 : 1);
  const result = insideCone(camera.x, camera.y, angle, range, CAMERA_HALF_ANGLE, thief.x, thief.y);
  if (!result.seen) return result;
  if (segmentBlocked(camera.x, camera.y, thief.x, thief.y, walls)) return { seen: false, distance: result.distance };
  return result;
}

export function guardConePoints(guard) {
  return conePoints(guard.x, guard.y, guard.facing, CONE_RANGE, CONE_HALF_ANGLE);
}

export function cameraConePoints(camera, angle) {
  return conePoints(camera.x, camera.y, angle, CAMERA_RANGE, CAMERA_HALF_ANGLE);
}

function conePoints(x, y, facing, range, halfAngle) {
  const points = [{ x, y }];
  const steps = 14;
  for (let i = 0; i <= steps; i += 1) {
    const angle = facing - halfAngle + (2 * halfAngle * i) / steps;
    points.push({ x: x + Math.cos(angle) * range, y: y + Math.sin(angle) * range });
  }
  return points;
}
