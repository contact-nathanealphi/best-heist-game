// The thief's kit: four tools, each bought with job budget in the briefing and each
// spent once per use. The world owns the timers; this file owns the catalogue —
// names, prices, keys and the one-line pitch the briefing shows.
import { TOOL_PRICES } from './config.js';

export const TOOL_SMOKE = 'smoke';
export const TOOL_EMP = 'emp';
export const TOOL_LOCKPICK = 'lockpick';
export const TOOL_DISGUISE = 'disguise';

export const TOOL_CATALOGUE = [
  { kind: TOOL_SMOKE, name: 'Smoke Bomb', key: '1', price: TOOL_PRICES.smoke, blurb: 'A grey cloud. Guards and cameras lose you for 6 seconds.' },
  { kind: TOOL_EMP, name: 'EMP Pulse', key: '2', price: TOOL_PRICES.emp, blurb: 'Kills every camera for 9 seconds. Guards still patrol.' },
  { kind: TOOL_LOCKPICK, name: 'Lockpick Set', key: '3', price: TOOL_PRICES.lockpick, blurb: 'Opens a vault or diamond case instantly, no waiting.' },
  { kind: TOOL_DISGUISE, name: 'Guard Disguise', key: '4', price: TOOL_PRICES.disguise, blurb: 'Look like staff for 10 seconds — unless you walk right up to a guard.' },
];

export function toolByKind(kind) {
  return TOOL_CATALOGUE.find((tool) => tool.kind === kind) ?? null;
}

export function toolDisplayName(kind) {
  return toolByKind(kind)?.name ?? kind;
}
