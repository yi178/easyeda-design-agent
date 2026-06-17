# EasyEDA Design Agent Platform 推荐项目设计

> 基于当前项目文档，以及两个早期尝试：
>
> - `E:\aIdo\eadproject1`
> - `E:\aIdo\eda`
>
> 结论：新项目应以 `eadproject1` 的 plan-first 平台骨架为主线，吸收 `eda/lceda-stm32-minimal` 的 EasyEDA API 实战经验，但第一阶段不要继续做“自动生成完整板卡”。应先完成稳定的只读 Snapshot、统一设计图谱和设计审查闭环。

## 1. 项目定位

项目应定位为：

```text
EasyEDA-first AI Hardware Design Platform
```

而不是：

```text
EasyEDA MCP tool collection
AI one-shot PCB generator
STM32 demo board generator
```

核心目标是让 AI 能够安全地理解、审查、规划并逐步修改 EasyEDA Pro 工程。所有写操作必须经过 Design Plan、dry-run、人工确认和验证门禁。

## 2. 两个早期尝试的评估

### 2.1 `E:\aIdo\eadproject1`

这是更接近目标平台的尝试。

已有价值：

- 已有 `design.json + rules.json -> DesignPlan -> preview -> bridge batch -> result -> report` 的离线垂直切片。
- 已有 plan validation、operation validation、base snapshot fingerprint、dry-run diff preview。
- 已有 EasyEDA Bridge contract、JSON-RPC batch、capabilities、simulator 和 result checker。
- 已有可构建的 `plugins/easyeda-bridge`，并且插件不是 STM32 专用。

主要不足：

- 当前 IR 仍是生成型 fixture，不是从 EasyEDA 当前工程读取出来的真实 Snapshot。
- `createInitialSnapshot` 是从 design spec 构造的虚拟快照，不是原理图和 PCB 的真实状态。
- operation schema 是手写校验，后续应升级为 JSON Schema 或 TypeScript schema 生成。
- Bridge handler 还缺少真实当前工程 snapshot readback、stale plan 拒绝、事务/checkpoint、before/after diff。
- 尚无 SchematicGraph、PCBGraph、PowerTreeGraph、FunctionalBlockGraph。

判断：

`eadproject1` 应作为新项目的架构母体，但需要把中心从“生成 STM32 fixture”转为“读取并分析已有 EasyEDA 工程”。

### 2.2 `E:\aIdo\eda`

这是一个具体 EasyEDA 扩展和 STM32 最小系统生成 demo。

已有价值：

- 证明了 EasyEDA Pro 扩展可以真实调用官方 API 放置器件、创建网络标签、创建 PCB 板框、移动器件和运行 DRC。
- 暴露了真实客户端中的不稳定 API 行为：`createProject`、`modifyBoardName`、`activateDocument`、`importChanges` 等都需要兜底。
- `stm32f103c8t6-minimal.json` 是很好的 fixture，可继续用于回归测试。
- `generation-issue-log.md` 对后续架构决策很重要：不能把第一阶段建立在全自动建工程和原理图导入 PCB 的稳定性假设上。

主要不足：

- 业务逻辑和 EasyEDA API 调用耦合在插件里。
- 是具体板卡生成器，不是通用 AI 硬件设计平台。
- 没有 Design Plan、统一 IR、dry-run diff、权限白名单、stale snapshot gate。
- 生成型逻辑过早进入写操作，不适合作为平台第一阶段核心。

判断：

`eda/lceda-stm32-minimal` 应作为 EasyEDA API 适配参考和 fixture 来源，不应作为新项目主架构。

## 3. 推荐总架构

见 [architecture-v0.mmd](architecture-v0.mmd)。

核心链路：

```text
EasyEDA Pro
-> Bridge Extension
-> Typed RPC
-> EasyEDA Adapter
-> SchematicSnapshot / BoardSnapshot
-> Unified Design Graph
-> Skills / Validators
-> Design Review Report
-> Design Plan
-> dry-run / approval / apply / validation
```

关键原则：

- Bridge Extension 只做白名单 RPC 和 EasyEDA API 调用。
- Adapter 负责把 EasyEDA 对象转换为平台 IR。
- 上层 Skill 不直接依赖 EasyEDA API。
- 第一阶段默认只读。
- 所有写操作都必须带 `baseSnapshotFingerprint`。
- 所有执行结果必须产生 before/after snapshot 和 validation report。

## 4. V0.1 应该做什么

V0.1 目标：

```text
读取已有 EasyEDA 工程
-> 生成 SchematicSnapshot / BoardSnapshot
-> 建立 UnifiedDesignGraph
-> 识别电源树和功能模块
-> 输出 Markdown 设计审查报告
```

V0.1 不做：

- 不自动新建工程。
- 不生成完整原理图。
- 不自动布线。
- 不自动导出 Gerber。
- 不把任意 JavaScript 执行暴露给 AI。
- 不直接承诺从自然语言生成完整板卡。

推荐 V0.1 操作集合：

```text
project.getContext
schematic.getSnapshot
pcb.getSnapshot
project.getSnapshotFingerprint
schematic.runDrc
pcb.runDrc
document.saveReadOnlyArtifacts
```

注意：`document.saveReadOnlyArtifacts` 指保存平台侧 JSON/Markdown 报告，不应修改 EDA 设计文件。

## 5. V0.1 仓库结构

建议用 TypeScript monorepo：

