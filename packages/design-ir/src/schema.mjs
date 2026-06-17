export const SNAPSHOT_SCHEMA_VERSION = '0.1';
export const DESIGN_GRAPH_SCHEMA_VERSION = '0.1';
export const SCHEMATIC_SNAPSHOT_KIND = 'schematic';

export function assertSnapshotShape(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object')
    errors.push('snapshot must be an object');
  if (snapshot?.schemaVersion !== SNAPSHOT_SCHEMA_VERSION)
    errors.push(`snapshot.schemaVersion must be "${SNAPSHOT_SCHEMA_VERSION}"`);
  if (!snapshot?.project || typeof snapshot.project.name !== 'string')
    errors.push('snapshot.project.name is required');
  if (!Array.isArray(snapshot?.components))
    errors.push('snapshot.components must be an array');
  if (!Array.isArray(snapshot?.nets))
    errors.push('snapshot.nets must be an array');
  if (!snapshot?.board || typeof snapshot.board !== 'object')
    errors.push('snapshot.board is required');

  return {
    ok: errors.length === 0,
    errors,
  };
}

export function assertSchematicSnapshotShape(snapshot) {
  const errors = [];
  if (!snapshot || typeof snapshot !== 'object')
    errors.push('snapshot must be an object');
  if (snapshot?.schemaVersion !== SNAPSHOT_SCHEMA_VERSION)
    errors.push(`snapshot.schemaVersion must be "${SNAPSHOT_SCHEMA_VERSION}"`);
  if (snapshot?.kind !== SCHEMATIC_SNAPSHOT_KIND)
    errors.push(`snapshot.kind must be "${SCHEMATIC_SNAPSHOT_KIND}"`);
  if (!snapshot?.project || typeof snapshot.project.name !== 'string')
    errors.push('snapshot.project.name is required');
  if (!Array.isArray(snapshot?.sheets))
    errors.push('snapshot.sheets must be an array');
  if (!Array.isArray(snapshot?.components))
    errors.push('snapshot.components must be an array');
  if (!Array.isArray(snapshot?.pins))
    errors.push('snapshot.pins must be an array');
  if (snapshot?.nets !== undefined && !Array.isArray(snapshot.nets))
    errors.push('snapshot.nets must be an array when provided');
  if (snapshot?.wires !== undefined && !Array.isArray(snapshot.wires))
    errors.push('snapshot.wires must be an array when provided');
  if (snapshot?.labels !== undefined && !Array.isArray(snapshot.labels))
    errors.push('snapshot.labels must be an array when provided');
  if (snapshot?.noConnects !== undefined && !Array.isArray(snapshot.noConnects))
    errors.push('snapshot.noConnects must be an array when provided');
  if (snapshot?.erc !== undefined && !Array.isArray(snapshot.erc))
    errors.push('snapshot.erc must be an array when provided');

  return {
    ok: errors.length === 0,
    errors,
  };
}
