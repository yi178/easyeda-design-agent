import { assertSchematicSnapshotShape, DESIGN_GRAPH_SCHEMA_VERSION } from '../../design-ir/src/schema.mjs';

function pointKey(point) {
  return `${point.sheetId}:${point.x},${point.y}`;
}

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

class DisjointSet {
  constructor() {
    this.parents = new Map();
  }

  add(value) {
    if (!this.parents.has(value))
      this.parents.set(value, value);
  }

  find(value) {
    this.add(value);
    const parent = this.parents.get(value);
    if (parent === value)
      return value;
    const root = this.find(parent);
    this.parents.set(value, root);
    return root;
  }

  union(left, right) {
    const leftRoot = this.find(left);
    const rightRoot = this.find(right);
    if (leftRoot !== rightRoot)
      this.parents.set(rightRoot, leftRoot);
  }
}

function normalizeExplicitNets(snapshot) {
  return snapshot.nets.map(net => ({
    id: `net:${net.name}`,
    name: net.name,
    kind: inferNetKind(net.name),
    endpoints: net.endpoints,
    endpointKeys: net.endpoints.map(endpointKey),
    source: 'explicit',
  }));
}

function inferNetsFromGeometry(snapshot) {
  const dsu = new DisjointSet();
  const pointToEndpoints = new Map();
  const labelsByPoint = new Map();

  for (const pin of snapshot.pins) {
    const key = pointKey(pin);
    const endpoint = { ref: pin.ref, pin: pin.pinNumber };
    dsu.add(key);
    if (!pointToEndpoints.has(key))
      pointToEndpoints.set(key, []);
    pointToEndpoints.get(key).push(endpoint);
  }

  for (const wire of snapshot.wires ?? []) {
    const points = wire.points ?? [];
    for (let index = 0; index < points.length - 1; index += 1) {
      const left = pointKey({ sheetId: wire.sheetId, x: points[index][0], y: points[index][1] });
      const right = pointKey({ sheetId: wire.sheetId, x: points[index + 1][0], y: points[index + 1][1] });
      dsu.union(left, right);
    }
  }

  for (const label of snapshot.labels ?? []) {
    const key = pointKey(label);
    dsu.add(key);
    if (!labelsByPoint.has(key))
      labelsByPoint.set(key, []);
    labelsByPoint.get(key).push(label.name);
  }

  const groupEndpoints = new Map();
  const groupNames = new Map();

  for (const [key, endpoints] of pointToEndpoints.entries()) {
    const root = dsu.find(key);
    if (!groupEndpoints.has(root))
      groupEndpoints.set(root, []);
    groupEndpoints.get(root).push(...endpoints);
  }

  for (const [key, names] of labelsByPoint.entries()) {
    const root = dsu.find(key);
    if (!groupNames.has(root))
      groupNames.set(root, new Set());
    for (const name of names)
      groupNames.get(root).add(name);
  }

  const netsByName = new Map();
  let anonymousIndex = 1;
  for (const [root, endpoints] of groupEndpoints.entries()) {
    const names = Array.from(groupNames.get(root) ?? []);
    const name = names[0] ?? `N$${anonymousIndex++}`;
    if (!netsByName.has(name)) {
      netsByName.set(name, {
        id: `net:${name}`,
        name,
        kind: inferNetKind(name),
        endpoints: [],
        endpointKeys: [],
        source: names.length > 0 ? 'label-inferred' : 'geometry-inferred',
      });
    }
    const net = netsByName.get(name);
    for (const endpoint of endpoints) {
      const key = endpointKey(endpoint);
      if (!net.endpointKeys.includes(key)) {
        net.endpoints.push(endpoint);
        net.endpointKeys.push(key);
      }
    }
  }

  return Array.from(netsByName.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function buildSchematicGraph(snapshot) {
  const shape = assertSchematicSnapshotShape(snapshot);
  if (!shape.ok)
    throw new Error(`Invalid schematic snapshot: ${shape.errors.join('; ')}`);

  const pinsByRef = new Map();
  for (const pin of snapshot.pins) {
    if (!pinsByRef.has(pin.ref))
      pinsByRef.set(pin.ref, []);
    pinsByRef.get(pin.ref).push(pin);
  }

  const components = snapshot.components.map(component => ({
    id: `component:${component.ref}`,
    uuid: component.uuid,
    ref: component.ref,
    value: component.value,
    device: component.device,
    kind: inferComponentKind(component),
    sheetId: component.sheetId,
    pins: pinsByRef.get(component.ref) ?? [],
  }));

  const nets = Array.isArray(snapshot.nets) && snapshot.nets.length > 0
    ? normalizeExplicitNets(snapshot)
    : inferNetsFromGeometry(snapshot);

  const endpointToNet = {};
  for (const net of nets) {
    for (const endpoint of net.endpoints)
      endpointToNet[endpointKey(endpoint)] = net.name;
  }

  const noConnectKeys = new Set((snapshot.noConnects ?? []).map(item => endpointKey(item)));
  const connectedEndpointKeys = new Set(Object.keys(endpointToNet));
  const unconnectedPins = snapshot.pins
    .filter(pin => !connectedEndpointKeys.has(endpointKey({ ref: pin.ref, pin: pin.pinNumber })))
    .filter(pin => !noConnectKeys.has(endpointKey({ ref: pin.ref, pin: pin.pinNumber })))
    .map(pin => ({ ref: pin.ref, pin: pin.pinNumber }));

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
    kind: 'schematic',
    project: snapshot.project,
    sourceSnapshotId: snapshot.snapshotId,
    sheets: snapshot.sheets,
    components,
    nets,
    endpointToNet,
    powerTree,
    unconnectedPins,
    erc: snapshot.erc ?? [],
    metrics: {
      componentCount: components.length,
      pinCount: snapshot.pins.length,
      wireCount: (snapshot.wires ?? []).length,
      labelCount: (snapshot.labels ?? []).length,
      netCount: nets.length,
      endpointCount: nets.reduce((total, net) => total + net.endpoints.length, 0),
      unconnectedPinCount: unconnectedPins.length,
      ercViolationCount: (snapshot.erc ?? []).length,
      placedComponentCount: 0,
    },
  };
}
