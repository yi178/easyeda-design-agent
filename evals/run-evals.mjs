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
  await runSchematicReadbackEval(
    'fixtures/schematic/stm32-minimal-schematic.json',
    'fixtures/schematic/stm32-minimal-expected-summary.json',
  );
  await runSchematicReadbackEval(
    'fixtures/schematic/label-inference-schematic.json',
    'fixtures/schematic/label-inference-expected-summary.json',
  );
  await runCommand('node', ['apps/cli/src/index.mjs', 'fixtures/schematic/stm32-minimal-schematic.json', 'runs/schematic-stm32-review']);

  console.log('evals passed');
}

function sortedEndpointKeys(net) {
  return net.endpoints.map(endpoint => `${endpoint.ref}.${endpoint.pin}`).sort();
}

async function runSchematicReadbackEval(snapshotPath, expectedPath) {
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const expected = JSON.parse(await readFile(expectedPath, 'utf8'));
  const graph = buildDesignGraph(snapshot);
  const validation = runValidators(graph);

  assert(graph.kind === 'schematic', `${snapshotPath}: expected schematic graph`);
  assert(graph.metrics.componentCount === expected.componentCount, `${snapshotPath}: component count mismatch`);
  assert(graph.metrics.pinCount === expected.pinCount, `${snapshotPath}: pin count mismatch`);
  assert(graph.metrics.netCount === expected.netCount, `${snapshotPath}: net count mismatch`);
  assert(graph.metrics.endpointCount === expected.endpointCount, `${snapshotPath}: endpoint count mismatch`);
  assert(graph.metrics.unconnectedPinCount === 0, `${snapshotPath}: expected no unconnected pins`);
  assert(validation.ok, `${snapshotPath}: validation should pass: ${validation.issues.map(issue => issue.id).join(', ')}`);

  for (const [netName, endpointKeys] of Object.entries(expected.requiredNets)) {
    const net = graph.nets.find(item => item.name === netName);
    assert(net, `${snapshotPath}: missing net ${netName}`);
    const actual = sortedEndpointKeys(net);
    const expectedSorted = [...endpointKeys].sort();
    assert(JSON.stringify(actual) === JSON.stringify(expectedSorted), `${snapshotPath}: endpoint mismatch for ${netName}: ${actual.join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
