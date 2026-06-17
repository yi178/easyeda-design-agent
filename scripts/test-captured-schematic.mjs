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

function countWirePointArrays(snapshot) {
  return (snapshot.wires ?? []).filter(wire => Array.isArray(wire.points) && wire.points.length > 0).length;
}

function unique(values) {
  return Array.from(new Set(values));
}

function usage() {
  return [
    'Usage:',
    '  npm run test:schematic-captured -- <snapshot.json>',
    '  npm run test:schematic-captured -- <snapshot.json> <expected-summary.json>',
    '',
    'Example:',
    '  npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot.json',
    '  npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot.json fixtures/schematic/stm32-minimal-expected-summary.json',
  ].join('\n');
}

async function main() {
  const [, , snapshotPath, expectedPath] = process.argv;
  if (!snapshotPath) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const graph = buildDesignGraph(snapshot);
  const validation = runValidators(graph);

  assert(snapshot.kind === 'schematic', 'snapshot.kind must be schematic');
  assert(typeof snapshot.fingerprint === 'string' && snapshot.fingerprint.length > 0, 'snapshot.fingerprint is required');
  assert(graph.kind === 'schematic', 'expected schematic graph');

  if (!expectedPath) {
    runSmokeChecks(snapshot, graph, validation);
    return;
  }

  const expected = JSON.parse(await readFile(expectedPath, 'utf8'));
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

function runSmokeChecks(snapshot, graph, validation) {
  assert(snapshot.project && typeof snapshot.project.name === 'string', 'snapshot.project.name is required');
  assert(Array.isArray(snapshot.components) && snapshot.components.length > 0, 'snapshot.components must be non-empty');
  assert(Array.isArray(snapshot.pins) && snapshot.pins.length > 0, 'snapshot.pins must be non-empty');
  assert(Array.isArray(snapshot.sheets) && snapshot.sheets.length > 0, 'snapshot.sheets must be non-empty');
  assert(graph.metrics.componentCount === snapshot.components.length, 'graph component count must match snapshot component count');
  assert(graph.metrics.pinCount === snapshot.pins.length, 'graph pin count must match snapshot pin count');

  const componentRefs = new Set(snapshot.components.map(component => component.ref));
  const missingPinRefs = unique(snapshot.pins
    .filter(pin => !componentRefs.has(pin.ref))
    .map(pin => pin.ref));
  assert(missingPinRefs.length === 0, `pins reference missing components: ${missingPinRefs.join(', ')}`);

  console.log('captured schematic smoke passed');
  console.log(`project: ${snapshot.project.name}`);
  console.log(`fingerprint: ${snapshot.fingerprint}`);
  console.log(`components: ${snapshot.components.length}`);
  console.log(`pins: ${snapshot.pins.length}`);
  console.log(`wires: ${(snapshot.wires ?? []).length}`);
  console.log(`wires with point arrays: ${countWirePointArrays(snapshot)}`);
  console.log(`labels: ${(snapshot.labels ?? []).length}`);
  console.log(`graph nets: ${graph.metrics.netCount}`);
  console.log(`validator errors: ${validation.issueCounts.error}`);
  console.log(`validator warnings: ${validation.issueCounts.warning}`);

  if ((snapshot.labels ?? []).length === 0)
    console.warn('note: no labels were captured; EasyEDA net label/port API mapping is still incomplete.');
  if ((snapshot.wires ?? []).length > 0 && countWirePointArrays(snapshot) === 0)
    console.warn('note: wires were captured but all point arrays are empty; wire getter mapping is still incomplete.');
  if (!validation.ok)
    console.warn(`note: validators are not expected to pass until labels/nets are captured. Issues: ${validation.issues.map(issue => issue.id).join(', ')}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
