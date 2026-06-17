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

## Screened EasyEDA/JLCEDA Candidates

These candidates were screened by looking for EasyEDA-style schematic JSON such as `schematics[].dataStr.shape` and `part_netLabel_netPort`, then checking repository file trees for schematic JSON, PCB JSON, PDFs, BOMs, Gerbers, or images.

| Level | Project | Source | Files to try first | Why it is useful |
|---|---|---|---|---|
| 1 | KUSBA | <https://github.com/xbst/KUSBA> | `EasyEDA-Source/v2.4/SCH.json`, `EasyEDA-Source/v2.4/PCB.json` | Small real product with multiple revisions, EasyEDA source, Gerbers, CAD, firmware docs. Good first public regression after tiny controlled fixtures. |
| 1 | OpenSpool Mini daughterboard | <https://github.com/spuder/OpenSpool> | `hardware/openspool-mini-daughterboard/v1.1/SCH_OpenSpool-Mini-Daughterboard_2025-06-16.json` | Small daughterboard with SCH/PCB/BOM/PnP/Gerber. Good for import/export mechanics and labels without too much circuit complexity. |
| 2 | Tiny Blackbox | <https://github.com/alexeystn/tiny-blackbox> | `Hardware/EasyEDA/schematic.json`, `Hardware/EasyEDA/board.json` | Compact STM32 board with flash/storage and debug/programming context. Useful for MCU block recognition beyond the current STM32 minimum-system fixture. |
| 2 | FlopperZiro | <https://github.com/lraton/FlopperZiro> | `PCB and Schematic/Schematic/SCH_FlopperZiro_2024.json` | Consumer-style multi-interface board with schematic PDF and PCB JSON. Useful for connectors, SD/RF/IR/RFID-style blocks. |
| 3 | OpenSpool Mini | <https://github.com/spuder/OpenSpool> | `hardware/openspool-mini/v3.1/SCH_OpenSpool_2024-12-25.json` | ESP32-class board with repeated public revisions and supporting documentation. Good for labels, headers, power, NFC/IO style blocks. |
| 3 | Sesame Robot Distro Board | <https://github.com/dorianborian/sesame-robot> | `hardware/pcb/distro-v3/SCH_Sesame-Distro-Board-V3.json` | Robot distribution board with EasyEDA SCH/PCB/BOM/Gerber and mechanical context. Good for power distribution and connector-heavy designs. |
| 3 | Line Follower Robot PCB | <https://github.com/Rahber-Saeed/Line-Follower-Robot-PCB-V1.0-8CH-IR-Bluetooth> | `SCH_newLFRonly_2026-05-03.json` | Analog sensor array, op-amps, motor driver, Bluetooth, regulators. Useful for repeated channels and mixed analog/digital blocks. |
| 4 | SimpleFOCMini | <https://github.com/simplefoc/SimpleFOCMini> | `EasyEDA/SCH_simplefocmini_2024-04-26.json` | Motor-driver/power-stage board with EasyEDA, Altium, PDF, Gerber, PnP. Good for semantic checks around power stage, current paths, and motor phases. |
| 4 | RejsaCAN ESP32 | <https://github.com/MagnusThome/RejsaCAN-ESP32> | `Schematics/RejsaCAN v6.x (ESP32-C6 based dual CAN board)/RejsaCAN v6.0 - Schematic.json` | ESP32 + dual CAN/OBD-style board with multiple revisions. Good for CAN validators, connectors, multi-version regression. |
| 4 | Open Gamma Detector | <https://github.com/OpenGammaProject/Open-Gamma-Detector> | `hardware/SCH_Project_EasyEDA.json` | Larger EasyEDA hardware project with schematic PDF, 4-layer Gerbers, BOM, enclosure, firmware. Useful for analog front-end, MCU, display, power, and documentation cross-checks. |
| 5 | A4091 hardware | <https://github.com/A4091/a4091-hardware> | `easyeda/ReA4091_Mini_2024-10-24_SCH.json` first; later Rev3/Rev4 | Very complex retro-computing board with large EasyEDA schematics, PCB JSON, production data, PDFs. Best stress test for object classification, many net labels/ports, and large component counts. |

Notes:

- These files are mostly EasyEDA Standard-style JSON exports. In EasyEDA Pro/JLCEDA Pro they may require the import workflow rather than direct "open file". Record the exact import path for each benchmark.
- Do not commit downloaded third-party project files unless the license allows redistribution. For early screening, keep local downloads outside committed fixtures and commit only benchmark metadata plus captured snapshots when licensing is clear.
- Start with KUSBA or OpenSpool daughterboard before A4091. A4091 is useful, but it will produce many adapter failures until labels, ports, wires, buses, and title-block artifacts are classified correctly.

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
