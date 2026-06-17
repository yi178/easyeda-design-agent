#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { readJson, snapshotToEasyedaStd, writeJson } from './lib/easyeda-std.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/snapshot-to-easyeda-std.mjs <snapshot.json> <SCH.roundtrip.json> [--regenerate-labels]',
    '',
    'Example:',
    '  node scripts/snapshot-to-easyeda-std.mjs runs/roundtrip/openspool-daughterboard/snapshot.json runs/roundtrip/openspool-daughterboard/SCH.roundtrip.json',
  ].join('\n');
}

async function main() {
  const [, , snapshotPath, outPath, ...flags] = process.argv;
  if (!snapshotPath || !outPath) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const snapshot = await readJson(snapshotPath);
  const easyedaStd = snapshotToEasyedaStd(snapshot, {
    regenerateLabels: flags.includes('--regenerate-labels'),
  });
  await mkdir(dirname(outPath), { recursive: true });
  await writeJson(outPath, easyedaStd);

  const shapeCount = (easyedaStd.schematics ?? [])
    .reduce((total, sheet) => total + (Array.isArray(sheet?.dataStr?.shape) ? sheet.dataStr.shape.length : 0), 0);
  console.log('easyeda standard schematic generated');
  console.log(`input: ${snapshotPath}`);
  console.log(`output: ${outPath}`);
  console.log(`sheets: ${(easyedaStd.schematics ?? []).length}`);
  console.log(`shapes: ${shapeCount}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
