# Agent Instructions

This repository is an AI-assisted hardware design platform. Treat EDA project data as safety-sensitive engineering data.

Rules:

- Do not add arbitrary JavaScript execution paths for EasyEDA.
- Do not add automatic ordering or payment flows.
- Default new EDA capabilities to read-only.
- All write operations must go through typed `DesignPlan` objects.
- Write operations must support dry-run preview, human approval, validation, and rollback/reject handling.
- Skills must include schemas, fixtures, and evals before they are considered production-ready.
- Keep EasyEDA-specific API calls inside bridge and adapter packages.
- Keep validators deterministic where possible; do not rely only on LLM judgment for electrical correctness.

