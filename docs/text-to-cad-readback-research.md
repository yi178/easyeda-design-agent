# text-to-cad Readback Research

Source project:

```text
https://github.com/earthtojake/text-to-cad
```

The project is not a single text-to-CAD model. It is a skills library for CAD, robotics, manufacturing, and hardware-design agents. The CAD readback implementation is mainly in:

```text
skills/cad/SKILL.md
skills/cad/scripts/step/
skills/cad/scripts/inspect/
skills/cad/scripts/packages/cadpy/
skills/cad/references/
```

## How It Reads CAD

The core idea is `STEP-first`.

```text
build123d Python source or imported STEP/STP
-> normalized STEP artifact
-> OpenCascade/OCP scene loading
-> topology/geometry extraction
-> GLB + STEP_topology sidecar
-> selector index
-> inspect/measure/align/diff CLIs
```

Important implementation details:

- **One neutral primary format**: STEP/STP is treated as the authoritative CAD artifact. STL, 3MF, and GLB are secondary derived outputs.
- **Two input paths**:
  - generated Python CAD source with a `gen_step()` function;
  - direct imported `.step` / `.stp` files when no generator exists.
- **OpenCascade-backed parsing**:
  - uses OCP/OpenCascade APIs such as `STEPCAFControl_Reader`, `STEPControl_Reader`, `XCAFDoc_ShapeTool`, `TopExp_Explorer`, `BRepAdaptor_Surface`, `BRepAdaptor_Curve`, `BRepGProp`, and `BRepMesh_IncrementalMesh`;
  - preserves assembly labels, occurrence transforms, colors, and prototype shapes where STEP/XCAF exposes them.
- **Stable selector model**:
  - builds selectors for occurrences, shapes, faces, edges, and vertices;
  - examples: `#o1.2`, `#o1.2.f1`, `#f1`;
  - stores selector tables and adjacency relations so later tools can query without reparsing all geometry.
- **Derived query artifact**:
  - writes a GLB for viewer use;
  - embeds or writes a `STEP_topology` manifest containing bounding boxes, shape counts, face/edge rows, relations, mesh settings, and file hashes.
- **Deterministic inspection tools**:
  - `refs --facts --planes --positioning`;
  - `measure`;
  - `align`;
  - `frame`;
  - `diff`.
- **Staleness detection**:
  - stores STEP/source hashes;
  - refuses to inspect stale topology artifacts and asks for regeneration.

## What We Can Borrow

The strongest ideas for this EasyEDA project are architectural, not CAD-specific.

### 1. Read Once, Query Many Times

`text-to-cad` does not make every command parse STEP from scratch. It generates a reusable topology artifact, then inspection commands query that artifact.

For EasyEDA, use the same pattern:

```text
EasyEDA raw API objects
-> SchematicSnapshot
-> SchematicGraph
-> selector/debug sidecar
-> inspect/query/report commands
```

This is useful because EasyEDA API behavior may vary by client version. Capturing raw diagnostics once gives repeatable offline tests.

### 2. Stable Selectors

CAD selectors give humans and agents copyable references. We should add EDA selectors:

```text
#sheet.P1
#component.U1
#pin.U1.3
#net.GND
#wire.<id>
#label.<id>
#erc.<id>
```

Reports should reference these selectors instead of only prose. Later, the EasyEDA bridge can map selectors back to UI highlight/navigation commands.

### 3. Sidecar Debug Artifacts

For CAD, hidden GLB/topology artifacts are treated as part of the workflow. For EasyEDA, add a read-only debug section or sidecar:

```text
raw object class
primitive id
available getter names
getter values for selected fields
shape string prefix for EasyEDA Std JSON
classification reason
```

This directly addresses the current issue where EasyEDA net labels/ports/power flags are being captured as one-pin `U?` pseudo-components.

### 4. Deterministic Facts API

CAD has `refs`, `measure`, `align`, and `diff`. We should mirror that for schematics:

```text
schematic refs       # list components, pins, labels, nets, sheets
schematic trace      # trace net membership from a pin/label
schematic facts      # power tree, critical nets, block summaries
schematic diff       # source vs generated or export1 vs export2 graph diff
schematic inspect    # raw/debug object lookup by selector
```

This keeps AI workflows grounded in typed queries rather than ad hoc JSON scanning.

### 5. Hash-Checked Readback

`text-to-cad` uses source/STEP hashes to detect stale artifacts. We already have snapshot fingerprints. Extend this to:

- stable sorted snapshot fingerprint;
- raw capture fingerprint;
- graph fingerprint;
- expected-summary fingerprint for golden fixtures.

This makes repeatability and round-trip checks much easier to trust.

### 6. Benchmarks As First-class Assets

`text-to-cad` keeps benchmark prompts and artifacts visible in the repo. For this project, each EasyEDA benchmark should include:

- source project link;
- source license;
- EasyEDA JSON or manual import path;
- captured snapshot;
- expected summary once manually reviewed;
- screenshot/PDF reference;
- local report generation command.

