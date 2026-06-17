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

## Real JLCEDA/OSHWHub Project Track

The GitHub JSON candidates above are good for committed fixtures and offline repeatability. They are not enough for bridge validation because the bridge must also work when a user opens a real public project from JLCEDA/OSHWHub and exports through the EasyEDA Pro client APIs.

Use this track to answer:

```text
can the extension read a real project opened in the editor exactly the way a human user would open it?
```

Metadata for this track is kept in:

```text
fixtures/schematic/benchmarks/real-oshwhub-projects.json
```

| Level | Project | JLCEDA/OSHWHub source | Companion evidence | Why it is useful |
|---|---|---|---|---|
| 2 | HelloWord Keyboard | <https://oshwhub.com/pengzhihui/b11afae464c54a3e8d0f77e1f92dc7b7> | <https://github.com/peng-zhihui/HelloWord-Keyboard> | Keyboard matrix and product-style documentation. Good for repeated switch groups, LEDs, USB/power labels, and public Chinese OSHWHub workflow. |
| 3 | OpenT12 soldering station controller | <https://oshwhub.com/createskyblue/opent12-jing-jian-ban> | <https://github.com/createskyblue/OpenT12> | ESP32 controller with ADC, PWM, OLED, encoder, power and heating-control context. The repo notes the board is not fully verified, so use it for readback stress, not electrical correctness. |
| 3 | Steering wheel meter box | <https://oshwhub.com/nolimy/steeringWheel_project> | <https://github.com/Nolimy/steeringWheel_MeterBox_STM32_FreeRTOS> | STM32 FreeRTOS hardware with vehicle/dashboard context. Useful for connectors, display/control IO, and medium-size MCU readback. |
| 3 | ChisFlash | <https://oshwhub.com/chisbread/chisflash-prometheus> | <https://github.com/ChisBread/ChisFlash> | GBA flashcart with memory, CPLD/logic, cartridge connector and multiple board variants. Useful for high pin-count buses and repeated address/data nets. |
| 4 | STM32-FOC motor driver board | <https://oshwhub.com/skythinker/simplefoc103> | <https://github.com/Skythinker616/foc-wheel-legged-robot/tree/main/stm32-foc> | STM32F103, DRV8313, AS5600, CAN, SWD, motor phases and 12 V power. Good bridge test and later semantic validator target. |
| 4 | Super Dial / X-Knob hardware base | <https://oshwhub.com/45coll/a2fff3c71f5d4de2b899c64b152d3da5> | <https://github.com/SmallPond/X-Knob> | ESP32-S3, BLDC driver, round LCD, magnetic encoder and battery management. Good for multi-board and human-interface product complexity. |
| 4 | OV-Watch | <https://oshwhub.com/no_chicken/zhi-neng-shou-biao-OV-Watch_V2.2> | <https://github.com/No-Chicken/OV-Watch> | Wearable STM32 watch with display, sensors, charging and low-power circuitry. Useful for compact dense schematics and sensor/power labels. |
| 4 | DOGlove mainboard | <https://oshwhub.com/doublehan/doglove_mainboard> | <https://github.com/TEA-Lab/DOGlove> | Real documentation includes both `.epro` import flow and OSHWHub viewing flow. Good for testing native Pro project import and wearable sensor architecture. |
| 4 | ESP32S3-SI4732 receiver | <https://oshwhub.com/sunnygold/esp32s3-si4732-shou-yin-ji> | <https://github.com/esp32-si4732/ats-mini> and <https://github.com/esp32-si4732/esp32-si4732-oshwhub> | ESP32-S3 plus RF receiver, display, audio and power. Good real Chinese open hardware project with an attached-file mirror. |
| 4 | ESP32 flight controller | <https://oshwhub.com/songge8/project_qqqyfdkm> | <https://github.com/songge8/CF-Drone> | ESP32/ESP32-S3/C3 flight controller with IMU, motor outputs and battery monitoring. Good for safety-sensitive robotics-style readback. |
| 5 | YuzukiLOHCC PRO HDMI capture card | <https://oshwhub.com/gloomyghost/yuzuki-lohcc-pro-usb-3-2-gen1-hdmi-huan-chu-cai-ji-ka> | <https://github.com/YuzukiHD/YuzukiLOHCC-PRO> | High-speed HDMI and USB3 capture card with CERN-OHL-P license. Strong stress test for differential-pair labels, connectors, flash and power rails. |
| 5 | OpenSTM | <https://oshwhub.com/Dimsmary/4ieRpV8S00kGn1MTpsc4MyZat8MwQPzn> | <https://github.com/Dimsmary/OpenSTM> | Multi-board scientific instrument with low-noise analog, DAC, high-voltage or dual-rail power and Pro project releases. Best later-stage real engineering stress case. |

Optional candidate with access friction:

- YuEEG: <https://oshwhub.com/protodrive000/1299_pro>, evidence <https://github.com/YuTaoV5/YuEEG>. The public repo includes an access password. Treat it as a manual-only candidate and do not commit captured files until redistribution terms are checked.

### Real-project Open Procedure

Use this procedure for OSHWHub/JLCEDA projects. It is intentionally separate from importing GitHub JSON files.

1. Install or import the extension once from Home or Extension Manager.
2. Open the OSHWHub project page in the browser.
3. Prefer the page's native "open in JLCEDA", "clone", "edit", or equivalent action. Record the exact button text because the site UI changes.
4. If the project opens in Standard Edition only, record that. If a Pro import or `.epro` file is available, prefer Pro.
5. Wait until the editor finishes loading the project tree.
6. Open the target schematic page tab. Do not stay on Home, project overview, PCB, BOM, or Gerber pages.
7. Run:

```text
EasyEDA Design Agent -> Show Read-only Bridge Status
```

Expected status:

```text
Active document looks schematic: yes
Current project: non-empty
Current document: documentType=1 or schematic-like
```

8. Run:

```text
EasyEDA Design Agent -> Export Snapshot Summary
```

Confirm that the summary shows nonzero components and pins. If it shows only status/help/about menus, the active tab is not a schematic page.

9. Run:

```text
EasyEDA Design Agent -> Export Active Schematic Snapshot
```

EasyEDA controls the final save location. If a Save As dialog appears, save directly under `fixtures/schematic/captured/`. If no Save As dialog appears, check Downloads or the EasyEDA default download directory, then move the file into the captured fixture directory.

10. Name the file:

```text
<project-slug>-<sheet-name>-snapshot.json
```

11. Run the smoke test and report:

```powershell
npm run test:schematic-captured -- fixtures\schematic\captured\<file>.json
node apps\cli\src\index.mjs fixtures\schematic\captured\<file>.json runs\<project-slug>-review
```

12. Update the benchmark metadata with capture status, EasyEDA version, sheet name, fingerprint, counts, known missing objects, and whether the source license permits committing the captured snapshot.

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
