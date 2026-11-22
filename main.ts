// The Velvet Vault Job — the hand-in program (Node 22, standard library only).
// It gathers the game, its screenshots and the judge's dossier into /output.
// The game itself is plain static files under game/ (game/index.html plus ES
// modules, no library, no network request). Outside the grader's container,
// MAKEFUN_OUTPUT_DIR stands in for /output:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const gameDir = join(outputDir, 'game');
const shotsDir = join(outputDir, 'screenshots');

function copyTree(from, to) {
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outputDir, { recursive: true });
if (existsSync(gameDir)) rmSync(gameDir, { recursive: true, force: true });
if (existsSync(shotsDir)) rmSync(shotsDir, { recursive: true, force: true });
copyTree(join(repoRoot, 'game'), gameDir);
if (existsSync(join(repoRoot, 'screenshots'))) copyTree(join(repoRoot, 'screenshots'), shotsDir);

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the rest refuse an entry the scorer would refuse (more than 4 screenshots
// or one over 256 KiB; more than 993 files in game/ or 48 MiB of game files in all,
// or a path under game/ over 1000 bytes).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
