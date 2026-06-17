#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { buildDesignGraph } from '../packages/graph-engine/src/index.mjs';
import { readJson } from './lib/easyeda-std.mjs';

function usage() {
  return [
    'Usage:',
    '  node scripts/diff-schematic-graph.mjs <left-snapshot.json> <right-snapshot.json> [out-dir]',
    '',
    'Example:',
    '  node scripts/diff-schematic-graph.mjs runs/roundtrip/openspool-daughterboard/snapshot.json runs/roundtrip/openspool-daughterboard/snapshot.roundtrip.json runs/roundtrip/openspool-daughterboard',
  ].join('\n');
}

function endpointKey(endpoint) {
  return `${endpoint.ref}.${endpoint.pin}`;
}

function sortedUnique(values) {
  return Array.from(new Set(values)).sort();
}

function diffSets(leftValues, rightValues) {
  const left = new Set(leftValues);
  const right = new Set(rightValues);
  return {
    onlyLeft: sortedUnique([...left].filter(value => !right.has(value))),
    onlyRight: sortedUnique([...right].filter(value => !left.has(value))),
  };
}

function componentRefs(graph) {
  return graph.components.map(component => component.ref);
}

function pinKeys(snapshot) {
  return snapshot.pins.map(pin => `${pin.ref}.${pin.pinNumber}`);
}

function netEndpointMap(graph) {
  const output = {};
  for (const net of graph.nets) {
    output[net.name] = sortedUnique(net.endpoints.map(endpointKey));
  }
  return output;
}

function diffNetEndpoints(leftGraph, rightGraph) {
  const left = netEndpointMap(leftGraph);
  const right = netEndpointMap(rightGraph);
  const netNames = sortedUnique([...Object.keys(left), ...Object.keys(right)]);
  const changed = [];
  for (const name of netNames) {
    const delta = diffSets(left[name] ?? [], right[name] ?? []);
    if (delta.onlyLeft.length > 0 || delta.onlyRight.length > 0) {
      changed.push({
        name,
        onlyLeft: delta.onlyLeft,
        onlyRight: delta.onlyRight,
      });
    }
  }
  return changed;
}

function diffSnapshots(leftSnapshot, rightSnapshot) {
  const leftGraph = buildDesignGraph(leftSnapshot);
  const rightGraph = buildDesignGraph(rightSnapshot);
  const componentDelta = diffSets(componentRefs(leftGraph), componentRefs(rightGraph));
  const pinDelta = diffSets(pinKeys(leftSnapshot), pinKeys(rightSnapshot));
  const netNameDelta = diffSets(leftGraph.nets.map(net => net.name), rightGraph.nets.map(net => net.name));
  const netEndpointDelta = diffNetEndpoints(leftGraph, rightGraph);

  const metricDelta = {};
  for (const key of sortedUnique([...Object.keys(leftGraph.metrics), ...Object.keys(rightGraph.metrics)])) {
    const left = leftGraph.metrics[key] ?? 0;
    const right = rightGraph.metrics[key] ?? 0;
    metricDelta[key] = {
      left,
      right,
      delta: right - left,
    };
  }

  const ok = componentDelta.onlyLeft.length === 0
    && componentDelta.onlyRight.length === 0
    && pinDelta.onlyLeft.length === 0
    && pinDelta.onlyRight.length === 0
    && netNameDelta.onlyLeft.length === 0
    && netNameDelta.onlyRight.length === 0
    && netEndpointDelta.length === 0;

  return {
    ok,
    left: {
      snapshotId: leftSnapshot.snapshotId,
      fingerprint: leftSnapshot.fingerprint,
      metrics: leftGraph.metrics,
    },
    right: {
      snapshotId: rightSnapshot.snapshotId,
      fingerprint: rightSnapshot.fingerprint,
      metrics: rightGraph.metrics,
    },
    metricDelta,
    componentDelta,
    pinDelta,
    netNameDelta,
    netEndpointDelta,
  };
}

function renderMarkdown(report) {
  const lines = [];
  lines.push('# Schematic Graph Diff');
  lines.push('');
  lines.push(`Status: ${report.ok ? 'PASS' : 'DIFF'}`);
  lines.push('');
  lines.push('| Metric | Left | Right | Delta |');
  lines.push('|---|---:|---:|---:|');
  for (const [key, delta] of Object.entries(report.metricDelta))
    lines.push(`| ${key} | ${delta.left} | ${delta.right} | ${delta.delta} |`);

  lines.push('');
  lines.push('## Component Refs');
  lines.push('');
  lines.push(`Only left: ${report.componentDelta.onlyLeft.join(', ') || '<none>'}`);
  lines.push('');
  lines.push(`Only right: ${report.componentDelta.onlyRight.join(', ') || '<none>'}`);

  lines.push('');
  lines.push('## Pins');
  lines.push('');
  lines.push(`Only left: ${report.pinDelta.onlyLeft.slice(0, 80).join(', ') || '<none>'}`);
  lines.push('');
  lines.push(`Only right: ${report.pinDelta.onlyRight.slice(0, 80).join(', ') || '<none>'}`);

  lines.push('');
  lines.push('## Net Names');
  lines.push('');
  lines.push(`Only left: ${report.netNameDelta.onlyLeft.join(', ') || '<none>'}`);
  lines.push('');
  lines.push(`Only right: ${report.netNameDelta.onlyRight.join(', ') || '<none>'}`);

  lines.push('');
  lines.push('## Net Endpoint Changes');
  lines.push('');
  if (report.netEndpointDelta.length === 0) {
    lines.push('<none>');
  }
  else {
    for (const net of report.netEndpointDelta.slice(0, 40)) {
      lines.push(`### ${net.name}`);
      lines.push('');
      lines.push(`Only left: ${net.onlyLeft.join(', ') || '<none>'}`);
      lines.push('');
      lines.push(`Only right: ${net.onlyRight.join(', ') || '<none>'}`);
      lines.push('');
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const [, , leftPath, rightPath, outDir] = process.argv;
  if (!leftPath || !rightPath) {
    console.error(usage());
    process.exitCode = 2;
    return;
  }

  const left = await readJson(leftPath);
  const right = await readJson(rightPath);
  const report = diffSnapshots(left, right);

  console.log(report.ok ? 'schematic graph diff passed' : 'schematic graph diff found differences');
  console.log(`left fingerprint: ${report.left.fingerprint}`);
  console.log(`right fingerprint: ${report.right.fingerprint}`);
  for (const [key, delta] of Object.entries(report.metricDelta))
    console.log(`${key}: ${delta.left} -> ${delta.right} (${delta.delta >= 0 ? '+' : ''}${delta.delta})`);

  if (outDir) {
    await mkdir(outDir, { recursive: true });
    await writeFile(join(outDir, 'diff-report.json'), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(join(outDir, 'diff-report.md'), renderMarkdown(report));
    console.log(`reports written to ${outDir}`);
  }

  if (!report.ok)
    process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
