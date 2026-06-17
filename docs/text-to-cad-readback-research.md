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
