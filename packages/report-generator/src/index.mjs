function table(rows) {
  if (rows.length === 0)
    return '';
  const headers = Object.keys(rows[0]);
  const lines = [
    `| ${headers.join(' | ')} |`,
    `| ${headers.map(() => '---').join(' | ')} |`,
    ...rows.map(row => `| ${headers.map(header => row[header]).join(' | ')} |`),
  ];
  return lines.join('\n');
}

export function generateMarkdownReport({ snapshot, graph, validation }) {
  const componentRows = graph.components.map(component => ({
    Ref: component.ref,
    Kind: component.kind,
    Value: component.value ?? '',
    Placed: component.placement ? 'yes' : 'no',
  }));

  const netRows = graph.nets.map(net => ({
    Net: net.name,
    Kind: net.kind,
    Endpoints: String(net.endpoints.length),
  }));

  const issueRows = validation.issues.map(item => ({
    Severity: item.severity,
    Check: item.check,
    Issue: item.title,
    Refs: item.refs?.join(', ') ?? '',
  }));

  return `${[
    `# Design Review Report`,
    '',
    `Project: ${snapshot.project.name}`,
    '',
    '## Summary',
    '',
    `- Components: ${graph.metrics.componentCount}`,
    `- Nets: ${graph.metrics.netCount}`,
    `- Endpoints: ${graph.metrics.endpointCount}`,
    `- Placed components: ${graph.metrics.placedComponentCount}`,
    `- Validation: ${validation.ok ? 'pass' : 'fail'}`,
    `- Errors: ${validation.issueCounts.error}`,
    `- Warnings: ${validation.issueCounts.warning}`,
    '',
    '## Power Tree',
    '',
    table(graph.powerTree.map(item => ({
      Net: item.net,
      Kind: item.kind,
      Endpoints: String(item.endpointCount),
      Components: item.components.join(', '),
    }))),
    '',
    '## Components',
    '',
    table(componentRows),
    '',
    '## Nets',
    '',
    table(netRows),
    '',
    '## Issues',
    '',
    issueRows.length > 0 ? table(issueRows) : 'No issues found.',
    '',
  ].join('\n')}\n`;
}

