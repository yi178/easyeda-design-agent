#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { easyedaStdToSnapshot, readJson, summarizeSnapshot, writeJson } from './lib/easyeda-std.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/easyeda-std-to-snapshot.mjs <SCH.json> <snapshot.json>',
    '',
    'Example:',
    '  node scripts/easyeda-std-to-snapshot.mjs runs/third-party/easyeda-samples/openspool/hardware/openspool-mini-daughterboard/v1.1/SCH_OpenSpool-Mini-Daughterboard_2025-06-16.json runs/roundtrip/openspool-daughterboard/snapshot.json',
  ].join('\n');
}

async function main() {
  const [, , sourcePath, outPath] = process.argv;
  if (!sourcePath || !outPath) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const source = await readJson(sourcePath);
  const snapshot = easyedaStdToSnapshot(source, { sourcePath });
  await mkdir(dirname(outPath), { recursive: true });
  await writeJson(outPath, snapshot);

  const summary = summarizeSnapshot(snapshot);
  console.log('easyeda standard schematic parsed');
  console.log(`input: ${sourcePath}`);
  console.log(`output: ${outPath}`);
  for (const [key, value] of Object.entries(summary))
    console.log(`${key}: ${value}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
