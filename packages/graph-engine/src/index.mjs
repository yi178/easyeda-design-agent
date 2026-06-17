import { assertSnapshotShape, DESIGN_GRAPH_SCHEMA_VERSION } from '../../design-ir/src/schema.mjs';

function endpointKey(endpoint) {
  return `${endpoint.ref}.${endpoint.pin}`;
}

function inferNetKind(name) {
  const upper = name.toUpperCase();
  if (upper === 'GND' || upper.includes('PGND') || upper.includes('AGND'))
    return 'ground';
  if (upper.startsWith('+') || upper.includes('VDD') || upper.includes('VCC') || upper.includes('VDDA'))
    return 'power';
  if (upper.includes('OSC'))
    return 'clock';
  if (upper.includes('BOOT') || upper.includes('NRST') || upper.includes('RESET'))
    return 'control';
  return 'signal';
}

function inferComponentKind(component) {
  const ref = component.ref.toUpperCase();
  const value = String(component.value ?? '').toUpperCase();
  if (ref.startsWith('U'))
    return 'ic';
  if (ref.startsWith('C'))
    return 'capacitor';
  if (ref.startsWith('R'))
    return 'resistor';
  if (ref.startsWith('Y') || value.includes('MHZ'))
    return 'crystal';
  if (ref.startsWith('J') || ref.startsWith('P'))
    return 'connector';
  return 'component';
}

export function buildDesignGraph(snapshot) {
  const shape = assertSnapshotShape(snapshot);
  if (!shape.ok)
    throw new Error(`Invalid snapshot: ${shape.errors.join('; ')}`);

  const components = snapshot.components.map(component => ({
    id: `component:${component.ref}`,
    ref: component.ref,
    value: component.value,
    device: component.device,
    kind: inferComponentKind(component),
    pins: component.pins ?? [],
    placement: snapshot.board.placements?.find(item => item.ref === component.ref),
  }));

  const nets = snapshot.nets.map(net => ({
    id: `net:${net.name}`,
    name: net.name,
    kind: inferNetKind(net.name),
    endpoints: net.endpoints,
    endpointKeys: net.endpoints.map(endpointKey),
  }));

  const endpointToNet = {};
  for (const net of nets) {
    for (const endpoint of net.endpoints)
      endpointToNet[endpointKey(endpoint)] = net.name;
  }

  const powerTree = nets
    .filter(net => net.kind === 'power' || net.kind === 'ground')
    .map(net => ({
      net: net.name,
      kind: net.kind,
      endpointCount: net.endpoints.length,
      components: Array.from(new Set(net.endpoints.map(endpoint => endpoint.ref))).sort(),
    }));

  return {
    schemaVersion: DESIGN_GRAPH_SCHEMA_VERSION,
    project: snapshot.project,
    sourceSnapshotId: snapshot.snapshotId,
    components,
    nets,
    endpointToNet,
    powerTree,
    metrics: {
      componentCount: components.length,
      netCount: nets.length,
      endpointCount: nets.reduce((total, net) => total + net.endpoints.length, 0),
      placedComponentCount: components.filter(component => component.placement).length,
    },
  };
}

