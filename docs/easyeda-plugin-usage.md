# EasyEDA Bridge Extension Usage

This workflow is designed for the first real readback test in EasyEDA Pro.

## User Flow

1. Build and install the extension package.
2. Open an EasyEDA Pro project.
3. Open the target schematic page.
4. Use:

```text
EasyEDA Design Agent -> Export Active Schematic Snapshot
```

5. Save the JSON file.
6. Validate the exported JSON in this repository.

## Extension Menu

The extension registers a schematic-page menu:

```text
EasyEDA Design Agent
  Export Active Schematic Snapshot
  Export Snapshot Summary
  Show Read-only Bridge Status
  About
```

It also registers status/about entries on the home page.

## Build

From the extension directory:

```powershell
cd apps/easyeda-bridge-extension
npm install
npm run build
```

The package is written to:

```text
apps/easyeda-bridge-extension/build/dist/easyeda-design-agent-bridge_v0.1.1.eext
```

Use this exact file when importing into EasyEDA Pro:

```text
E:\eda-project\apps\easyeda-bridge-extension\build\dist\easyeda-design-agent-bridge_v0.1.1.eext
```

Do not import files from these locations:

```text
E:\aIdo\eadproject1\...
E:\aIdo\eda\...
```

Those are earlier experiments. For this repository, the correct extension package is always under:

```text
apps/easyeda-bridge-extension/build/dist/
```

## Install in EasyEDA Pro

In EasyEDA Pro:

```text
Advanced -> Extension Manager -> Import
```

Select the `.eext` package and enable it.

If you previously imported `easyeda-design-agent-bridge_v0.1.0.eext`, remove or disable that old extension first. Version `0.1.0` was packaged without `dist/index.js`, so its menu may appear but clicks do nothing. Use `v0.1.1` or newer.

Recommended manual install sequence:

1. Open EasyEDA Pro / JLCEDA Pro.
2. Go to:

```text
Advanced -> Extension Manager
```

3. Click import.
4. Select:

```text
E:\eda-project\apps\easyeda-bridge-extension\build\dist\easyeda-design-agent-bridge_v0.1.1.eext
```

5. Enable the extension after import.
6. If the extension manager has a "show in top menu" option, enable it for easier testing.
7. Close and reopen the target schematic page if the menu does not appear immediately.

After installation, the schematic page should show:

```text
EasyEDA Design Agent
```

with menu items:

```text
Export Active Schematic Snapshot
Export Snapshot Summary
Show Read-only Bridge Status
About
```

If you only see the status/about items on the home page, open an actual schematic sheet. Snapshot export is registered for the schematic editor context.

## Manual Smoke Test in EasyEDA Pro

Use a known small schematic first, ideally the STM32 minimum-system schematic.

### Test 1: Extension status

1. Open EasyEDA Pro.
2. Open any project or stay on the home page.
3. Click:

```text
EasyEDA Design Agent -> Show Read-only Bridge Status
```

Expected result:

```text
Mode: read-only schematic snapshot exporter
Write operations: disabled
Arbitrary JavaScript execution: disabled
```

This confirms the extension is installed and callable.

### Test 2: Export summary

1. Open the target schematic page.
2. Click:

```text
EasyEDA Design Agent -> Export Snapshot Summary
```

3. Save the offered `.txt` file.

Expected result:

The dialog should show counts similar to:

```text
Components: ...
Pins: ...
Wires: ...
Labels: ...
ERC records: ...
Read warnings: ...
```

This is the fastest check that the extension can read the active schematic context.

### Test 3: Export full snapshot JSON

1. Keep the target schematic page active.
2. Click:

```text
EasyEDA Design Agent -> Export Active Schematic Snapshot
```

3. Save the offered JSON file somewhere easy to find, for example:

```text
E:\eda-project\fixtures\schematic\captured\stm32-real-snapshot-1.json
```

If the `captured` directory does not exist, create it first.

Expected result:

The dialog should show:

```text
Project: ...
Snapshot: ...
Fingerprint: ...
Components: ...
Pins: ...
Wires: ...
Labels: ...
ERC records: ...
Read warnings: ...
```

The JSON should contain:

```json
{
  "schemaVersion": "0.1",
  "kind": "schematic",
  "project": {},
  "components": [],
  "pins": [],
  "wires": [],
  "labels": [],
  "erc": [],
  "fingerprint": "..."
}
```

### Test 4: Repeatability

Export the same unchanged schematic three times:

```text
stm32-real-snapshot-1.json
stm32-real-snapshot-2.json
stm32-real-snapshot-3.json
```

Expected result:

- component count is identical;
- pin count is identical;
- wire count is identical;
- label count is identical;
- fingerprint is identical.

If fingerprint differs but counts are identical, inspect whether EasyEDA returns objects in nondeterministic order or includes volatile fields. That should be fixed in the adapter.

## Validate a Captured Snapshot

Save the exported JSON into:

```text
fixtures/schematic/captured/stm32-real-snapshot.json
```

Then run:

```powershell
npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot.json
```

If you exported three snapshots, test each:

```powershell
npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot-1.json
npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot-2.json
npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot-3.json
```

Generate a review report:

```powershell
node apps/cli/src/index.mjs fixtures/schematic/captured/stm32-real-snapshot.json runs/captured-stm32-review
```

Review:

```text
runs/captured-stm32-review/report.md
```

For the first real test, also manually inspect these fields in the JSON:

```text
warnings
components
pins
wires
labels
erc
```

If `warnings` contains label or wire read failures, the snapshot may still be useful, but the EasyEDA API adapter needs to be updated for that client version.

## First Acceptance Test

For the same STM32 schematic, export three snapshots and confirm:

- the command passes for each snapshot;
- component count is stable;
- pin count is stable;
- net count is stable;
- endpoint count is stable;
- critical nets match the golden expected summary;
- fingerprint is identical for the three exports when the schematic is unchanged.

## What to Report Back

After the first manual test, record:

```text
EasyEDA Pro version:
Operating system:
Extension package path:
Project name:
Schematic page name:
Components count:
Pins count:
Wires count:
Labels count:
ERC records:
Read warnings:
Fingerprint 1:
Fingerprint 2:
Fingerprint 3:
```

If validation fails, keep the exported JSON and the exact terminal output from:

```powershell
npm run test:schematic-captured -- path\to\schematic-snapshot.json
```

## Known API Risk

EasyEDA API names for labels, ports, and power flags may differ by client version. The extension records read warnings in `snapshot.warnings` instead of failing the entire export when optional label APIs are unavailable.

## Troubleshooting

### Menu appears but clicking does nothing

Check that the imported file is:

```text
easyeda-design-agent-bridge_v0.1.1.eext
```

Do not use:

```text
easyeda-design-agent-bridge_v0.1.0.eext
```

The package must contain:

```text
dist/index.js
```

If needed, rebuild:

```powershell
cd E:\eda-project
npm run build:easyeda-bridge
```

Then import:

```text
E:\eda-project\apps\easyeda-bridge-extension\build\dist\easyeda-design-agent-bridge_v0.1.1.eext
```

### Only status/about menu items appear

You are likely on the home page or another non-schematic context. Open an actual schematic sheet. The export commands are registered under the schematic editor context.
