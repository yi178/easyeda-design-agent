import { collectActiveSchematicSnapshot, summarizeSnapshot } from './schematic-snapshot';

declare const eda: any;

function showInformation(title: string, lines: string[]): void {
  eda.sys_Dialog.showInformationMessage(lines.join('\n'), title, 'OK');
}

function showError(title: string, error: unknown): void {
  showInformation(title, [error instanceof Error ? error.message : String(error)]);
}

function showProgress(progress: number, title: string): void {
  try {
    eda.sys_LoadingAndProgressBar.showProgressBar(progress, title);
  }
  catch {
    // Some EasyEDA builds do not expose progress UI. Export should continue.
  }
}

function clearProgress(): void {
  try {
    eda.sys_LoadingAndProgressBar.destroyProgressBar();
  }
  catch {
    // Ignore progress cleanup failures from older editor builds.
  }
}

async function tryReadText(label: string, reader: () => Promise<unknown>): Promise<string> {
  try {
    const value = await reader();
    if (value === undefined || value === null)
      return `${label}: <none>`;
    return `${label}: ${JSON.stringify(value, null, 2).slice(0, 800)}`;
  }
  catch (error) {
    return `${label}: failed: ${error instanceof Error ? error.message : String(error)}`;
  }
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

export async function showReadOnlyBridgeStatus(): Promise<void> {
  const project = await tryReadText('Current project', async () => eda.dmt_Project.getCurrentProjectInfo());
  const document = await tryReadText('Current document', async () => eda.dmt_SelectControl.getCurrentDocumentInfo());
  showInformation('EasyEDA Design Agent', [
    'Mode: read-only schematic snapshot exporter',
    'Write operations: disabled',
    'Arbitrary JavaScript execution: disabled',
    '',
    project,
    '',
    document,
    '',
    'Install/import can be done from Home.',
    'Export requires an opened project and an active schematic sheet.',
    'If you only see status/help/about, open a schematic page first.',
    '',
    'Expected schematic menu:',
    'EasyEDA Design Agent -> Export Active Schematic Snapshot',
  ]);
}

export function howToUseReadOnlyBridge(): void {
  showInformation('How to Export Schematic', [
    '1. Import/enable the extension from Home or Extension Manager.',
    '2. Open an EasyEDA project.',
    '3. Open the target schematic sheet, not the PCB or Home page.',
    '4. Use: EasyEDA Design Agent -> Export Snapshot Summary for a quick check.',
    '5. Use: EasyEDA Design Agent -> Export Active Schematic Snapshot for JSON.',
    '',
    'When saving, EasyEDA controls the final location.',
    'If no Save As dialog appears, check Downloads or the EasyEDA default download directory.',
    '',
    'Suggested test path:',
    'E:\\eda-project\\fixtures\\schematic\\captured\\stm32-real-snapshot-1.json',
    '',
    'Then run:',
    'npm run test:schematic-captured -- fixtures\\schematic\\captured\\stm32-real-snapshot-1.json',
  ]);
}

export async function exportActiveSchematicSnapshot(): Promise<void> {
  try {
    showProgress(15, 'Reading active schematic');
    const snapshot = await collectActiveSchematicSnapshot();
    showProgress(75, 'Preparing snapshot JSON');
    const filename = `${safeFilename(String(snapshot.project?.['name'] ?? 'schematic'))}-schematic-snapshot.json`;
    showProgress(90, 'Opening save dialog');
    await saveJson(snapshot, filename);
    clearProgress();
    showInformation('Schematic Snapshot Exported', [
      summarizeSnapshot(snapshot),
      '',
      `Requested filename: ${filename}`,
      'EasyEDA controls the final save location.',
      'If no Save As dialog appeared, check Downloads or the EasyEDA default download directory.',
      '',
      'Recommended test location:',
      'E:\\eda-project\\fixtures\\schematic\\captured\\stm32-real-snapshot-1.json',
      '',
      'Run npm run test:schematic-captured -- <path-to-json> to validate it locally.',
    ]);
  }
  catch (error) {
    clearProgress();
    showError('Schematic Snapshot Export Failed', error);
  }
}

export async function exportActiveSchematicSummary(): Promise<void> {
  try {
    showProgress(20, 'Reading active schematic');
    const snapshot = await collectActiveSchematicSnapshot();
    showProgress(80, 'Preparing summary');
    const summary = summarizeSnapshot(snapshot);
    const filename = `${safeFilename(String(snapshot.project?.['name'] ?? 'schematic'))}-schematic-summary.txt`;
    showProgress(90, 'Opening save dialog');
    await saveText(`${summary}\n`, filename);
    clearProgress();
    showInformation('Schematic Summary Exported', [
      summary,
      '',
      `Requested filename: ${filename}`,
      'EasyEDA controls the final save location.',
      'If no Save As dialog appeared, check Downloads or the EasyEDA default download directory.',
    ]);
  }
  catch (error) {
    clearProgress();
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
