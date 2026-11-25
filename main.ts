// Smokehouse BBQ — the hand-in program (Node 22, standard library only).
//
// It gathers this repo's game/ and screenshots/ into the output directory and writes
// output/dossier.json through the vendored make.fun library, so the gate can check
// the game and the judge can read it. Outside the grader, MAKEFUN_OUTPUT_DIR stands
// in for /output:
//   MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier as writeDossier } from './vendor/makefun-game.ts';

function handIn() {
  const rootDir = fileURLToPath(new URL('.', import.meta.url));
  const destDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

  for (const folder of ['game', 'screenshots']) {
    const src = join(rootDir, folder);
    if (!existsSync(src) || !statSync(src).isDirectory()) {
      throw new Error(`missing ${folder}/ beside main.ts`);
    }
  }

  mkdirSync(destDir, { recursive: true });
  cpSync(join(rootDir, 'game'), join(destDir, 'game'), { recursive: true });
  mkdirSync(join(destDir, 'screenshots'), { recursive: true });
  cpSync(join(rootDir, 'screenshots'), join(destDir, 'screenshots'), { recursive: true });

  // The caps mirror the scorer's own limits (see the kit's reference/gate.json):
  // at most 4 screenshots of 256 KiB each, at most 993 game files totalling 48 MiB,
  // and the dossier text capped at 160 KiB.
  const dossier = writeDossier(destDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(destDir, 'dossier.json'), dossier);
}

handIn();
