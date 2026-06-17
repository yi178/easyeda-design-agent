import { readFile, writeFile } from 'node:fs/promises';

export function stableStringify(value) {
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(item => stableStringify(item)).join(',')}]`;

  return `{${Object.keys(value)
    .filter(key => key !== 'fingerprint' && key !== 'capturedAt')
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
    .join(',')}}`;
}

export function fingerprint(value) {
  const text = stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, '0')}`;
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`);
}

function text(value) {
  if (typeof value !== 'string')
    return undefined;
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function slug(value) {
  return String(value ?? 'schematic')
    .trim()
    .replace(/[^\w.-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'schematic';
}

function shapeType(shape) {
  return String(shape).split('~', 1)[0];
}

function parseAttributes(value) {
  const output = {};
  const parts = String(value ?? '').split('`');
  for (let index = 0; index < parts.length - 1; index += 2) {
    const key = text(parts[index]);
    if (key)
      output[key] = parts[index + 1] ?? '';
  }
  return output;
}

function parsePointList(value) {
  const numbers = String(value ?? '')
    .trim()
    .split(/\s+/)
    .map(Number)
    .filter(Number.isFinite);
  const points = [];
  for (let index = 0; index < numbers.length - 1; index += 2)
    points.push([numbers[index], numbers[index + 1]]);
  return points;
}

function parseTextPart(part) {
  const fields = part.split('~');
  return {
    kind: fields[1],
    x: numberValue(fields[2]),
    y: numberValue(fields[3]),
    rotation: numberValue(fields[4]),
    value: text(fields[12]),
    id: text(fields[15]),
    rawShape: part,
  };
}

function parsePinPart(part) {
  const groups = part.split('^^');
  const fields = groups[0].split('~');
  const textGroups = groups
    .slice(3)
    .map(group => group.split('~'))
    .filter(fields => fields[0] === '0' || fields[0] === '1')
    .map(fields => ({
      visible: fields[0] === '1',
      value: text(fields[4]),
      x: numberValue(fields[1]),
      y: numberValue(fields[2]),
      anchor: text(fields[5]),
    }));

  const pinNumber = text(fields[3]) ?? '';
  const visibleName = textGroups.find(group => group.visible && group.value && group.value !== pinNumber)?.value;
  const anyName = textGroups.find(group => group.value && group.value !== pinNumber)?.value;
  return {
    pinNumber,
    pinName: visibleName ?? anyName ?? pinNumber,
    x: numberValue(fields[4]),
    y: numberValue(fields[5]),
    rotation: numberValue(fields[6]),
    id: text(fields[7]),
    rawShape: part,
  };
}

function parseComponentShape(shape, sheetId, index) {
  const parts = shape.split('#@$');
  const header = parts[0].split('~');
  const texts = parts.filter(part => part.startsWith('T~')).map(parseTextPart);
  const pins = parts.filter(part => part.startsWith('P~')).map(parsePinPart);
  const nameText = texts.find(item => item.kind === 'N')?.value;
  const refText = texts.find(item => item.kind === 'P')?.value;
  const attributes = parseAttributes(header[3]);

  if (pins.length === 0 || !refText)
    return undefined;

  return {
    component: {
      uuid: text(header[6]) ?? `component-${index + 1}`,
      sheetId,
      ref: refText,
      device: text(attributes.package) ?? text(attributes.Package) ?? text(attributes.spiceSymbolName) ?? '',
      value: nameText ?? text(attributes.spiceSymbolName) ?? refText,
      x: numberValue(header[1]),
      y: numberValue(header[2]),
      rotation: numberValue(header[4]) ?? 0,
      easyedaStd: {
        attributes,
        rawShape: shape,
        shapeIndex: index,
      },
    },
    pins: pins
      .filter(pin => pin.pinNumber && pin.x !== undefined && pin.y !== undefined)
      .map(pin => ({
        sheetId,
        ref: refText,
        pinNumber: pin.pinNumber,
        pinName: pin.pinName,
        x: pin.x,
        y: pin.y,
        rotation: pin.rotation,
        easyedaStd: {
          id: pin.id,
          rawShape: pin.rawShape,
        },
      })),
  };
}

