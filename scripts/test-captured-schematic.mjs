import { readFile } from 'node:fs/promises';
import { buildDesignGraph } from '../packages/graph-engine/src/index.mjs';
import { runValidators } from '../packages/validators/src/index.mjs';

function assert(condition, message) {
  if (!condition)
    throw new Error(message);
}

function sortedEndpointKeys(net) {
  return net.endpoints.map(endpoint => `${endpoint.ref}.${endpoint.pin}`).sort();
}

function usage() {
  return [
    'Usage:',
    '  npm run test:schematic-captured -- <snapshot.json> [expected-summary.json]',
    '',
    'Example:',
    '  npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot.json fixtures/schematic/stm32-minimal-expected-summary.json',
  ].join('\n');
}

async function main() {
  const [, , snapshotPath, expectedPath = 'fixtures/schematic/stm32-minimal-expected-summary.json'] = process.argv;
  if (!snapshotPath) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const expected = JSON.parse(await readFile(expectedPath, 'utf8'));
  const graph = buildDesignGraph(snapshot);
  const validation = runValidators(graph);

  assert(snapshot.kind === 'schematic', 'snapshot.kind must be schematic');
  assert(typeof snapshot.fingerprint === 'string' && snapshot.fingerprint.length > 0, 'snapshot.fingerprint is required');
  assert(graph.kind === 'schematic', 'expected schematic graph');
  assert(graph.metrics.componentCount === expected.componentCount, `component count mismatch: expected ${expected.componentCount}, got ${graph.metrics.componentCount}`);
  assert(graph.metrics.pinCount === expected.pinCount, `pin count mismatch: expected ${expected.pinCount}, got ${graph.metrics.pinCount}`);
  assert(graph.metrics.netCount === expected.netCount, `net count mismatch: expected ${expected.netCount}, got ${graph.metrics.netCount}`);
  assert(graph.metrics.endpointCount === expected.endpointCount, `endpoint count mismatch: expected ${expected.endpointCount}, got ${graph.metrics.endpointCount}`);
  assert(validation.ok, `validation failed: ${validation.issues.map(issue => issue.id).join(', ')}`);

  for (const [netName, endpointKeys] of Object.entries(expected.requiredNets)) {
    const net = graph.nets.find(item => item.name === netName);
    assert(net, `missing net ${netName}`);
    const actual = sortedEndpointKeys(net);
    const expectedSorted = [...endpointKeys].sort();
    assert(JSON.stringify(actual) === JSON.stringify(expectedSorted), `endpoint mismatch for ${netName}: ${actual.join(', ')}`);
  }

  console.log('captured schematic snapshot passed');
  console.log(`fingerprint: ${snapshot.fingerprint}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

