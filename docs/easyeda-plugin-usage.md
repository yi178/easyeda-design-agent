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
apps/easyeda-bridge-extension/build/dist/easyeda-design-agent-bridge_v0.1.0.eext
```

## Install in EasyEDA Pro

In EasyEDA Pro:

```text
Advanced -> Extension Manager -> Import
```

Select the `.eext` package and enable it.

## Validate a Captured Snapshot

Save the exported JSON into:

```text
fixtures/schematic/captured/stm32-real-snapshot.json
```

Then run:

```powershell
npm run test:schematic-captured -- fixtures/schematic/captured/stm32-real-snapshot.json
```

Generate a review report:

```powershell
node apps/cli/src/index.mjs fixtures/schematic/captured/stm32-real-snapshot.json runs/captured-stm32-review
```

Review:

```text
runs/captured-stm32-review/report.md
```

## First Acceptance Test

For the same STM32 schematic, export three snapshots and confirm:

- the command passes for each snapshot;
- component count is stable;
- pin count is stable;
- net count is stable;
- endpoint count is stable;
- critical nets match the golden expected summary;
- fingerprint is identical for the three exports when the schematic is unchanged.

## Known API Risk

EasyEDA API names for labels, ports, and power flags may differ by client version. The extension records read warnings in `snapshot.warnings` instead of failing the entire export when optional label APIs are unavailable.