function parseWireShape(shape, sheetId, index) {
  const fields = shape.split('~');
  return {
    id: text(fields[6]) ?? `wire-${index + 1}`,
    sheetId,
    points: parsePointList(fields[1]),
    easyedaStd: {
      color: text(fields[2]) ?? '#008800',
      strokeWidth: numberValue(fields[3]) ?? 1,
      id: text(fields[6]),
      rawShape: shape,
      shapeIndex: index,
    },
  };
}

function labelKindFromFlag(flagType) {
  const lower = String(flagType ?? '').toLowerCase();
  if (lower.includes('netport'))
    return 'net-port';
  if (lower.includes('gnd') || lower.includes('vcc') || lower.includes('+') || lower.includes('power'))
    return 'power-flag';
  return 'net-label';
}

function parseFlagShape(shape, sheetId, index) {
  const groups = shape.split('^^');
  const header = groups[0].split('~');
  const labelFields = (groups[2] ?? '').split('~');
  const name = text(labelFields[0]);
  return {
    id: text(header[5]) ?? `flag-${index + 1}`,
    sheetId,
    name: name ?? text(header[1]) ?? '',
    x: numberValue(header[2]),
    y: numberValue(header[3]),
    rotation: numberValue(header[4]) ?? 0,
    kind: labelKindFromFlag(header[1]),
    easyedaStd: {
      flagType: text(header[1]),
      rawShape: shape,
      shapeIndex: index,
    },
  };
}

function parseNetLabelShape(shape, sheetId, index) {
  const fields = shape.split('~');
  return {
    id: text(fields[6]) ?? `label-${index + 1}`,
    sheetId,
    name: text(fields[5]) ?? '',
    x: numberValue(fields[1]),
    y: numberValue(fields[2]),
    rotation: numberValue(fields[3]) ?? 0,
    kind: 'net-label',
    easyedaStd: {
      rawShape: shape,
      shapeIndex: index,
    },
  };
}

function parseJunctionShape(shape, sheetId, index) {
  const fields = shape.split('~');
  return {
    id: text(fields[5]) ?? `junction-${index + 1}`,
    sheetId,
    x: numberValue(fields[1]),
    y: numberValue(fields[2]),
    easyedaStd: {
      rawShape: shape,
      shapeIndex: index,
    },
  };
}

function parseNoConnectShape(shape, sheetId, index) {
  const fields = shape.split('~');
  return {
    id: text(fields[3]) ?? `no-connect-${index + 1}`,
    sheetId,
    x: numberValue(fields[1]),
    y: numberValue(fields[2]),
    easyedaStd: {
      rawShape: shape,
      shapeIndex: index,
    },
  };
}

function sheetName(sheet, index) {
  return text(sheet?.title) ?? text(sheet?.name) ?? `Sheet_${index + 1}`;
}

function cloneWithoutShapeDataStr(dataStr) {
  if (!dataStr || typeof dataStr !== 'object')
    return {};
  const clone = { ...dataStr };
  delete clone.shape;
  return clone;
}

