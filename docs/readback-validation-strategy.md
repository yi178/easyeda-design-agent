# Schematic Readback Validation Strategy

Goal:

```text
prove that an EasyEDA schematic was read correctly enough to support review,
semantic editing, and future schematic generation.
```

Round-trip generation is useful, but it must not be the only oracle. A reader and a generator can share the same wrong assumption and still round-trip cleanly. The validation flow therefore uses multiple independent checks.

## Validation Layers

1. **Raw capture smoke**
   - Snapshot has the expected schema, project, sheets, components, pins, wires, and fingerprint.
   - All pins reference known components.
   - Repeated exports from an unchanged schematic produce stable counts and stable fingerprints.

2. **Object classification**
   - Real components are separated from EasyEDA net labels, net ports, power flags, no-connect markers, and title-block artifacts.
   - Suspicious objects are kept in debug output until the adapter knows how to classify them.
   - The current captured STM32 sample shows this is not complete yet: many `U?` one-pin primitives are likely labels or ports, not components.

3. **Topology checks**
   - Prefer explicit EasyEDA netlist data when available.
   - Otherwise infer nets from pin points, wire segments, labels, ports, and power flags.
   - Check critical nets against a golden summary for controlled projects.

4. **Semantic checks**
   - Build higher-level structures such as power tree, reset circuit, clock circuit, boot-mode circuit, USB interface, CAN interface, and regulator blocks.
   - Validators should be deterministic where possible.

5. **Round-trip checks**
   - Convert the read graph into a semantic architecture model.
   - Generate a typed `SchematicPlan`.
   - Create a new schematic draft from that plan.
   - Read the generated draft again and compare source graph vs generated graph.
   - Compare by semantic graph, critical nets, BOM-like component list, and expected block roles, not by exact coordinates.

6. **Human review**
   - For each benchmark project, keep a short manual checklist: expected component groups, critical nets, special symbols, known ERC/DRC status, and screenshot/PDF reference.
   - Human checks are required before treating a new benchmark as a golden fixture.

## Two Test Lanes

Use two lanes instead of only one project order.

**Survey lane: complex to simple**

This finds EasyEDA API coverage problems quickly. Complex public projects contain more object types: labels, ports, multi-sheet links, power flags, buses, connectors, mounting holes, title blocks, variants, and hierarchical sheets.

**Regression lane: simple to complex**

This proves fixes safely. A fix must pass tiny controlled schematics before being trusted on larger public projects.

## Recommended Project Ladder

| Level | Project type | Purpose |
|---|---|---|
| 0 | Tiny controlled schematic: resistor, LED, connector, named power, GND | Verify basic component, pin, wire, and label reading. |
| 1 | STM32 minimum system, current captured sample | Verify MCU pins, reset, boot, crystal, decoupling, power nets. |
| 2 | USB-UART or CH340 module | Verify connectors, USB nets, oscillator, power flags, labels. |
| 3 | Small buck/LDO power board | Verify power tree, feedback nets, regulator semantic block. |
| 4 | ESP32/STM32 development board | Verify mixed blocks: MCU, USB, regulator, buttons, LEDs, headers. |
| 5 | Multi-sheet open-source board | Verify page links, global labels, hierarchical structure, and graph merge. |

For the EasyEDA bridge, prefer projects that can be opened directly in EasyEDA Pro or imported with minimal conversion. Each benchmark should include:

- source project link and license;
- exported snapshot JSON;
- expected summary JSON when the project is controlled enough;
- manual checklist;
- generated report under `runs/` only for local review, not committed by default.

## Current Baseline

The first real capture is stored at:

```text
fixtures/schematic/captured/New-Project_2026-06-15_15-19-41-schematic-snapshot.json
```

Observed baseline:

```text
components: 51
pins: 109
wires: 35
labels: 0
wire point arrays: 0
```

Known adapter gaps:

- EasyEDA net labels, net ports, and power flags are not classified correctly.
- Wire objects are found, but point arrays are empty.
- Some one-pin `U?` primitives are probably labels or ports and should not remain normal components.

## Commands

Smoke-test a real capture:

```powershell
npm run test:schematic-captured -- fixtures\schematic\captured\New-Project_2026-06-15_15-19-41-schematic-snapshot.json
```

Strict golden test for a controlled fixture:

```powershell
npm run test:schematic-captured -- fixtures\schematic\stm32-minimal-schematic.json fixtures\schematic\stm32-minimal-expected-summary.json
```

Generate a local review report:

```powershell
node apps\cli\src\index.mjs fixtures\schematic\captured\New-Project_2026-06-15_15-19-41-schematic-snapshot.json runs\captured-schematic-review
```
