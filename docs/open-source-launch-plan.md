# GitHub 开源项目启动方案

## 1. 推荐项目名称

首推：

```text
easyeda-design-agent
```

原因：

- 清楚表达目标平台是 EasyEDA-first。
- `design-agent` 比 `pcb-agent` 更准确，覆盖原理图、PCB、验证和报告。
- 不把项目限定成 MCP server、插件或自动布线器。
- 名称适合 GitHub、npm package scope、CLI 和文档站。

备选名称：

| 名称 | 判断 |
|---|---|
| `easyeda-design-agent` | 推荐，清晰、稳健、长期可扩展 |
| `easyeda-ai-hardware` | 可用，但略泛 |
| `easyeda-copilot` | 不建议，容易和 GitHub Copilot / Microsoft 品牌混淆 |
| `ai-eda-platform` | 不建议，范围过大且缺少 EasyEDA 差异化 |
| `jlc-design-agent` | 可用，但 JLC/嘉立创品牌边界需要谨慎 |
| `eda-design-agent` | 可用，但不如 EasyEDA-first 明确 |
| `circuit-agent` | 可用，但已有类似命名概率较高 |

推荐 GitHub 仓库：

```text
github.com/<your-org>/easyeda-design-agent
```

推荐 npm scope：

```text
@easyeda-design-agent/protocol
@easyeda-design-agent/design-ir
@easyeda-design-agent/easyeda-adapter
```

如果担心名称过长，可以在 README 中使用短简称：

```text
EDA Agent
```

但仓库名仍建议保持 `easyeda-design-agent`。

## 2. 一句话定位

中文：

> 一个面向嘉立创 EDA / EasyEDA Pro 的 AI 硬件设计平台，支持原理图和 PCB 结构化读取、统一设计图谱、设计审查、Design Plan、dry-run 和验证门禁。

英文：

> An EasyEDA-first AI hardware design platform for structured schematic/PCB understanding, design graph analysis, review skills, dry-run design plans, and validation-gated edits.

## 3. GitHub 开源边界

第一版开源仓库不要承诺“一句话自动画完整 PCB”。推荐公开边界：

```text
Read first.
Review first.
Plan before edit.
Validate before accept.
```

首发 README 应明确：

- 默认只读。
- 不自动下单。
- 不执行任意 JavaScript。
- 不替代硬件工程师。
- 写操作必须走 Design Plan。
- 设计输出是可审查初稿，不是免审生产资料。

## 4. 首发版本范围

建议首发版本为：

```text
v0.1.0-readonly-graph
```

目标：

- EasyEDA Bridge Extension 能导出当前工程 snapshot。
- CLI 能读取 snapshot JSON。
- Adapter 能生成 Unified Design Graph。
- Skills 能生成 Markdown 设计审查报告。
- fixtures/evals 能离线回归。

不做：

- 不自动新建工程。
- 不生成完整原理图。
- 不自动布线。
- 不导出生产文件。
- 不支持高速 DDR/RF/安规关键设计。

## 5. 推荐仓库结构

```text
easyeda-design-agent/
├── README.md
├── AGENTS.md
├── LICENSE
├── SECURITY.md
├── CONTRIBUTING.md
├── CODE_OF_CONDUCT.md
├── package.json
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── docs/
│   ├── architecture.md
│   ├── bridge-contract.md
│   ├── design-ir.md
│   ├── safety.md
│   ├── skill-authoring.md
│   └── roadmap.md
├── apps/
│   ├── easyeda-bridge-extension/
│   ├── cli/
│   ├── mcp-server/
│   └── dashboard/
├── packages/
│   ├── protocol/
│   ├── design-ir/
│   ├── easyeda-adapter/
│   ├── graph-engine/
│   ├── validators/
│   ├── plan-engine/
│   ├── skill-runtime/
│   ├── report-generator/
│   └── component-kb/
├── skills/
│   ├── analyze-power-tree/
│   ├── check-decoupling/
│   ├── review-stm32-minimum-system/
│   └── manufacturing-review/
├── fixtures/
│   ├── snapshots/
│   ├── design-graphs/
│   └── plans/
└── evals/
    ├── snapshot-readback/
    ├── graph-building/
    ├── review-skills/
    └── plan-validation/
```

## 6. 长期架构

见 [github-open-architecture.mmd](github-open-architecture.mmd)。

分层原则：

```text
EasyEDA API 只出现在 Bridge Extension 和 Adapter 内。
AI Agent 只能接触 Snapshot、DesignGraph、Skill 和 DesignPlan。
写操作只能由 Plan Engine 转换为白名单 RPC。
Validation Gate 决定结果是否可接受。
```

核心模块职责：

| 模块 | 职责 |
|---|---|
| `apps/easyeda-bridge-extension` | EasyEDA Pro 内部扩展，白名单 RPC、读取对象、执行低风险操作 |
| `apps/cli` | 离线分析、报告生成、fixture/eval 入口 |
| `apps/mcp-server` | 面向 Codex/Claude/Cursor 等 AI 工具暴露高层工具 |
| `packages/protocol` | RPC envelope、capabilities、operation schema、snapshot schema |
| `packages/design-ir` | SchematicSnapshot、BoardSnapshot、UnifiedDesignGraph 类型 |
| `packages/easyeda-adapter` | EasyEDA 对象到平台 IR 的转换 |
| `packages/graph-engine` | 网络图、电源树、功能模块识别 |
| `packages/validators` | ERC/DRC 摘要、领域规则、制造规则 |
| `packages/plan-engine` | DesignPlan schema、dry-run、diff、approval、apply、rollback |
| `packages/skill-runtime` | Skill 输入输出 schema、执行、eval |
| `packages/report-generator` | Markdown/HTML/JSON 报告 |

