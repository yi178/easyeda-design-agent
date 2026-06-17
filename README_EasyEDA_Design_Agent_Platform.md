# EasyEDA Design Agent Platform

> 面向嘉立创 EDA / EasyEDA Pro 的 AI 硬件设计平台。  
> 目标是让 AI 从“辅助读取和修改已有工程”逐步增强到“从语义需求生成可审查的原理图、PCB 布局、布线约束和验证报告”。

> 当前项目定位：**AI 辅助硬件设计工程平台，而不是一键全自动画板工具。**

---

## 1. 项目愿景

中等复杂度电子项目通常包含 MCU、电源、通信接口、传感器、保护电路、调试接口、模拟采样、PCB 布局布线和制造输出。  
这类项目对初学者来说难点不只是“会不会操作 EDA”，而是：

- 能不能理解复杂原理图；
- 能不能判断电源树、接口、去耦、保护、封装是否正确；
- 能不能根据电气规则和制造规则设计 PCB；
- 能不能在 DRC/ERC 之外加入领域规则检查；
- 能不能把设计过程变成可复用、可审查、可迭代的工程流程。

本项目希望构建一个 AI 硬件设计平台，使 AI 能够：

1. 精确读取 EasyEDA Pro 原理图和 PCB；
2. 将原理图和 PCB 转换为统一设计图谱；
3. 基于设计意图、器件知识库和规则库分析工程；
4. 通过语义化编辑安全修改原理图；
5. 在强制约束和优化目标下生成 PCB 器件摆放计划；
6. 编排关键网络布线、自动布线器和验证流程；
7. 通过 Design Plan、dry-run、人工确认和 Validation Gate 形成安全闭环；
8. 最终逐步扩展到从语义需求生成可审查的原理图和 PCB 初稿。

---

## 2. 项目不是做什么

本项目不是：

- 不是让 AI 任意执行 JavaScript 修改 EDA 工程；
- 不是一个简单的 EasyEDA MCP 工具集合；
- 不是“用户一句话 → AI 无审核直接下单”的全自动设计器；
- 不是替代硬件工程师；
- 不是第一阶段就支持高速 DDR、复杂 RF、大功率电源、车规 ECU 或安全关键医疗电子。

本项目更适合：

- 学生和个人开发者；
- 嵌入式和机器人方向学习者；
- 使用嘉立创 EDA 的硬件入门工程师；
- 想把 AI 引入原理图审查、PCB 检查、局部布局优化和制造前检查的开发者；
- 想构建可复用硬件设计 Skills 的开源协作者。

---

## 3. 核心思想

### 3.1 先理解，再修改，再生成

项目按能力阶梯推进：

```text
已有工程读取
  → 复杂原理图 / PCB 语义理解
  → 安全修改已有原理图
  → PCB 规则检查和局部布局优化
  → 规则驱动布线
  → 从语义需求生成原理图初稿
  → 从原理图生成受约束 PCB 初稿
  → 制造前验证和报告
```

### 3.2 AI 不直接改板，而是生成 Design Plan

AI 不应该直接调用 EDA API，也不应该直接执行任意 JS。  
AI 应生成结构化计划：

```json
{
  "planId": "plan-buck-layout-001",
  "skill": "layout-buck-power-stage",
  "mode": "dry-run",
  "operations": [
    {
      "type": "component.move",
      "target": { "reference": "CIN1" },
      "reason": "Move input capacitor closer to U1 VIN and PGND pins",
      "parameters": {
        "xMm": 32.4,
        "yMm": 18.7,
        "rotationDeg": 90
      }
    }
  ],
  "checks": [
    "no-new-drc",
    "buck-input-loop-area",
    "feedback-keepout-from-switch-node"
  ]
}
```

执行前必须经过：

```text
Schema 校验
→ 权限校验
→ dry-run
→ 差异预览
→ 人工确认
→ 执行
→ ERC / DRC / 领域验证
→ 接受或回滚
```

### 3.3 强约束 + 软目标

PCB 布局布线不能只靠 AI 感觉，需要明确区分：

#### Hard Constraints：强制约束

必须满足，否则不能执行或必须回滚。

- 器件不能重叠；
- 焊盘不能越出板框；
- 固定连接器不能移动；
- 线宽不能小于 netclass；
- 间距不能小于制造规则；
- 高压网络必须满足安全间距；
- 不能产生新增阻断级 DRC；
- 不能破坏原理图与 PCB 的网络一致性。

