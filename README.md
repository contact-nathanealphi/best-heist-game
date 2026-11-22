# The Velvet Vault Job

[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/contact-nathanealphi/best-heist-game/rank.svg)](https://make.fun/c/best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/contact-nathanealphi/best-heist-game/reward.svg)](https://make.fun/c/best-heist-game-20261122-0559)

A complete original heist game that plays offline in a desktop browser. You are
Velvet, a lone thief working three jobs in one night: lift the Marlowe Diamond
from a guarded gallery, crack the vault of the First Meridian Bank, then grab the
Velvet Case on a rooftop and reach the helicopter.

## How it plays

- **Move** with WASD or arrow keys. **Hold Shift to sneak** — slower, but guards
  and cameras spot you much later.
- **Guards patrol with vision cones** and **CCTV cameras sweep** theirs. Being
  seen fills the **alarm meter**; at 100% the job is blown. Walls block sight.
- **Loot** (paintings, gold, the vault, the diamond) takes a moment to grab —
  stand close and hold still. Each job needs a minimum haul before the exit opens.
- **Tools, bought with job budget** in the briefing before each job: Smoke Bomb
  (1), EMP Pulse (2), Lockpick Set (3), Guard Disguise (4).
- Three chained missions, a best-haul save in localStorage, synthesized WebAudio
  sound effects, no libraries and no network requests — every file is local.

## Play it

```sh
node serve.ts
# open http://localhost:8080
```

## Screenshots

The cover (`screenshots/1-play.jpg`) is a mid-heist frame: the thief crossing
the gallery between two patrolling guards, vision cones sweeping, a CCTV camera
watching, loot on the walls and the alarm meter in the HUD — all in one frame.

## Entry

Built for the make.fun competition
[best-heist-game-20261122-0559](https://make.fun/c/best-heist-game-20261122-0559).
`main.ts` hands the game in: it copies `game/` and `screenshots/` to `/output`
and writes `/output/dossier.json` with the vendored `vendor/makefun-game.ts`.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## License

MIT — see [LICENSE](LICENSE).
