import { mkdir, readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { buildDesignGraph } from '../packages/graph-engine/src/index.mjs';
import { runValidators } from '../packages/validators/src/index.mjs';

function assert(condition, message) {
  if (!condition)
    throw new Error(message);
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit', shell: process.platform === 'win32' });
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited with ${code}`)));
    child.on('error', reject);
  });
}

async function main() {
  const snapshot = JSON.parse(await readFile('fixtures/snapshots/stm32-minimal-snapshot.json', 'utf8'));
  const graph = buildDesignGraph(snapshot);
  const validation = runValidators(graph);

  assert(graph.metrics.componentCount === 13, `expected 13 components, got ${graph.metrics.componentCount}`);
  assert(graph.metrics.netCount === 7, `expected 7 nets, got ${graph.metrics.netCount}`);
  assert(graph.metrics.endpointCount === 37, `expected 37 endpoints, got ${graph.metrics.endpointCount}`);
  assert(validation.ok, `validation should pass: ${validation.issues.map(issue => issue.id).join(', ')}`);

  await mkdir('runs/eval-smoke', { recursive: true });
  await runCommand('node', ['apps/cli/src/index.mjs', 'fixtures/snapshots/stm32-minimal-snapshot.json', 'runs/eval-smoke']);

  console.log('evals passed');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

