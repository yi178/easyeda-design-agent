import { fingerprint } from './fingerprint';

declare const eda: any;

interface ReadWarning {
  code: string;
  message: string;
}

interface ReaderState {
  warnings: ReadWarning[];
}

const COMMON_STATE_GETTERS = [
  'getState_PrimitiveId',
  'getState_Uuid',
  'getState_UUID',
  'getState_Id',
  'getState_Name',
  'getState_X',
  'getState_x',
  'getState_Y',
  'getState_y',
  'getState_Rotation',
  'getState_Layer',
  'getState_Locked',
  'getState_Visible',
];

const COMPONENT_STATE_GETTERS = [
  ...COMMON_STATE_GETTERS,
  'getState_Designator',
  'getState_Reference',
  'getState_Value',
  'getState_DeviceName',
  'getState_LibName',
  'getState_Footprint',
  'getState_Package',
  'getState_Prefix',
  'getState_Symbol',
  'getState_Description',
];

const PIN_STATE_GETTERS = [
  ...COMMON_STATE_GETTERS,
  'getState_PinNumber',
  'getState_Number',
  'getState_PinName',
  'getState_ElectricalType',
  'getState_PinType',
  'getState_Net',
  'getState_NetName',
];

const WIRE_STATE_GETTERS = [
  ...COMMON_STATE_GETTERS,
  'getState_Points',
  'getState_PointArr',
  'getState_Path',
  'getState_Shape',
  'getState_Vertexes',
  'getState_Vertices',
  'getState_Polyline',
  'getState_StartX',
  'getState_StartY',
  'getState_EndX',
  'getState_EndY',
  'getState_X1',
  'getState_Y1',
  'getState_X2',
  'getState_Y2',
  'getState_Net',
  'getState_NetName',
];

const LABEL_STATE_GETTERS = [
  ...COMMON_STATE_GETTERS,
  'getState_Net',
  'getState_Text',
  'getState_NetName',
  'getState_Value',
  'getState_PortType',
  'getState_PowerName',
  'getState_NetFlag',
];

