export const READONLY_CAPABILITIES_V0_1 = {
  schemaVersion: '0.1',
  protocol: 'easyeda-design-agent-jsonrpc',
  protocolVersion: '0.1',
  supportedOperations: [
    'project.get_context',
    'schematic.get_snapshot',
    'pcb.get_snapshot',
    'project.get_snapshot_fingerprint',
    'schematic.drc.run',
    'pcb.drc.run',
  ],
  safety: {
    readOnly: true,
    arbitraryJavaScriptEnabled: false,
    destructiveOperationsEnabled: false,
    manufacturingOrderEnabled: false,
  },
};

