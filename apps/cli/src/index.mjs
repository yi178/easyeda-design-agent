#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildDesignGraph } from '../../../packages/graph-engine/src/index.mjs';
import { generateMarkdownReport } from '../../../packages/report-generator/src/index.mjs';
import { runValidators } from '../../../packages/validators/src/index.mjs';

function usage() {
  return [
    'Usage:',
    '  node apps/cli/src/index.mjs <snapshot.json> <out-dir>',
    '',
    'Example:',
    '  node apps/cli/src/index.mjs fixtures/snapshots/stm32-minimal-snapshot.json runs/stm32-minimal-review',
  ].join('\n');
}

async function main() {
  const [, , snapshotPath, outDir] = process.argv;
  if (!snapshotPath || !outDir) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const graph = buildDesignGraph(snapshot);
  const validation = runValidators(graph);
  const report = generateMarkdownReport({ snapshot, graph, validation });

  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'design-graph.json'), `${JSON.stringify(graph, null, 2)}\n`);
  await writeFile(join(outDir, 'validation.json'), `${JSON.stringify(validation, null, 2)}\n`);
  await writeFile(join(outDir, 'report.md'), report);

  console.log(`Report written to ${join(outDir, 'report.md')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