```text
easyeda-design-agent/
├── README.md
├── AGENTS.md
├── docs/
│   ├── architecture.md
│   ├── design-ir.md
│   ├── bridge-contract.md
│   ├── safety.md
│   └── roadmap.md
├── apps/
│   ├── easyeda-bridge-extension/
│   ├── cli/
│   └── mcp-server/
├── packages/
│   ├── protocol/
│   ├── easyeda-adapter/
│   ├── design-ir/
│   ├── graph-engine/
│   ├── validators/
│   ├── plan-engine/
│   ├── skill-runtime/
│   └── report-generator/
├── skills/
│   ├── analyze-power-tree/
│   ├── check-decoupling/
│   ├── review-stm32-minimum-system/
│   └── manufacturing-review/
├── fixtures/
│   ├── easyeda-snapshots/
│   ├── schematic-graphs/
│   └── reports/
└── evals/
    ├── snapshot-readback/
    ├── graph-building/
    └── review-reports/
```

## 6. 可复用资产迁移

从 `eadproject1` 迁移：

- `packages/easyeda-protocol/bridge-v0-1.mjs` 的 capabilities、batch 和 validation 思路。
- `packages/core/fingerprint.mjs` 的 snapshot fingerprint 思路。
- `packages/core/plan-preview.mjs` 的 dry-run preview 思路。
- `apps/check-run` 的回归检查方式。
- `plugins/easyeda-bridge/src/dispatcher.ts` 的 method whitelist 模式。

需要重写或升级：

- `packages/core/validate.mjs`：改为 schema 驱动，支持 Snapshot 和 Graph。
- `packages/core/plan.mjs`：V0.1 暂不以生成板卡为中心，改为 report plan / review skill。
- `plugins/easyeda-bridge/src/handlers.ts`：优先补 snapshot read handlers，而不是继续扩写生成操作。

从 `eda/lceda-stm32-minimal` 迁移：

- `design/stm32f103c8t6-minimal.json` 作为 fixture。
- `device-resolver.ts` 中的器件解析经验。
- `schematic.ts` 中读取/校验 pin 的逻辑。
- `pcb.ts` 中 PCB component readback、fallback、DRC 经验。
- `docs/generation-issue-log.md` 的 API 风险结论。

不建议迁移为主线：

- 自动 `createProject` 流程。
- 插件内直接生成 STM32 业务逻辑。
- 具体板卡的固定坐标布局作为核心平台逻辑。

## 7. 数据模型优先级

V0.1 最小 IR：

```text
ProjectSnapshot
SchematicSnapshot
BoardSnapshot
ComponentNode
PinNode
PadNode
NetNode
PlacementNode
ViolationNode
DesignGraph
ReviewReport
```

V0.2 再扩展：

```text
PowerTreeGraph
FunctionalBlockGraph
ConstraintGraph
DomainRule
DesignPlan
PlanPreview
DesignResult
```

## 8. 推荐迭代路线

### Milestone 1：只读 Bridge

验收：

- 插件能读取当前工程、当前原理图、当前 PCB。
- 能导出 JSON Snapshot。
- Snapshot 有稳定 fingerprint。
- 不提供写操作。

### Milestone 2：Adapter 和 DesignGraph

验收：

- EasyEDA snapshot 能转换为统一 IR。
- 能建立 component-pin-net-pad 映射。
- 能输出网络、未连接脚、电源网络、器件清单、DRC 摘要。

### Milestone 3：审查型 Skills

验收：

- `analyze-power-tree`
- `check-decoupling`
- `review-stm32-minimum-system`
- `manufacturing-review`

每个 Skill 都有输入 schema、输出 schema、fixture 和 eval。

### Milestone 4：Plan Engine 回归

验收：

- 恢复 `eadproject1` 的 Design Plan 能力。
- 写操作仍默认关闭。
- 能对离线 fixture 生成 dry-run preview。
- 所有 plan 必须绑定 base snapshot fingerprint。

### Milestone 5：低风险写操作

验收：

- 支持 `component.move`、`component.rotate`、`silkscreen.adjust` 等低风险操作。
- 执行前必须 dry-run 和人工确认。
- 执行后必须 DRC/领域验证。
- 失败能回滚或标记不可接受。

## 9. 第一版旗舰演示

不要第一版就做完整机器人控制板。推荐演示：

```text
读取一个已有 STM32 最小系统工程
-> 生成设计图谱
-> 检查去耦、电源脚、BOOT0、NRST、晶振
-> 输出审查报告
-> 对 PCB 上去耦电容距离给出优化建议
-> 生成但不执行 component.move Design Plan
```

这样能覆盖：

- EasyEDA 读取能力；
- IR/Graph；
- 领域规则；
- report；
- plan-first；
- dry-run；
- 人工确认前停止。

## 10. 最终建议

新项目应从 `eadproject1` 继续，而不是从 `eda/lceda-stm32-minimal` 继续。

具体做法：

1. 在新仓库中采用 `eadproject1` 的 monorepo 和 plan/bridge 思路。
2. 把中心任务改成读取当前 EasyEDA 工程，而不是从 JSON 生成 STM32 板。
3. 从 `eda` 迁移 EasyEDA API 经验和 STM32 fixture。
4. V0.1 只读，V0.2 图谱，V0.3 审查，V0.4 再恢复低风险 Design Plan 写操作。
5. 始终保持安全边界：Bridge 白名单、typed RPC、snapshot fingerprint、dry-run、人工确认、验证门禁。