function text(value: unknown): string | undefined {
  if (typeof value !== 'string')
    return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

async function tryRead<T>(state: ReaderState, code: string, message: string, reader: () => Promise<T>): Promise<T | undefined> {
  try {
    return await reader();
  }
  catch (error) {
    state.warnings.push({
      code,
      message: `${message}: ${error instanceof Error ? error.message : String(error)}`,
    });
    return undefined;
  }
}

function callGetter(object: any, names: string[]): unknown {
  for (const name of names) {
    const candidate = object?.[name];
    if (typeof candidate === 'function') {
      try {
        const value = candidate.call(object);
        if (value !== undefined && value !== null)
          return value;
      }
      catch {
        // Try the next known getter.
      }
    }
  }
  return undefined;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function safeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function componentRef(component: any): string | undefined {
  return text(callGetter(component, ['getState_Designator', 'getState_Name', 'getState_Reference']));
}

function componentValue(component: any): string | undefined {
  return text(callGetter(component, ['getState_Name', 'getState_Value', 'getState_DeviceName']));
}

function primitiveId(object: any): string | undefined {
  return text(callGetter(object, ['getState_PrimitiveId', 'getState_Uuid', 'getState_UUID', 'getState_Id']));
}

function xOf(object: any): number | undefined {
  return numberValue(callGetter(object, ['getState_X', 'getState_x']));
}

function yOf(object: any): number | undefined {
  return numberValue(callGetter(object, ['getState_Y', 'getState_y']));
}

function readPin(ref: string, sheetId: string, pin: any): Record<string, unknown> {
  return {
    sheetId,
    ref,
    pinNumber: String(callGetter(pin, ['getState_PinNumber', 'getState_Number']) ?? ''),
    pinName: text(callGetter(pin, ['getState_PinName', 'getState_Name'])) ?? '',
    electricalType: text(callGetter(pin, ['getState_ElectricalType', 'getState_PinType'])),
    x: xOf(pin),
    y: yOf(pin),
  };
}

function readWire(sheetId: string, wire: any, index: number): Record<string, unknown> {
  const points = callGetter(wire, ['getState_Points', 'getState_PointArr', 'getState_Path']);
  return {
    id: primitiveId(wire) ?? `wire-${index + 1}`,
    sheetId,
    points: Array.isArray(points) ? points : [],
  };
}

function readLabel(sheetId: string, label: any, index: number, kind: string): Record<string, unknown> {
  return {
    id: primitiveId(label) ?? `${kind}-${index + 1}`,
    sheetId,
    name: text(callGetter(label, ['getState_Name', 'getState_Net', 'getState_Text', 'getState_NetName'])) ?? '',
    x: xOf(label),
    y: yOf(label),
    kind,
  };
}

async function getAllFromApi(path: string): Promise<any[]> {
  const parts = path.split('.');
  let target = eda;
  for (const part of parts)
    target = target?.[part];
  if (!target || typeof target.getAll !== 'function')
    return [];
  const result = await target.getAll();
  return Array.isArray(result) ? result : [];
}

function previewValue(value: unknown, depth = 0, seen = new WeakSet<object>()): unknown {
  if (value === undefined)
    return '<undefined>';
  if (value === null || typeof value === 'number' || typeof value === 'boolean')
    return value;
  if (typeof value === 'string')
    return value.length > 320 ? `${value.slice(0, 320)}...<truncated>` : value;
  if (typeof value === 'bigint' || typeof value === 'symbol')
    return String(value);
  if (typeof value === 'function')
    return '<function>';
  if (typeof value !== 'object')
    return String(value);

  if (seen.has(value))
    return '<circular>';
  seen.add(value);

  if (Array.isArray(value)) {
    if (depth >= 3)
      return { type: 'array', length: value.length };
    return {
      type: 'array',
      length: value.length,
      sample: value.slice(0, 16).map(item => previewValue(item, depth + 1, seen)),
    };
  }

  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  const sample: Record<string, unknown> = {};
  if (depth < 3) {
    for (const key of keys.slice(0, 24))
      sample[key] = previewValue(record[key], depth + 1, seen);
  }
  if (keys.length > 24)
    sample.__truncatedKeys = keys.length - 24;

  return {
    type: value.constructor?.name ?? 'Object',
    keys: keys.slice(0, 40),
    value: sample,
  };
}

function ownDataPreview(object: any): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  let descriptors: Record<string, PropertyDescriptor>;
  try {
    descriptors = Object.getOwnPropertyDescriptors(object);
  }
  catch {
    return output;
  }

  for (const key of Object.keys(descriptors).slice(0, 40)) {
    const descriptor = descriptors[key];
    if ('value' in descriptor)
      output[key] = previewValue(descriptor.value);
    else
      output[key] = '<accessor>';
  }
  return output;
}

function objectKeys(object: any): string[] {
  try {
    return Reflect.ownKeys(object).map(key => String(key)).slice(0, 80);
  }
  catch {
    return [];
  }
}

function functionNames(object: any): string[] {
  const names = new Set<string>();
  let current = object;
  for (let depth = 0; current && depth < 5; depth += 1) {
    try {
      for (const key of Reflect.ownKeys(current)) {
        if (typeof key !== 'string' || key === 'constructor')
          continue;
        const descriptor = Object.getOwnPropertyDescriptor(current, key);
        if (typeof descriptor?.value === 'function')
          names.add(key);
      }
    }
    catch {
      break;
    }
    current = Object.getPrototypeOf(current);
  }
  return Array.from(names).sort();
}

function getterValues(object: any, names: string[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const name of unique(names)) {
    const candidate = object?.[name];
    if (typeof candidate !== 'function')
      continue;
    try {
      output[name] = previewValue(candidate.call(object));
    }
    catch (error) {
      output[name] = { error: safeError(error) };
    }
  }
  return output;
}

function debugObject(object: any, index: number, getterNames: string[]): Record<string, unknown> {
  const functions = functionNames(object);
  return {
    index,
    constructorName: object?.constructor?.name ?? '<unknown>',
    primitiveId: primitiveId(object),
    ownKeys: objectKeys(object),
    ownData: ownDataPreview(object),
    availableGetters: functions.filter(name => name.startsWith('getState_') || name.startsWith('get')).slice(0, 120),
    sampledGetterValues: getterValues(object, getterNames),
  };
}

async function readPrimitiveDebugGroup(
  state: ReaderState,
  path: string,
  kind: string,
  getterNames: string[],
): Promise<Record<string, unknown>> {
  const items = await tryRead(state, `DEBUG_${kind.toUpperCase()}`, `Unable to debug-read ${path}`, async () => getAllFromApi(path)) ?? [];
  return {
    kind,
    apiPath: path,
    count: items.length,
    samples: items.slice(0, 8).map((item, index) => debugObject(item, index, getterNames)),
  };
}

async function readComponentDebugGroup(state: ReaderState): Promise<Record<string, unknown>> {
  const componentsRaw = await tryRead(
    state,
    'DEBUG_COMPONENTS',
    'Unable to debug-read schematic components',
    async () => eda.sch_PrimitiveComponent.getAll(),
  ) ?? [];

  const summaries: Record<string, unknown>[] = [];
  const details = new Map<number, Record<string, unknown>>();
  const scanLimit = Math.min(componentsRaw.length, 300);

  for (let index = 0; index < scanLimit; index += 1) {
    const component = componentsRaw[index];
    const ref = componentRef(component) ?? `U?${index + 1}`;
    const componentPins = await tryRead(
      state,
      `DEBUG_PINS_${ref}`,
      `Unable to debug-read pins for ${ref}`,
      async () => typeof component.getAllPins === 'function' ? component.getAllPins() : [],
    ) ?? [];
    const pinCount = Array.isArray(componentPins) ? componentPins.length : 0;
    const summary = {
      index,
      primitiveId: primitiveId(component),
      ref,
      value: componentValue(component) ?? ref,
      device: text(callGetter(component, ['getState_DeviceName', 'getState_LibName', 'getState_Footprint'])) ?? '',
      x: xOf(component),
      y: yOf(component),
      pinCount,
      suspiciousReasons: [
        ref.startsWith('U?') ? 'fallback-ref' : undefined,
        pinCount <= 1 ? 'one-or-zero-pin-component' : undefined,
      ].filter(Boolean),
    };
    summaries.push(summary);

    if (index < 8 || pinCount <= 1 || ref.startsWith('U?')) {
      details.set(index, {
        ...debugObject(component, index, COMPONENT_STATE_GETTERS),
        pinCount,
        pinSamples: (Array.isArray(componentPins) ? componentPins : [])
          .slice(0, 4)
          .map((pin, pinIndex) => debugObject(pin, pinIndex, PIN_STATE_GETTERS)),
      });
    }
  }

  return {
    kind: 'component',
    apiPath: 'sch_PrimitiveComponent',
    count: componentsRaw.length,
    scannedCount: scanLimit,
    scanTruncated: componentsRaw.length > scanLimit,
    summaries,
    suspiciousComponents: summaries
      .filter(summary => Array.isArray(summary.suspiciousReasons) && summary.suspiciousReasons.length > 0)
      .slice(0, 80),
    samples: Array.from(details.values()).slice(0, 32),
  };
}

async function readLabels(state: ReaderState, sheetId: string): Promise<Record<string, unknown>[]> {
  const groups: Array<{ path: string; kind: string }> = [
    { path: 'sch_PrimitiveNetLabel', kind: 'net-label' },
    { path: 'sch_PrimitiveNetPort', kind: 'net-port' },
    { path: 'sch_PrimitiveNetFlag', kind: 'power-flag' },
    { path: 'sch_PrimitivePowerPort', kind: 'power-flag' },
  ];
  const labels: Record<string, unknown>[] = [];
  for (const group of groups) {
    const items = await tryRead(state, `READ_${group.kind.toUpperCase()}`, `Unable to read ${group.path}`, async () => getAllFromApi(group.path));
    for (const [index, item] of (items ?? []).entries()) {
      const label = readLabel(sheetId, item, index, group.kind);
      if (label.name)
        labels.push(label);
    }
  }
  return labels;
}

export async function collectActiveSchematicSnapshot(): Promise<Record<string, unknown>> {
  const state: ReaderState = { warnings: [] };
  const project = await tryRead(state, 'READ_PROJECT', 'Unable to read current project', async () => eda.dmt_Project.getCurrentProjectInfo());
  const document = await tryRead(state, 'READ_DOCUMENT', 'Unable to read current document', async () => eda.dmt_SelectControl.getCurrentDocumentInfo());
  const sheetId = text(document?.uuid) ?? 'active-sheet';
  const documentId = text(document?.uuid) ?? 'active-document';
  const componentsRaw = await tryRead(state, 'READ_COMPONENTS', 'Unable to read schematic components', async () => eda.sch_PrimitiveComponent.getAll()) ?? [];

  const components: Record<string, unknown>[] = [];
  const pins: Record<string, unknown>[] = [];

  for (const [index, component] of componentsRaw.entries()) {
    const ref = componentRef(component) ?? `U?${index + 1}`;
    components.push({
      uuid: primitiveId(component) ?? `component-${index + 1}`,
      sheetId,
      ref,
      device: text(callGetter(component, ['getState_DeviceName', 'getState_LibName', 'getState_Footprint'])) ?? '',
      value: componentValue(component) ?? ref,
      x: xOf(component),
      y: yOf(component),
    });

    const componentPins = await tryRead(state, `READ_PINS_${ref}`, `Unable to read pins for ${ref}`, async () => component.getAllPins()) ?? [];
    for (const pin of componentPins)
      pins.push(readPin(ref, sheetId, pin));
  }

  const wiresRaw = await tryRead(state, 'READ_WIRES', 'Unable to read schematic wires', async () => getAllFromApi('sch_PrimitiveWire')) ?? [];
  const labels = await readLabels(state, sheetId);
  const erc = await tryRead(state, 'READ_ERC', 'Unable to run schematic ERC', async () => eda.sch_Drc.check(true, false, true)) ?? [];

  const snapshot: Record<string, unknown> = {
    schemaVersion: '0.1',
    kind: 'schematic',
    snapshotId: `schematic-${documentId}`,
    capturedAt: new Date().toISOString(),
    project: {
      name: text(project?.friendlyName) ?? text(project?.name) ?? 'Untitled EasyEDA Project',
      uuid: text(project?.uuid),
      source: 'easyeda-pro',
      eda: 'easyeda-pro',
    },
    documents: [
      {
        id: documentId,
        name: text(document?.name) ?? text(document?.title) ?? 'Active schematic',
        type: 'schematic',
      },
    ],
    sheets: [
      {
        id: sheetId,
        documentId,
        name: text(document?.name) ?? text(document?.title) ?? 'Active sheet',
      },
    ],
    components,
    pins: pins.filter(pin => pin.pinNumber),
    wires: wiresRaw.map((wire, index) => readWire(sheetId, wire, index)),
    labels,
    noConnects: [],
    erc,
    warnings: state.warnings,
  };

  snapshot.fingerprint = fingerprint(snapshot);
  return snapshot;
}

export async function collectActiveSchematicReadbackDebug(): Promise<Record<string, unknown>> {
  const state: ReaderState = { warnings: [] };
  const project = await tryRead(state, 'DEBUG_PROJECT', 'Unable to read current project', async () => eda.dmt_Project.getCurrentProjectInfo());
  const document = await tryRead(state, 'DEBUG_DOCUMENT', 'Unable to read current document', async () => eda.dmt_SelectControl.getCurrentDocumentInfo());
  const normalized = await collectActiveSchematicSnapshot();

  const apiGroups = [
    await readComponentDebugGroup(state),
    await readPrimitiveDebugGroup(state, 'sch_PrimitiveWire', 'wire', WIRE_STATE_GETTERS),
    await readPrimitiveDebugGroup(state, 'sch_PrimitiveNetLabel', 'net-label', LABEL_STATE_GETTERS),
    await readPrimitiveDebugGroup(state, 'sch_PrimitiveNetPort', 'net-port', LABEL_STATE_GETTERS),
    await readPrimitiveDebugGroup(state, 'sch_PrimitiveNetFlag', 'net-flag', LABEL_STATE_GETTERS),
    await readPrimitiveDebugGroup(state, 'sch_PrimitivePowerPort', 'power-port', LABEL_STATE_GETTERS),
  ];

  const debug: Record<string, unknown> = {
    schemaVersion: '0.1',
    kind: 'easyeda-readback-debug',
    mode: 'read-only',
    safety: {
      writeOperations: false,
      arbitraryJavaScriptExecution: false,
      sampledGetterPolicy: 'fixed allow-list only',
    },
    capturedAt: new Date().toISOString(),
    project,
    document,
    normalizedSummary: summarizeSnapshot(normalized),
    normalizedCounts: {
      components: Array.isArray(normalized.components) ? normalized.components.length : 0,
      pins: Array.isArray(normalized.pins) ? normalized.pins.length : 0,
      wires: Array.isArray(normalized.wires) ? normalized.wires.length : 0,
      labels: Array.isArray(normalized.labels) ? normalized.labels.length : 0,
      erc: Array.isArray(normalized.erc) ? normalized.erc.length : 0,
    },
    normalizedWarnings: normalized.warnings ?? [],
    apiGroups,
    debugWarnings: state.warnings,
  };

  debug.fingerprint = fingerprint(debug);
  return debug;
}

export function summarizeSnapshot(snapshot: Record<string, any>): string {
  const warnings = Array.isArray(snapshot.warnings) ? snapshot.warnings.length : 0;
  const erc = Array.isArray(snapshot.erc) ? snapshot.erc.length : 0;
  return [
    `Project: ${snapshot.project?.name ?? '<unknown>'}`,
    `Snapshot: ${snapshot.snapshotId}`,
    `Fingerprint: ${snapshot.fingerprint}`,
    `Components: ${snapshot.components?.length ?? 0}`,
    `Pins: ${snapshot.pins?.length ?? 0}`,
    `Wires: ${snapshot.wires?.length ?? 0}`,
    `Labels: ${snapshot.labels?.length ?? 0}`,
    `ERC records: ${erc}`,
    `Read warnings: ${warnings}`,
  ].join('\n');
}
