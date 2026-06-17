import { collectActiveSchematicReadbackDebug, collectActiveSchematicSnapshot, summarizeSnapshot } from './schematic-snapshot';

declare const eda: any;

function showInformation(title: string, lines: string[]): void {
  eda.sys_Dialog.showInformationMessage(lines.join('\n'), title, 'OK');
}

function showError(title: string, error: unknown): void {
  showInformation(title, [error instanceof Error ? error.message : String(error)]);
}

function confirmAction(message: string, title: string, mainButtonTitle = 'Continue'): Promise<boolean> {
  return new Promise((resolve) => {
    eda.sys_Dialog.showConfirmationMessage(
      message,
      title,
      mainButtonTitle,
      'Cancel',
      (confirmed: boolean) => resolve(confirmed),
    );
  });
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

async function currentDocumentInfo(): Promise<Record<string, unknown> | undefined> {
  try {
    return await eda.dmt_SelectControl.getCurrentDocumentInfo();
  }
  catch {
    return undefined;
  }
}

function isLikelySchematicDocument(document: Record<string, unknown> | undefined): boolean {
  if (!document)
    return false;
  const type = document.documentType;
  return type === 1 || String(type).toLowerCase().includes('schematic');
}

function describeDocument(document: Record<string, unknown> | undefined): string {
  if (!document)
    return '<none>';
  return [
    `documentType=${String(document.documentType ?? '<unknown>')}`,
    `uuid=${String(document.uuid ?? '<unknown>')}`,
  ].join(', ');
}

function safeFilename(value: string): string {
  return value.replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '') || 'schematic';
}

export function activate(_status?: 'onStartupFinished', _arg?: string): void {}

export async function showReadOnlyBridgeStatus(): Promise<void> {
  const documentInfo = await currentDocumentInfo();
  const project = await tryReadText('Current project', async () => eda.dmt_Project.getCurrentProjectInfo());
  const document = await tryReadText('Current document', async () => documentInfo);
  showInformation('EasyEDA Design Agent', [
    'Mode: read-only schematic snapshot exporter',
    'Write operations: disabled',
    'Arbitrary JavaScript execution: disabled',
    `Active document looks schematic: ${isLikelySchematicDocument(documentInfo) ? 'yes' : 'no'}`,
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
    '6. If labels or wire points look wrong, use: EasyEDA Design Agent -> Export Readback Debug JSON.',
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
    const document = await currentDocumentInfo();
    const filenameHint = 'project-name-schematic-snapshot.json';
    const approved = await confirmAction(
      [
        'This will read the active schematic and then ask EasyEDA to save a JSON snapshot.',
        '',
        `Current document: ${describeDocument(document)}`,
        `Looks schematic: ${isLikelySchematicDocument(document) ? 'yes' : 'no'}`,
        '',
        'If this is not a schematic page, cancel and open the schematic sheet first.',
        `Suggested filename pattern: ${filenameHint}`,
      ].join('\n'),
      'Export Active Schematic Snapshot',
      'Export',
    );
    if (!approved)
      return;

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

export async function exportActiveSchematicReadbackDebug(): Promise<void> {
  try {
    const document = await currentDocumentInfo();
    const approved = await confirmAction(
      [
        'This will read the active schematic and save a debug JSON file.',
        '',
        'The debug export is read-only and uses a fixed getter allow-list.',
        'It is intended for diagnosing missing labels, ports, power flags, and wire points.',
        '',
        `Current document: ${describeDocument(document)}`,
        `Looks schematic: ${isLikelySchematicDocument(document) ? 'yes' : 'no'}`,
        '',
        'If this is not a schematic page, cancel and open the schematic sheet first.',
      ].join('\n'),
      'Export Readback Debug JSON',
      'Export',
    );
    if (!approved)
      return;

    showProgress(15, 'Reading active schematic debug data');
    const debug = await collectActiveSchematicReadbackDebug();
    showProgress(90, 'Opening save dialog');
    const projectRecord = typeof debug.project === 'object' && debug.project
      ? debug.project as Record<string, unknown>
      : {};
    const projectName = String(projectRecord.friendlyName ?? projectRecord.name ?? 'schematic');
    const filename = `${safeFilename(projectName)}-readback-debug.json`;
    await saveJson(debug, filename);
    clearProgress();

    const apiGroups = Array.isArray(debug.apiGroups) ? debug.apiGroups as Array<Record<string, unknown>> : [];
    showInformation('Readback Debug Exported', [
      `Fingerprint: ${debug.fingerprint ?? '<none>'}`,
      '',
      ...apiGroups.map(group => `${group.kind}: ${group.count ?? 0}`),
      '',
      `Requested filename: ${filename}`,
      'EasyEDA controls the final save location.',
      'If no Save As dialog appeared, check Downloads or the EasyEDA default download directory.',
      '',
      'Attach this file when reporting missing labels, ports, power flags, or wire points.',
    ]);
  }
  catch (error) {
    clearProgress();
    showError('Readback Debug Export Failed', error);
  }
}

export async function exportActiveSchematicSummary(): Promise<void> {
  try {
    const document = await currentDocumentInfo();
    const approved = await confirmAction(
      [
        'This will read the active schematic and then ask EasyEDA to save a text summary.',
        '',
        `Current document: ${describeDocument(document)}`,
        `Looks schematic: ${isLikelySchematicDocument(document) ? 'yes' : 'no'}`,
        '',
        'If this is not a schematic page, cancel and open the schematic sheet first.',
      ].join('\n'),
      'Export Schematic Summary',
      'Export',
    );
    if (!approved)
      return;

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