export function easyedaStdToSnapshot(source, options = {}) {
  const documents = [];
  const sheets = [];
  const components = [];
  const pins = [];
  const wires = [];
  const labels = [];
  const noConnects = [];
  const junctions = [];
  const graphics = [];
  const parseWarnings = [];
  const rawShapeOrder = [];

  const schematicSheets = Array.isArray(source?.schematics) ? source.schematics : [];
  for (const [sheetIndex, sheet] of schematicSheets.entries()) {
    const documentId = `doc-${sheetIndex + 1}`;
    const sheetId = `sheet-${sheetIndex + 1}`;
    const name = sheetName(sheet, sheetIndex);
    const shapes = Array.isArray(sheet?.dataStr?.shape) ? sheet.dataStr.shape : [];

    documents.push({ id: documentId, name, type: 'schematic' });
    sheets.push({ id: sheetId, documentId, name });

    for (const [shapeIndex, shape] of shapes.entries()) {
      const type = shapeType(shape);
      rawShapeOrder.push({ sheetId, shapeIndex, type });
      try {
        if (type === 'LIB') {
          const parsed = parseComponentShape(shape, sheetId, shapeIndex);
          if (parsed) {
            components.push(parsed.component);
            pins.push(...parsed.pins);
          }
          else {
            graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
          }
        }
        else if (type === 'W') {
          const wire = parseWireShape(shape, sheetId, shapeIndex);
          if (wire.points.length >= 2)
            wires.push(wire);
          else
            graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
        }
        else if (type === 'F') {
          const label = parseFlagShape(shape, sheetId, shapeIndex);
          if (label.name && label.x !== undefined && label.y !== undefined)
            labels.push(label);
          else
            graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
        }
        else if (type === 'N') {
          const label = parseNetLabelShape(shape, sheetId, shapeIndex);
          if (label.name && label.x !== undefined && label.y !== undefined)
            labels.push(label);
          else
            graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
        }
        else if (type === 'J') {
          junctions.push(parseJunctionShape(shape, sheetId, shapeIndex));
          graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
        }
        else if (type === 'O') {
          noConnects.push(parseNoConnectShape(shape, sheetId, shapeIndex));
        }
        else {
          graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
        }
      }
      catch (error) {
        parseWarnings.push({
          code: 'SHAPE_PARSE_FAILED',
          sheetId,
          shapeIndex,
          type,
          message: error instanceof Error ? error.message : String(error),
        });
        graphics.push({ sheetId, type, shapeIndex, rawShape: shape });
      }
    }
  }

  const projectName = text(source?.title) ?? text(options.projectName) ?? 'EasyEDA Standard schematic';
  const snapshot = {
    schemaVersion: '0.1',
    kind: 'schematic',
    snapshotId: `easyeda-std-${slug(projectName)}`,
    capturedAt: new Date().toISOString(),
    project: {
      name: projectName,
      source: 'easyeda-standard-json',
      eda: 'easyeda-standard',
    },
    documents,
    sheets,
    components,
    pins,
    wires,
    labels,
    noConnects: noConnects.filter(item => item.x !== undefined && item.y !== undefined),
    erc: [],
    warnings: parseWarnings,
    easyedaStd: {
      editorVersion: source?.editorVersion,
      docType: source?.docType,
      title: source?.title,
      description: source?.description,
      colors: source?.colors,
      sourcePath: options.sourcePath,
      topLevel: Object.fromEntries(Object.entries(source ?? {}).filter(([key]) => key !== 'schematics')),
      sheets: schematicSheets.map((sheet, index) => ({
        id: `sheet-${index + 1}`,
        name: sheetName(sheet, index),
        sheetTemplate: {
          ...sheet,
          dataStr: cloneWithoutShapeDataStr(sheet?.dataStr),
        },
      })),
      junctions,
      graphics,
      rawShapeOrder,
    },
  };

  snapshot.fingerprint = fingerprint(snapshot);
  return snapshot;
}

