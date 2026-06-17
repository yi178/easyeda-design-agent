# EasyEDA Bridge Extension

This app will host the EasyEDA Pro extension for read-only schematic capture.

V0.1 target methods:

```text
project.get_context
schematic.list_documents
schematic.get_active_snapshot
schematic.get_snapshot_by_document
schematic.run_erc
project.get_snapshot_fingerprint
```

The extension must not expose arbitrary JavaScript execution.

The extension must return normalized `SchematicSnapshot` JSON compatible with:

```text
docs/schematic-snapshot-schema.md
```

Implementation note: keep raw EasyEDA API interaction inside this app and `packages/easyeda-adapter`.
