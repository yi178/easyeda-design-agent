export const SNAPSHOT_SCHEMA_VERSION = '0.1';
export const DESIGN_GRAPH_SCHEMA_VERSION = '0.1';

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