function formatNumber(value) {
  if (!Number.isFinite(value))
    return '0';
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function generateWireShape(wire, index) {
  const points = (wire.points ?? [])
    .map(point => `${formatNumber(Number(point[0]))} ${formatNumber(Number(point[1]))}`)
    .join(' ');
  const color = wire.easyedaStd?.color ?? '#008800';
  const width = wire.easyedaStd?.strokeWidth ?? 1;
  const id = wire.easyedaStd?.id ?? wire.id ?? `rt-wire-${index + 1}`;
  return `W~${points}~${color}~${width}~0~none~${id}~0`;
}

function generateNetLabelShape(label, index) {
  const id = label.easyedaStd?.id ?? label.id ?? `rt-label-${index + 1}`;
  const x = Number(label.x);
  const y = Number(label.y);
  return [
    'N',
    formatNumber(x),
    formatNumber(y),
    formatNumber(Number(label.rotation ?? 0)),
    '#0000ff',
    label.name,
    id,
    'start',
    formatNumber(x + 2),
    formatNumber(y - 2.5),
    'Times New Roman',
    '7pt',
    '0',
  ].join('~');
}

function generatedNoConnectShape(noConnect, index) {
  if (noConnect.easyedaStd?.rawShape)
    return noConnect.easyedaStd.rawShape;
  const id = noConnect.easyedaStd?.id ?? noConnect.id ?? `rt-no-connect-${index + 1}`;
  return `O~${formatNumber(Number(noConnect.x))}~${formatNumber(Number(noConnect.y))}~${id}~M -4 -4 L 4 4 M 4 -4 L -4 4~#33cc33~0`;
}

export function snapshotToEasyedaStd(snapshot, options = {}) {
  const template = snapshot.easyedaStd ?? {};
  const topLevel = template.topLevel && typeof template.topLevel === 'object'
    ? structuredClone(template.topLevel)
    : {};
  const sheets = Array.isArray(template.sheets) && template.sheets.length > 0
    ? template.sheets
    : snapshot.sheets.map(sheet => ({
        id: sheet.id,
        name: sheet.name,
        sheetTemplate: {
          docType: 1,
          title: sheet.name,
          dataStr: {},
        },
      }));

  const output = {
    ...topLevel,
    editorVersion: topLevel.editorVersion ?? template.editorVersion ?? '6.5.0',
    docType: topLevel.docType ?? template.docType ?? '5',
    title: topLevel.title ?? snapshot.project?.name ?? 'Roundtrip Schematic',
    description: topLevel.description ?? 'Generated by easyeda-design-agent roundtrip tooling',
    colors: topLevel.colors ?? template.colors,
    schematics: [],
  };

  const graphics = template.graphics ?? [];
  const junctions = template.junctions ?? [];

  for (const sheetEntry of sheets) {
    const sheetId = sheetEntry.id;
    const sheetTemplate = structuredClone(sheetEntry.sheetTemplate ?? {});
    const dataStr = {
      ...(sheetTemplate.dataStr ?? {}),
      shape: [],
    };

    const sheetGraphics = graphics
      .filter(item => item.sheetId === sheetId)
      .filter(item => item.type !== 'W' && item.type !== 'N' && item.type !== 'F' && item.type !== 'O' && item.type !== 'J')
      .sort((left, right) => (left.shapeIndex ?? 0) - (right.shapeIndex ?? 0))
      .map(item => item.rawShape)
      .filter(Boolean);
    dataStr.shape.push(...sheetGraphics);

    const components = snapshot.components
      .filter(component => component.sheetId === sheetId)
      .sort((left, right) => (left.easyedaStd?.shapeIndex ?? 0) - (right.easyedaStd?.shapeIndex ?? 0));
    for (const component of components) {
      if (component.easyedaStd?.rawShape)
        dataStr.shape.push(component.easyedaStd.rawShape);
    }

    const wires = snapshot.wires
      .filter(wire => wire.sheetId === sheetId)
      .sort((left, right) => (left.easyedaStd?.shapeIndex ?? 0) - (right.easyedaStd?.shapeIndex ?? 0));
    dataStr.shape.push(...wires.map(generateWireShape));

    const labels = snapshot.labels
      .filter(label => label.sheetId === sheetId)
      .sort((left, right) => (left.easyedaStd?.shapeIndex ?? 0) - (right.easyedaStd?.shapeIndex ?? 0));
    for (const [index, label] of labels.entries()) {
      if (options.regenerateLabels || !label.easyedaStd?.rawShape || label.kind === 'net-label')
        dataStr.shape.push(generateNetLabelShape(label, index));
      else
        dataStr.shape.push(label.easyedaStd.rawShape);
    }

    const noConnects = (snapshot.noConnects ?? [])
      .filter(item => item.sheetId === sheetId)
      .sort((left, right) => (left.easyedaStd?.shapeIndex ?? 0) - (right.easyedaStd?.shapeIndex ?? 0));
    dataStr.shape.push(...noConnects.map(generatedNoConnectShape));

    const sheetJunctions = junctions
      .filter(item => item.sheetId === sheetId)
      .sort((left, right) => (left.easyedaStd?.shapeIndex ?? 0) - (right.easyedaStd?.shapeIndex ?? 0))
      .map(item => item.easyedaStd?.rawShape)
      .filter(Boolean);
    dataStr.shape.push(...sheetJunctions);

    output.schematics.push({
      ...sheetTemplate,
      title: sheetTemplate.title ?? sheetEntry.name,
      dataStr,
    });
  }

  return output;
}

export function summarizeSnapshot(snapshot) {
  return {
    project: snapshot.project?.name,
    fingerprint: snapshot.fingerprint,
    sheets: snapshot.sheets?.length ?? 0,
    components: snapshot.components?.length ?? 0,
    pins: snapshot.pins?.length ?? 0,
    wires: snapshot.wires?.length ?? 0,
    wiresWithPointArrays: (snapshot.wires ?? []).filter(wire => Array.isArray(wire.points) && wire.points.length > 0).length,
    labels: snapshot.labels?.length ?? 0,
    noConnects: snapshot.noConnects?.length ?? 0,
    warnings: snapshot.warnings?.length ?? 0,
  };
}
