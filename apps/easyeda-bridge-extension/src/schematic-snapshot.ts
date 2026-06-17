import { fingerprint } from './fingerprint';

declare const eda: any;

interface ReadWarning {
  code: string;
  message: string;
}

interface ReaderState {
  warnings: ReadWarning[];
}

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