## What Not To Copy Directly

- CAD is mostly geometric/topological. EDA is electrical/logical first. We should not overfit to geometry selectors and miss net semantics.
- STEP is a stable interchange format. EasyEDA Pro APIs are client-version-dependent, so our bridge needs raw diagnostics and compatibility tests.
- CAD visual diff is helpful. Schematic visual similarity is not enough; critical net topology must be the main oracle.
- `text-to-cad` can safely use generated Python source for geometry. EasyEDA write operations must still go through typed `DesignPlan`, dry-run, validation, and human approval.

## Proposed EasyEDA Equivalent

```text
apps/easyeda-bridge-extension
  read-only raw capture + user-facing export UX

packages/easyeda-adapter
  classify EasyEDA raw objects into components, pins, wires, labels, ports, power flags

packages/design-ir
  SchematicSnapshot, SchematicGraph, selector schema, DesignPlan

packages/graph-engine
  net inference, graph diff, semantic block extraction

scripts/inspect-schematic.mjs
  refs, facts, trace, diff, raw lookup

fixtures/schematic/captured
  real captures

fixtures/schematic/expected
  manually reviewed golden summaries
```

The immediate next implementation task is to add a debug/classification sidecar to the EasyEDA bridge, then use it to fix label/port/wire-point extraction.

## Agent Skills To Copy

`text-to-cad` treats a skill as more than a prompt. A useful skill has instructions, typed artifacts, fixtures, scripts, and expected outputs. Our current skills are intentionally small placeholders; before any one is considered production-ready it should follow this shape:

```text
skills/<skill-name>/
  SKILL.md
  schemas/
    input.schema.json
    output.schema.json
  fixtures/
    <small-readable-case>.json
  evals/
    <case>.expected.json
  scripts/
    run.mjs
  references/
    domain-notes.md
```

Required properties:

- `SKILL.md` states input type, output type, safety mode, and failure behavior.
- `schemas/` defines the input graph or snapshot contract and the finding/report contract.
- `fixtures/` contains small committed examples that are legal to redistribute.
- `evals/` checks deterministic expected output, not only LLM prose.
- `scripts/` exists when a skill needs deterministic graph queries before an agent writes narrative review text.
- `references/` captures domain rules that must not be hidden in one prompt.

### Readback Skills

These should come first because the bridge is still being proven.

| Skill | Purpose | Production gate |
|---|---|---|
| `capture-schematic-snapshot` | Guide a human through read-only EasyEDA export and record capture metadata | Works on one controlled fixture and one real OSHWHub project |
| `inspect-schematic` | List components, pins, labels, nets, sheets and raw object selectors | Has `refs`, `facts`, and `raw` commands with stable JSON output |
| `classify-easyeda-primitives` | Separate components, net labels, ports, power flags, wires, buses and title-block artifacts | Fixes the current one-pin `U?` pseudo-component issue on captured data |
| `trace-net` | Resolve net membership from a pin, label, port or power symbol selector | Deterministic traces for `GND`, `+3V3`, `NRST`, `BOOT0`, `CANH`, `CANL` |
| `diff-schematic-graph` | Compare two readback graphs or source-vs-generated graphs | Produces stable structural diffs and ignores harmless ordering changes |

### Review Skills

These can use the readback skills as prerequisites.

| Skill | Purpose | Production gate |
|---|---|---|
| `review-stm32-minimum-system` | Check power, ground, reset, boot, SWD, clock and decoupling for STM32 designs | Upgrades the current placeholder with schemas, fixtures and evals |
| `review-can-interface` | Check CAN transceiver nets, termination, connector exposure and MCU TX/RX routing | Passes at least one FOC board and one CAN board fixture |
| `review-buck-power-stage` | Check VIN/VOUT/GND/SW/FB topology and common missing parts | Passes one controlled buck fixture and one public power module |
| `review-usb-uart-interface` | Check USB connector, D+/D-, ESD, VBUS, UART TX/RX and reset/boot conveniences | Passes one small module and one MCU dev-board fixture |
| `analyze-power-tree` | Summarize rails, sources, consumers and obvious missing ground/power structure | Emits deterministic rail facts before any prose summary |

### Generation Bridge Skills

These are useful later, but they must stay read-only until the typed `DesignPlan` write flow exists.

| Skill | Purpose | Safety rule |
|---|---|---|
| `roundtrip-schematic-plan` | Convert a read graph into a typed plan for an equivalent draft schematic | Generates `DesignPlan` only; no direct EasyEDA writes |
| `semantic-to-schematic-plan` | Convert user intent into components, nets and constraints | Must produce dry-run preview and validation report |
| `apply-design-plan` | Eventually apply a validated plan to an EDA backend | Requires human approval, validation and rollback/reject handling |

For v0.1, implement only readback and review skills. Direct EasyEDA mutation remains out of scope.
