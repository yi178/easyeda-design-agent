import { collectActiveSchematicSnapshot, summarizeSnapshot } from './schematic-snapshot';

declare const eda: any;

function showInformation(title: string, lines: string[]): void {
  eda.sys_Dialog.showInformationMessage(lines.join('\n'), title, 'OK');
}

function showError(title: string, error: unknown): void {
  showInformation(title, [error instanceof Error ? error.message : String(error)]);
}

async function saveJson(payload: Record<string, unknown>, filename: string): Promise<void> {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  await eda.sys_FileSystem.saveFile(blob, filename);
}

async function saveText(text: string, filename: string): Promise<void> {
  const blob = new Blob([text], { type: 'text/plain' });
  await eda.sys_FileSystem.saveFile(blob, filename);
}

function safeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'schematic';
}

export function activate(_status?: 'onStartupFinished', _arg?: string): void {}

export function showReadOnlyBridgeStatus(): void {
  showInformation('EasyEDA Design Agent', [
    'Mode: read-only schematic snapshot exporter',
    'Write operations: disabled',
    'Arbitrary JavaScript execution: disabled',
    'Use from an opened schematic document:',
    'EasyEDA Design Agent -> Export Active Schematic Snapshot',
  ]);
}

export async function exportActiveSchematicSnapshot(): Promise<void> {
  try {
    const snapshot = await collectActiveSchematicSnapshot();
    const filename = `${safeFilename(String(snapshot.project?.['name'] ?? 'schematic'))}-schematic-snapshot.json`;
    await saveJson(snapshot, filename);
    showInformation('Schematic Snapshot Exported', [
      summarizeSnapshot(snapshot),
      '',
      `Saved as: ${filename}`,
      'Run npm run test:schematic-captured -- <path-to-json> to validate it locally.',
    ]);
  }
  catch (error) {
    showError('Schematic Snapshot Export Failed', error);
  }
}

export async function exportActiveSchematicSummary(): Promise<void> {
  try {
    const snapshot = await collectActiveSchematicSnapshot();
    const summary = summarizeSnapshot(snapshot);
    const filename = `${safeFilename(String(snapshot.project?.['name'] ?? 'schematic'))}-schematic-summary.txt`;
    await saveText(`${summary}\n`, filename);
    showInformation('Schematic Summary Exported', [
      summary,
      '',
      `Saved as: ${filename}`,
    ]);
  }
  catch (error) {
    showError('Schematic Summary Export Failed', error);
  }
}

export function aboutReadOnlyBridge(): void {
  showInformation('About EasyEDA Design Agent', [
    'This extension exports read-only schematic snapshots for easyeda-design-agent.',
    'It is designed for review and validation workflows.',
    'It does not modify schematics, PCB files, or manufacturing outputs.',
  ]);
}

