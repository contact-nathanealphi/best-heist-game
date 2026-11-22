// Shared numbers for The Velvet Vault Job: canvas size, step length, speeds,
// alarm rates, tool costs and the three jobs. Nothing here knows how to draw.
export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 800;
export const HUD_HEIGHT = 64;
export const FIXED_STEP = 1 / 60;
export const SAVE_KEY = 'velvet-vault-save-v1';

export const THIEF_RADIUS = 13;
export const THIEF_WALK_SPEED = 185;
export const THIEF_SNEAK_SPEED = 92;
export const GUARD_RADIUS = 14;
export const GUARD_WALK_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;

export const CONE_RANGE = 235;
export const CONE_HALF_ANGLE = 0.52;
export const CAMERA_RANGE = 260;
export const CAMERA_HALF_ANGLE = 0.46;

export const ALARM_MAX = 100;
export const ALARM_GUARD_RATE = 34;
export const ALARM_CAMERA_RATE = 46;
export const ALARM_SNEAK_FACTOR = 0.45;
export const ALARM_DECAY_RATE = 7;
export const ALARM_NEAR_BONUS = 26;

export const TOOL_PRICES = { smoke: 120, emp: 180, lockpick: 90, disguise: 220 };
export const TOOL_START_BUDGET = 500;
export const SMOKE_SECONDS = 6;
export const EMP_SECONDS = 9;
export const DISGUISE_SECONDS = 10;
export const LOCKPICK_SECONDS = 2.2;
export const GRAB_SECONDS = 1.1;

export const MISSION_NAMES = ['The Marlowe Gallery', 'The First Meridian Bank', 'The Rooftop Getaway'];
export const MISSION_PAR = [150, 210, 180];
export const MISSION_BONUS = [400, 700, 900];
