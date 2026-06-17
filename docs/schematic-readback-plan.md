# V0.1 Schematic Readback Plan

Goal:

```text
EasyEDA Pro schematic
-> read-only Bridge RPC
-> SchematicSnapshot JSON
-> SchematicGraph
-> deterministic tests and Markdown report
```

## Scope

V0.1 schematic readback is read-only. It must not modify the EasyEDA project.

Required snapshot objects:

- project metadata;
- schematic documents;
- sheets;
- components;
- pins;
- wires;
- net labels;
- net ports;
- power flags;
- no-connect markers;
- explicit netlist when available;
- ERC results;
- snapshot fingerprint.

## Read-Only RPC

Initial Bridge methods:

```text
project.get_context
schematic.list_documents
schematic.get_active_snapshot
schematic.get_snapshot_by_document
schematic.run_erc
project.get_snapshot_fingerprint
```

The Bridge Extension should only call EasyEDA APIs and normalize raw objects. It should not run AI logic.

## Snapshot Contract

The normalized snapshot uses:

```json
{
  "schemaVersion": "0.1",
  "kind": "schematic",
  "snapshotId": "schematic-...",
  "fingerprint": "...",
  "project": {},
  "documents": [],
  "sheets": [],
  "components": [],
  "pins": [],
  "wires": [],
  "labels": [],
  "noConnects": [],
  "nets": [],
  "erc": []
}
```

## Netlist Strategy

Preferred order:

1. Use explicit net data from EasyEDA if the API exposes reliable net/endpoints.
2. Fall back to deterministic geometric inference:
   - pin point touches wire point;
   - wire segments join by shared endpoint;
   - labels and power flags name a connected group;
   - same label name merges groups;
   - no-connect markers exclude intentional unconnected pins.

## Acceptance Criteria

For a fixed STM32 minimum-system schematic:

- three consecutive reads produce the same fingerprint;
- component count is stable;
- pin count is stable;
- net count is stable;
- endpoint count is stable;
- critical nets match golden expectations:
  - `+3V3`
  - `GND`
  - `VDDA`
  - `OSC_IN`
  - `OSC_OUT`
  - `NRST`
  - `BOOT0`

## Current Fixtures

```text
fixtures/schematic/stm32-minimal-schematic.json
fixtures/schematic/label-inference-schematic.json
fixtures/schematic/captured/New-Project_2026-06-15_15-19-41-schematic-snapshot.json
```

The STM32 fixture validates explicit netlist handling. The label inference fixture validates wire/label geometry inference.
The captured fixture is a real EasyEDA Pro export and currently works as an adapter smoke test, not a golden netlist oracle.

## Validation Strategy

See [Schematic readback validation strategy](readback-validation-strategy.md).

Short version:

```text
raw capture smoke
-> object classification
-> topology checks
-> semantic block checks
-> semantic generation
-> read generated schematic again
-> graph diff and human review
```

Round-trip generation is useful for future semantic schematic generation, but it does not replace independent topology and manual checks.

## Commands

```powershell
npm test
npm run review:schematic
```

## Next Implementation Tasks

1. Build `apps/easyeda-bridge-extension`.
2. Install the generated `.eext` package in EasyEDA Pro.
3. Use `Export Active Schematic Snapshot`.
4. Add a real captured snapshot under `fixtures/schematic/captured/`.
5. Smoke-test captured snapshots with:

```powershell
npm run test:schematic-captured -- fixtures/schematic/captured/New-Project_2026-06-15_15-19-41-schematic-snapshot.json
```
