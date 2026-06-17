# Open-source Schematic Benchmark Plan

Purpose:

```text
use real public schematics to discover EasyEDA adapter gaps,
then promote stable samples into repeatable regression tests.
```

## Project Selection Rules

Prefer projects that satisfy most of these conditions:

- can be opened directly in EasyEDA Pro/JLCEDA Pro, or imported with a documented conversion step;
- has a public source link and license;
- has a schematic PDF, image, BOM, or netlist that can be used as an external reference;
- contains known critical nets such as `GND`, `+3V3`, `VCC`, `NRST`, `BOOT0`, `USB_D+`, `USB_D-`, `SWDIO`, `SWCLK`, `CANH`, `CANL`, `FB`, or `SW`;
- is small enough that a human can manually inspect at least the main blocks.

Do not use projects that require private account data, proprietary customer files, or unclear redistribution rights as committed fixtures.

## Test Order

Use two orders for two different goals.

### Discovery: Complex To Simple

Use this when the question is "what EasyEDA object types are we missing?"

1. Multi-block development board: MCU, USB, regulator, buttons, LEDs, headers.
2. Medium MCU board: reset, clock, boot, SWD, decoupling.
3. USB-UART board: USB connector, CH340/CP210x, crystal, ESD, headers.
4. Power module: buck/LDO, feedback net, inductor, diode/MOSFET, capacitors.
5. Tiny hand-made schematic: resistor, LED, connector, power label, ground.

Complex projects surface labels, ports, power symbols, buses, multi-sheet links, and title-block objects quickly. Failures in this lane create adapter tasks; they are not release blockers by themselves.

### Regression: Simple To Complex

Use this when the question is "is the adapter now correct enough to trust?"

1. Tiny controlled schematic.
2. Current STM32 minimum-system capture.
3. USB-UART board.
4. Power module.
5. Full development board.
6. Multi-sheet project.

A sample only moves up the regression ladder after lower levels pass.

## Candidate Project Types

| Candidate | Why it is useful | Required checks |
|---|---|---|
| STM32F103 minimum system | Current baseline; MCU pins, reset, boot, crystal, decoupling | `+3V3`, `GND`, `BOOT0`, `NRST`, `OSC_IN`, `OSC_OUT`, SWD pins |
| CH340/CP210x USB-UART module | USB labels, oscillator, connector pin naming | `USB_D+`, `USB_D-`, `TXD`, `RXD`, `VCC`, `GND` |
| ESP32-C3/ESP32-S3 dev board | RF module symbol, boot/reset buttons, USB/UART, regulator | `EN`, `BOOT`, `+3V3`, USB/UART nets |
| Arduino Uno R3 compatible schematic | Public reference, many functional blocks | MCU power, reset, oscillator, USB bridge, headers |
| Buck converter module | Power-tree and analog feedback semantics | `VIN`, `VOUT`, `GND`, `SW`, `FB` |
| CAN transceiver node | Interface semantics and termination | `CANH`, `CANL`, `TXD`, `RXD`, 120R termination |

For EasyEDA-first testing, prefer versions hosted on a public EasyEDA/OSHWLab-style project page so the bridge reads native EasyEDA objects. External KiCad/Eagle projects are still useful, but record the import/conversion path.

## Manual Capture Procedure

For each candidate:

1. Open or import the project in EasyEDA Pro.
2. Open the schematic sheet that will be tested.
3. Run:

```text
EasyEDA Design Agent -> Export Snapshot Summary
```

4. Confirm the dialog shows nonzero components and pins.
5. Run:

```text
EasyEDA Design Agent -> Export Active Schematic Snapshot
```

6. Save the file under:

```text
fixtures/schematic/captured/
```

Use a descriptive filename:

```text
<project-slug>-<sheet-name>-snapshot.json
```

7. Run:

```powershell
npm run test:schematic-captured -- fixtures\schematic\captured\<file>.json
```

8. Generate a local report:

```powershell
node apps\cli\src\index.mjs fixtures\schematic\captured\<file>.json runs\<project-slug>-review
```

9. Record these fields in the benchmark notes:

```text
source link:
license:
EasyEDA Pro version:
sheet name:
components:
pins:
wires:
wires with point arrays:
labels:
fingerprint:
known missing objects:
manual critical nets checked:
```

## Promotion Criteria

| Stage | Meaning | Required evidence |
|---|---|---|
| Captured | The plugin exported a JSON snapshot | Smoke test passes |
| Classified | Components, labels, ports, power flags are separated | Manual object count review |
| Topology-golden | Critical nets match expected summary | `expected-summary.json` committed |
| Semantic-golden | Functional blocks are recognized | Deterministic validator output |
| Round-trip | Read graph can regenerate an equivalent schematic draft | Source/readback graph diff report |

Do not treat a public project as a golden regression fixture until it reaches at least `Topology-golden`.
