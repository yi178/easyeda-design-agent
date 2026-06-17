# SchematicSnapshot Schema v0.1

This document describes the read-only schematic snapshot consumed by graph and validation packages.

## Top-Level Fields

| Field | Type | Required | Notes |
|---|---|---:|---|
| `schemaVersion` | string | yes | Currently `0.1` |
| `kind` | string | yes | Must be `schematic` |
| `snapshotId` | string | yes | Stable ID for the capture |
| `fingerprint` | string | recommended | Stable hash of normalized content |
| `project` | object | yes | Project metadata |
| `documents` | array | yes | Schematic documents |
| `sheets` | array | yes | Schematic sheets/pages |
| `components` | array | yes | Component instances |
| `pins` | array | yes | Pin objects flattened by component |
| `wires` | array | optional | Wire geometry |
| `labels` | array | optional | Net labels, ports, power flags |
| `noConnects` | array | optional | Intentional no-connect markers |
| `nets` | array | optional | Explicit netlist if available |
| `erc` | array | optional | ERC results |

## Component

```json
{
  "uuid": "cmp-u1",
  "sheetId": "sheet-1",
  "ref": "U1",
  "device": "mcu",
  "value": "STM32F103C8T6",
  "x": 430,
  "y": 360
}
```

## Pin

```json
{
  "sheetId": "sheet-1",
  "ref": "U1",
  "pinNumber": "24",
  "pinName": "VDD",
  "x": 100,
  "y": 170,
  "electricalType": "power"
}
```

## Wire

```json
{
  "id": "w1",
  "sheetId": "sheet-1",
  "points": [[100, 100], [130, 100]]
}
```

## Label

```json
{
  "id": "l1",
  "sheetId": "sheet-1",
  "name": "+3V3",
  "x": 130,
  "y": 100,
  "kind": "power-flag"
}
```

## Net

```json
{
  "name": "+3V3",
  "endpoints": [
    { "ref": "U1", "pin": "24" },
    { "ref": "C2", "pin": "1" }
  ]
}
```

## Normalization Rules

- References must be trimmed strings.
- Pin numbers must be strings, even when numeric.
- Coordinates use EasyEDA schematic coordinate units until an adapter-level unit conversion is introduced.
- Nets should contain unique endpoint pairs.
- Same-name labels across sheets may merge only when EasyEDA semantics say they are global.
