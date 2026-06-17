function issue(id, severity, title, details, refs = []) {
  return { id, severity, title, details, refs };
}

function findComponent(graph, ref) {
  return graph.components.find(component => component.ref === ref);
}

function netByName(graph, name) {
  return graph.nets.find(net => net.name === name);
}

function endpointsForRef(graph, ref) {
  return graph.nets.flatMap(net =>
    net.endpoints
      .filter(endpoint => endpoint.ref === ref)
      .map(endpoint => ({ ...endpoint, net: net.name, netKind: net.kind })),
  );
}

function validatePowerTree(graph) {
  const issues = [];
  const powerNets = graph.nets.filter(net => net.kind === 'power');
  const ground = netByName(graph, 'GND');
  if (powerNets.length === 0) {
    issues.push(issue(
      'power.no-power-net',
      'error',
      'No power net detected',
      'The design graph does not contain a recognizable power net.',
    ));
  }
  if (!ground) {
    issues.push(issue(
      'power.no-ground-net',
      'error',
      'No GND net detected',
      'The design graph does not contain a GND net.',
    ));
  }
  return issues;
}

function validateStm32MinimumSystem(graph) {
  const issues = [];
  const mcu = graph.components.find(component =>
    component.kind === 'ic' && String(component.value ?? '').toUpperCase().includes('STM32'),
  );
  if (!mcu)
    return issues;

  const requiredNets = ['+3V3', 'GND', 'BOOT0', 'NRST'];
  for (const name of requiredNets) {
    if (!netByName(graph, name)) {
      issues.push(issue(
        `stm32.missing-${name.toLowerCase().replaceAll('+', '')}`,
        'error',
        `Missing ${name} net`,
        `STM32 minimum system should expose a ${name} net.`,
        [mcu.ref],
      ));
    }
  }

  const oscIn = netByName(graph, 'OSC_IN');
  const oscOut = netByName(graph, 'OSC_OUT');
  if (!oscIn || !oscOut) {
    issues.push(issue(
      'stm32.missing-crystal-nets',
      'warning',
      'Crystal nets are incomplete',
      'Expected OSC_IN and OSC_OUT nets for the external crystal path.',
      [mcu.ref],
    ));
  }

  return issues;
}

function validateDecoupling(graph) {
  const issues = [];
  const ics = graph.components.filter(component => component.kind === 'ic');
  const capacitors = graph.components.filter(component => component.kind === 'capacitor');

  for (const ic of ics) {
    const icNets = endpointsForRef(graph, ic.ref);
    const powerNets = new Set(icNets.filter(endpoint => endpoint.netKind === 'power').map(endpoint => endpoint.net));
    for (const powerNet of powerNets) {
      const hasCap = capacitors.some((capacitor) => {
        const capNets = new Set(endpointsForRef(graph, capacitor.ref).map(endpoint => endpoint.net));
        return capNets.has(powerNet) && capNets.has('GND');
      });
      if (!hasCap) {
        issues.push(issue(
          `decoupling.missing-${ic.ref}-${powerNet}`,
          'warning',
          `No decoupling capacitor found for ${ic.ref} on ${powerNet}`,
          `Expected at least one capacitor between ${powerNet} and GND.`,
          [ic.ref],
        ));
      }
    }
  }

  return issues;
}

function validatePlacement(graph) {
  const issues = [];
  if (graph.kind === 'schematic')
    return issues;

  for (const component of graph.components) {
    if (!component.placement) {
      issues.push(issue(
        `placement.unplaced-${component.ref}`,
        'warning',
        `${component.ref} has no PCB placement`,
        'The component exists in the graph but has no placement entry.',
        [component.ref],
      ));
    }
  }
  return issues;
}

export function runValidators(graph) {
  const checks = [
    { id: 'power-tree', issues: validatePowerTree(graph) },
    { id: 'stm32-minimum-system', issues: validateStm32MinimumSystem(graph) },
    { id: 'decoupling', issues: validateDecoupling(graph) },
    { id: 'placement', issues: validatePlacement(graph) },
  ];

  const issues = checks.flatMap(check => check.issues.map(item => ({ ...item, check: check.id })));
  return {
    schemaVersion: '0.1',
    ok: !issues.some(item => item.severity === 'error'),
    checks: checks.map(check => ({
      id: check.id,
      issueCount: check.issues.length,
    })),
    issueCounts: {
      error: issues.filter(item => item.severity === 'error').length,
      warning: issues.filter(item => item.severity === 'warning').length,
      info: issues.filter(item => item.severity === 'info').length,
    },
    issues,
  };
}
