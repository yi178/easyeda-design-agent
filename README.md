# easyeda-design-agent

An EasyEDA-first AI hardware design platform for structured schematic/PCB understanding, design graph analysis, review skills, dry-run design plans, and validation-gated edits.

## Status

This repository is being initialized as an open-source project. The first public milestone is intentionally read-only:

```text
EasyEDA / fixture snapshot
-> Unified Design Graph
-> validators
-> Markdown review report
```

Write operations, routing, manufacturing export, and ordering are not enabled by default.

## What It Is

`easyeda-design-agent` is a platform for building AI-assisted hardware design workflows around EasyEDA Pro / JLCEDA Pro.

The project focuses on:

- structured schematic and PCB snapshots;
- a unified design graph;
- review-oriented hardware skills;
- deterministic validators;
- design plans before edits;
- dry-run previews and validation gates.

## What It Is Not

This project is not:

- an arbitrary JavaScript execution bridge;
- a one-shot automatic PCB generator;
- an automatic ordering tool;
- a replacement for hardware engineering review;
- a first-release solution for DDR, RF, high-power, automotive, or safety-critical boards.

## Quick Start

Run the fixture review:

```powershell
npm test
```

Generate a Markdown report:

```powershell
npm run review:fixture
```

Generate a schematic-only readback report:

```powershell
npm run review:schematic
```

Validate a schematic snapshot exported from EasyEDA Pro:

```powershell
npm run test:schematic-captured -- path\to\schematic-snapshot.json
```

The report is written to:

```text
runs/stm32-minimal-review/report.md
```

## Architecture

See:

- [Open-source launch plan](docs/open-source-launch-plan.md)
- [Recommended project design](docs/recommended-project-design.md)
- [EasyEDA plugin usage](docs/easyeda-plugin-usage.md)
- [Architecture diagram](docs/github-open-architecture.svg)
- [Initial platform diagram](docs/architecture-v0.svg)

## Safety Model

Core rules:

- Default to read-only.
- No arbitrary JavaScript execution.
- No automatic manufacturing order.
- All write operations must use a typed `DesignPlan`.
- All write operations require dry-run preview and human approval.
- Every accepted change must pass validation gates.

## Roadmap

```text
v0.1 Readonly Snapshot + Design Graph
v0.2 PowerTree / FunctionalBlock / Review Skills
v0.3 Design Plan Schema + Dry-run Preview
v0.4 Low-risk PCB edits with approval
v0.5 Domain validators: decoupling, STM32, CAN, buck
v0.6 Local placement optimization
v0.7 Routing orchestration
v1.0 Medium-complexity board workflow
```

## License

Apache-2.0.