#### Soft Objectives：优化目标

用于评分和迭代优化。

- 去耦电容尽量靠近芯片电源脚；
- Buck 输入回路面积尽量小；
- SW 节点面积尽量小；
- FB 线远离 SW 节点；
- 关键网络尽量短；
- 相关器件尽量聚类；
- 连接器靠近板边；
- 丝印尽量可读；
- 过孔数量尽量少；
- 热源远离敏感模拟电路。

---

## 4. 推荐架构

```text
User Requirement
      ↓
AI Agent / Codex / Claude Code
      ↓
Skill Selector
      ↓
Design Skills
      ↓
Unified Design Graph
      ↓
Constraint Engine + Optimization Engine
      ↓
Design Plan Engine
      ↓
Dry-run Preview + Human Approval
      ↓
EasyEDA Adapter
      ↓
EasyEDA Bridge Extension
      ↓
EasyEDA Pro
      ↓
ERC / DRC / Domain Validators
      ↓
Design Result + History + Eval
```

---

## 5. 系统模块

### 5.1 EasyEDA Bridge Extension

运行在 EasyEDA Pro 内部，只负责：

- 建立 WebSocket 连接；
- 调用 EasyEDA Pro API；
- 读取工程对象；
- 执行白名单原子操作；
- 返回 before / after 状态；
- 支持基础事务和回滚；
- 上报能力。

不负责：

- AI 推理；
- Buck 设计规则；
- 器件选型；
- 复杂布局策略；
- 自动下单；
- 任意 JS 执行。

### 5.2 EasyEDA Adapter

将 EasyEDA 内部对象转换为平台统一数据结构：

- symbol → schematic component；
- pin → logical pin；
- net → net graph；
- footprint → PCB component；
- pad → physical pad；
- track / via / copper → routing geometry；
- DRC / ERC → violation report。

所有上层模块只依赖统一 IR，不直接依赖 EasyEDA API。

### 5.3 Unified Design Graph

统一表示原理图、PCB、规则和设计意图。

包括：

```text
SchematicGraph
PCBGraph
ComponentGraph
PinGraph
PadGraph
NetGraph
PowerTreeGraph
FunctionalBlockGraph
ConstraintGraph
ViolationGraph
```

### 5.4 Skill Runtime

每个 Skill 是一个可复用工程包，而不是单纯 Prompt。

示例：

```text
skills/
├── analyze-power-tree/
├── check-decoupling/
├── analyze-buck-power-stage/
├── layout-buck-power-stage/
├── review-stm32-minimum-system/
├── review-can-interface/
├── add-ground-vias/
└── manufacturing-review/
```

每个 Skill 推荐包含：

```text
SKILL.md
input.schema.json
output.schema.json
scripts/
references/
fixtures/
evals/
```

### 5.5 Constraint Engine

负责强制约束检查：

- 板框约束；
- 器件碰撞；
- 禁布区；
- 最小线宽；
- 最小间距；
- 器件固定；
- 层限制；
- 网络规则；
- DRC 不退化。

### 5.6 Optimization Engine

负责局部布局优化和候选方案评分：

- wirelength；
- loop area；
- congestion；
- decoupling distance；
- switch-node area；
- feedback keepout；
- thermal distance；
- via estimation；
- module clustering score。

初期使用启发式 + 局部搜索，后期再考虑模拟退火、遗传算法、强化学习或 GNN。

### 5.7 Plan Engine

负责：

- Design Plan Schema 校验；
- stale snapshot 检查；
- dry-run；
- diff preview；
- 人工确认；
- 白名单执行；
- 事务记录；
- 回滚；
- 生成 Design Result。

### 5.8 Validators

验证分为通用验证和领域验证。

通用验证：

```text
SchemaValidator
PermissionValidator
GeometryValidator
ErcValidator
DrcValidator
ManufacturingValidator
```

领域验证：

```text
PowerTreeValidator
DecouplingDistanceValidator
BuckLoopValidator
SwitchNodeValidator
FeedbackRoutingValidator
CanTerminationValidator
UsbDifferentialPairValidator
McuBootPinValidator
CrystalLayoutValidator
```

---

## 6. 数据结构草案

### 6.1 Design Spec