## 7. MCP 工具边界

不要把底层 EasyEDA 原子操作全部暴露给模型。推荐 MCP 只暴露高层工具：

```text
eda_get_snapshot
eda_build_design_graph
eda_run_review
eda_create_plan
eda_preview_plan
eda_apply_approved_plan
eda_run_validation
skill_list
skill_run
```

暂不暴露：

```text
raw_js_execute
direct_component_move
direct_track_create
direct_gerber_export
direct_order_submit
```

## 8. 开源发布步骤

### Step 1：创建空仓库

GitHub 仓库建议：

```text
easyeda-design-agent
```

勾选：

- Public
- Apache-2.0 License
- README
- Issues
- Discussions

### Step 2：迁移现有资产

从 `E:\aIdo\eadproject1` 迁移：

- protocol / bridge contract
- plan validation
- fingerprint
- dry-run preview
- runner/checker 思路
- bridge plugin dispatcher

从 `E:\aIdo\eda` 迁移：

- STM32 fixture
- EasyEDA API 调用经验
- device resolver 经验
- generation issue log

但不要迁移为主线：

- 自动 createProject 业务流
- 插件内 STM32 专用生成逻辑
- 固定坐标板卡生成器作为核心入口

### Step 3：先做 README，而不是先写大量代码

README 首屏建议包含：

```text
What it is
What it is not
Current status
Architecture diagram
Quick start with fixture
Safety model
Roadmap
```

### Step 4：建立 CI

最小 CI：

```text
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm eval
```

V0.1 eval 至少包含：

- snapshot schema validation
- graph build from fixture
- power tree report
- decoupling report
- bridge batch rejection tests

### Step 5：发布 v0.1.0

v0.1.0 的 release note 应该强调：

```text
Readonly snapshot and graph analysis preview.
No write operations enabled by default.
```

## 9. Roadmap

```text
v0.1 Readonly Snapshot + Design Graph
v0.2 PowerTree / FunctionalBlock / Review Skills
v0.3 Design Plan Schema + Dry-run Preview
v0.4 Low-risk PCB edits with approval
v0.5 Domain validators: decoupling, STM32, CAN, buck
v0.6 Local placement optimization
v0.7 Routing orchestration with external autorouter
v1.0 Medium-complexity board workflow
```

## 10. 技术栈建议

推荐：

- TypeScript
- pnpm workspace
- Zod 或 TypeBox 做 schema
- Vitest 做单元测试
- Mermaid 做架构图
- Markdown/JSON 做报告和中间产物
- MCP SDK 做 AI 工具接入

暂不建议：

- 一开始上数据库。
- 一开始做复杂 dashboard。
- 一开始做多 Agent 编排。
- 一开始做自研 autorouter。
- 一开始做新的硬件 DSL。

## 11. 许可证

推荐：

```text
Apache-2.0
```

原因：

- 适合基础设施项目。
- 有专利条款。
- 商业采用阻力小。
- 比 MIT 更适合中长期平台型项目。

如果未来接入 GPL 工具，例如 Freerouting，建议作为外部可选 CLI 调用，不把 GPL 代码嵌入核心包。

## 12. 项目治理

建议从一开始建立：

- `SECURITY.md`：说明不接受自动下单、任意 JS 执行等高风险能力。
- `CONTRIBUTING.md`：说明 Skill 必须有 schema、fixture、eval。
- `AGENTS.md`：给 AI coding agents 的仓库级规则。
- Issue templates：bug、feature、skill proposal、EDA API compatibility。
- Labels：`bridge`、`design-ir`、`skill`、`validator`、`easyeda-api`、`good-first-issue`。

## 13. 最小可展示 Demo

首个公开 demo 推荐：

```text
读取 STM32 最小系统 fixture
-> 构建设计图谱
-> 检查电源树、BOOT0、NRST、晶振、去耦
-> 输出 Markdown 审查报告
-> 生成但不执行去耦布局优化 DesignPlan
```

这个 demo 能证明项目主张，同时不会陷入自动生成完整 PCB 的不稳定 API 风险。

## 14. 结论

建议按下面路线启动 GitHub 开源项目：

```text
Name: easyeda-design-agent
License: Apache-2.0
First release: v0.1.0-readonly-graph
Core promise: read, understand, review, plan, validate
Safety promise: no arbitrary JS, no direct write, no auto order
Architecture: Bridge Extension + Adapter + Design IR + Skills + Plan Engine + Validation Gate
```

最重要的取舍：先把“读懂真实 EasyEDA 工程”做到可靠，再逐步恢复 Design Plan 写操作。这个顺序比继续扩展自动生成板卡更适合开源协作，也更容易获得硬件工程师信任。