```yaml
project:
  type: robot_controller_board
  difficulty: medium
  targetEda: easyeda-pro

power:
  inputs:
    - name: VIN
      voltage: 24
      currentMax: 5
  rails:
    - name: 5V
      voltage: 5
      currentMax: 3
      topology: buck
    - name: 3V3
      voltage: 3.3
      currentMax: 1
      topology: ldo

control:
  mcu:
    family: STM32
    interfaces:
      - SWD
      - UART
      - CAN

constraints:
  manufacturableBy: JLCPCB
  preferHandSolderable: true
  boardLayers: 2
```

### 6.2 Module Graph

```yaml
modules:
  - id: input_protection
    type: protection
    outputs: [VIN_PROTECTED]

  - id: buck_5v
    type: buck_converter
    inputs: [VIN_PROTECTED]
    outputs: [5V]

  - id: ldo_3v3
    type: ldo
    inputs: [5V]
    outputs: [3V3]

  - id: stm32_core
    type: mcu_core
    inputs: [3V3]
    interfaces: [SWD, UART, CAN]
```

### 6.3 Schematic Operation

```json
{
  "op": "add_decoupling_capacitor",
  "targetIc": "U3",
  "powerPin": "VDD",
  "groundPin": "VSS",
  "value": "100nF",
  "net": "3V3",
  "reason": "U3 VDD has no local decoupling capacitor"
}
```

### 6.4 PCB Placement Plan

```json
{
  "planId": "placement-buck-u1-001",
  "module": "buck_5v",
  "hardConstraints": [
    "no_component_overlap",
    "inside_board_outline",
    "no_new_blocking_drc"
  ],
  "softObjectives": [
    "minimize_input_loop_area",
    "minimize_switch_node_area",
    "maximize_feedback_distance_from_switch_node"
  ],
  "operations": [
    {
      "type": "component.move",
      "target": "CIN1",
      "relativeTo": "U1.VIN",
      "distanceMm": 2.5
    }
  ]
}
```

---

## 7. 开发路线图

### V0.1：只读工程理解

目标：

- 连接 EasyEDA Pro；
- 读取当前工程；
- 读取原理图符号、引脚、网络；
- 读取 PCB 器件、焊盘、走线、过孔；
- 建立 SchematicSnapshot 和 BoardSnapshot；
- 生成项目概览报告；
- 不允许写操作。

### V0.2：统一设计图谱

目标：

- 建立 SchematicGraph；
- 建立 PCBGraph；
- 建立 Symbol ↔ Footprint ↔ Pad ↔ Net 映射；
- 识别电源树；
- 识别功能模块；
- 识别信号类型；
- 输出设计审查报告。

### V0.3：原理图语义编辑

目标：

- 支持 add_component；
- 支持 connect_pin；
- 支持 add_net_label；
- 支持 add_decoupling_cap；
- 支持 assign_footprint；
- 支持 ERC；
- 所有修改走 SchematicPlan + dry-run + 人工确认。

### V0.4：PCB 规则检查

目标：

- 去耦距离检查；
- 电源线宽检查；
- Buck 输入回路检查；
- SW 节点检查；
- FB 线避让检查；
- CAN 终端检查；
- MCU BOOT/RESET/SWD 检查；
- 生成领域验证报告。

### V0.5：低风险 PCB 修改

目标：

- component.move；
- component.rotate；
- via.create；
- silkscreen.adjust；
- DRC 比较；
- 失败回滚。

### V0.6：局部布局优化

目标：

- Buck 功率级局部布局；
- STM32 去耦局部布局；
- CAN 接口局部布局；
- USB 接口局部布局；
- 强约束过滤；
- 软目标评分；
- 候选方案对比。

### V0.7：布线编排

目标：

- netclass 生成；
- keepout 生成；
- 关键网络规则布线；
- Freerouting DSN/SES 流程；
- DRC 和专项检查；
- 布线结果评分。

### V0.8：从语义需求生成原理图初稿

目标：

- Requirement Parser；
- Design Spec；
- Module Graph；
- Component Selector；
- SchematicPlan；
- ERC；
- datasheet / pin-role / topology validation；
- 人工确认。

### V1.0：中等复杂项目完整闭环

目标演示项目：

```text
STM32 + 24V 输入 + Buck 5V/3A + LDO 3V3 + CAN + UART + 电流采样 + OLED + 调试接口
```

完整流程：

```text
自然语言需求
→ Design Spec
→ Module Graph
→ 原理图生成
→ ERC / 规则验证
→ PCB 模块布局
→ 关键网络约束
→ 布线编排
→ DRC / 领域验证
→ 制造审查报告
```

---

## 8. 推荐仓库结构

```text
easyeda-design-agent/
├── README.md
├── AGENTS.md
├── LICENSE
├── docs/
│   ├── architecture.md
│   ├── reference-projects.md
│   ├── design-ir.md
│   ├── skill-authoring.md
│   ├── safety.md
│   └── roadmap.md
│
├── apps/
│   ├── easyeda-bridge-extension/
│   ├── mcp-server/
│   ├── cli/
│   └── dashboard/
│
├── packages/
│   ├── protocol/
│   ├── design-ir/
│   ├── easyeda-adapter/
│   ├── graph-engine/
│   ├── constraint-engine/
│   ├── optimization-engine/
│   ├── plan-engine/
│   ├── validators/
│   ├── skill-runtime/
│   ├── component-knowledge-base/
│   └── report-generator/
│
├── skills/
│   ├── analyze-power-tree/
│   ├── check-decoupling/
│   ├── analyze-buck-power-stage/
│   ├── layout-buck-power-stage/
│   ├── review-stm32-minimum-system/
│   ├── review-can-interface/
│   ├── route-critical-nets/
│   └── manufacturing-review/
│
├── projects/
│   └── programmable-power-supply/
│       ├── design-spec.yaml
│       ├── constraints.yaml
│       ├── manufacturing.yaml
│       └── agent-policy.yaml
│
├── fixtures/
│   ├── snapshots/
│   ├── schematic-graphs/
│   ├── pcb-graphs/
│   └── plans/
│
└── evals/
    ├── schematic-understanding/
    ├── schematic-editing/
    ├── placement-optimization/
    ├── routing-validation/
    └── manufacturing-review/
```

---

## 9. 适合的第一个旗舰项目

建议使用：

```text
AI 辅助可编程实验室电源 / 机器人底盘控制板
```

原因：

- 包含 MCU；
- 包含 Buck / LDO 电源；
- 包含 CAN / UART；
- 包含调试接口；
- 包含电流/电压采样；
- 有功率和信号混合布局；
- 有清晰可验证的规则；
- 适合学习嵌入式、PCB、电源、通信和制造。

第一版不要做完整项目，先做：

```text
Buck 模块 + STM32 最小系统 + CAN 接口
```

---

## 10. 安全原则

1. 默认只读；
2. 所有写操作必须有 Design Plan；
3. 所有写操作先 dry-run；
4. 高风险操作需要人工确认；
5. 禁止自动下单；
6. 禁止任意 JavaScript 执行作为主架构；
7. 制造输出必须人工批准；
8. Skill 必须有输入输出 Schema 和 Eval；
9. 每次修改必须保存前后快照；
10. DRC/ERC 或领域验证退化时必须回滚或标记失败。

---

## 11. 当前阶段建议

当前最值得优先实现：

```text
1. EasyEDA 只读连接
2. SchematicSnapshot
3. BoardSnapshot
4. Unified Design Graph
5. PowerTree 分析
6. FunctionalBlock 识别
7. Markdown 设计审查报告
```

不要一开始急着做全自动布线或全板布局。  
**复杂读取能力是后续所有 AI 自行设计能力的地基。**

---

## 12. 许可证建议

如果希望项目被广泛复用，推荐：

- MIT：简单宽松；
- Apache-2.0：更适合中大型工程和专利条款；
- GPL：如果强制开源衍生项目，但会限制商业采用。

建议核心平台使用 **Apache-2.0**。  
如果集成 GPL 项目，例如 Freerouting，建议作为外部可选工具调用，不要直接把 GPL 代码嵌入核心库。

---

## 13. 一句话项目介绍

中文：

> 一个面向嘉立创 EDA 的 AI 硬件设计平台，支持复杂原理图/PCB 语义理解、语义化原理图编辑、强约束 PCB 布局优化、规则驱动布线和验证门禁，目标是让 AI 逐步具备设计中等复杂电子项目的能力。

英文：

> An EasyEDA-first AI hardware design platform for schematic understanding, semantic editing, constraint-driven PCB placement, rule-guided routing, and validation-gated design iteration.

