# AI EDA / AI PCB 开源项目与架构参考调研

> 调研日期：2026-06-17  
> 目标：为 `EasyEDA Design Agent Platform` 建立参考项目清单、架构借鉴方向和技术路线判断。  
> 结论：当前已有很多局部相关项目，但还没有一个开源项目完整覆盖“EasyEDA + 复杂原理图理解 + 语义编辑 + Design IR + 强约束 PCB 布局 + 规则驱动布线 + Skill/Eval + 验证闭环”。

---

## 1. 总体判断

你的项目不应该只做：

```text
EasyEDA MCP Server
```

也不应该只做：

```text
AI 自动画 PCB Demo
```

更合理的定位是：

```text
EasyEDA-first AI Hardware Design Platform
```

也就是：

> 以 EasyEDA Pro / 嘉立创 EDA 为第一目标，构建一个支持复杂原理图和 PCB 读取、语义化编辑、约束布局、规则布线、验证门禁和持续 Skill 迭代的 AI 硬件设计平台。

现有项目大致分为七类：

1. EasyEDA 官方 API / Skill / Gateway；
2. EasyEDA 社区 MCP / AI assistant；
3. KiCad AI / MCP / Skill 项目；
4. Design IR / Circuit JSON / 电路中间表示项目；
5. 代码化硬件设计项目；
6. 自动布线和 PCB 优化项目；
7. AI 原理图生成和研究论文。

---

# 2. EasyEDA / 嘉立创 EDA 相关项目

## 2.1 EasyEDA 官方 `easyeda-api-skill`

- 项目地址：<https://github.com/easyeda/easyeda-api-skill>
- 类型：官方 EasyEDA Pro API Skill
- 关键词：AI coding tools、API Skill、WebSocket Bridge、EasyEDA Pro API
- 参考价值：极高

### 项目简介

`easyeda-api-skill` 是 EasyEDA 官方提供的 AI Skill 包，面向 Claude Code、OpenCode、QwenCode 等支持 Agent Skills 标准的 AI 编程工具。公开说明中提到，它为 AI 编程工具提供 EasyEDA Pro API 接口和 WebSocket 桥接能力。

EasyEDA 官方账户也将其描述为“EasyEDA Pro AI SKILL provides a complete EasyEDA Pro API interface and WebSocket bridging capability for AI programming tools”。

### 值得借鉴

1. **AI Skill 与 EDA API 结合方式**
   - 使用 Skill 把 EDA API 文档和调用流程提供给 AI；
   - 适合让 AI 快速理解 EasyEDA Pro API。

2. **Bridge Server 架构**
   - AI 工具不直接进入 EDA；
   - 通过本地 Bridge Server 与 EDA 扩展通信。

3. **官方 API 文档组织**
   - 可作为你项目早期 API wrapper 的重要参考。

4. **EasyEDA 生态正向支持 AI 工具**
   - 这说明 EasyEDA-first 路线不是逆向破解，而是有官方 API 和扩展基础。

### 不足

当前官方方案更偏：

```text
AI 发送 JavaScript / API 调用
→ Gateway 执行
```

它没有完整解决：

- 类型化 RPC；
- Design Plan；
- dry-run；
- 权限白名单；
- 事务回滚；
- 领域规则验证；
- Skill Eval；
- 项目级硬件设计配置。

### 对本项目的建议

不要直接复制“任意 JS 执行”作为主架构。  
建议将其作为：

```text
底层连接参考
API 文档来源
EasyEDA 扩展开发参考
```

然后在上层实现：

```text
Typed RPC
Design IR
Plan Engine
Validation Gate
Skill Runtime
```

---

## 2.2 EasyEDA 官方 `eext-run-api-gateway`

- 项目地址：<https://github.com/easyeda/eext-run-api-gateway>
- 类型：EasyEDA Pro 侧 Gateway Extension
- 关键词：AI Gateway Extension、WebSocket、EasyEDA Pro Extension
- 参考价值：极高

### 项目简介

该扩展运行在 EasyEDA Pro 内部，用于接收来自 Bridge Server 的请求。官方文档中将其定位为 EDA ↔ AI Gateway Extension。

典型链路：

```text
AI Coding Tool
→ easyeda-api-skill
→ Bridge Server
→ Run API Gateway Extension
→ EasyEDA Pro API
```

### 值得借鉴

- EasyEDA 插件如何安装；
- EDA 侧如何与外部服务通信；
- WebSocket Gateway 模式；
- 本地端口扫描和连接方式；
- 适合作为你的 Bridge Extension 参考。

### 不足

它更像通用 API 执行网关，而不是安全的硬件设计执行层。

### 对本项目的建议

建议有两种选择：

#### 方案 A：兼容官方 Gateway

优点：

- 快速启动；
- 复用官方连接链路；
- 易于跟随官方更新。

缺点：

- 安全模型需要你在外部加固；
- 对任意代码执行要非常谨慎。

#### 方案 B：自研 Typed Bridge

优点：

- 安全；
- 结构清晰；
- 可做 dry-run 和事务；
- 更适合作为开源平台。

缺点：

- 需要更多开发工作；
- 需要持续适配 EasyEDA API。

建议初期参考官方 Gateway，后续逐步演进为 Typed Bridge。

---

## 2.3 `hyl64/jlcmcp`

- 项目地址：<https://github.com/hyl64/jlcmcp>
- 类型：嘉立创 EDA MCP Server
- 关键词：MCP、PCB 自动化工具、AI IDE、嘉立创 EDA
- 参考价值：中高

### 项目简介

该项目宣称通过 Model Context Protocol 暴露 39 个 PCB/原理图工具，让 Claude Code、Cursor、Windsurf 等 AI IDE 直接执行器件移动、走线、铺铜、DRC 等操作。

公开 README 中也说明“本项目上传的文件完全由 opus4.6 完成”，因此应将其视为快速原型，而不是成熟工程底座。

### 值得借鉴

- MCP 工具如何命名；
- EasyEDA Bridge 插件如何组织；
- AI IDE → MCP Server → Gateway → EDA 插件 的链路；
- PCB 原子操作工具集合；
- DRC、走线、过孔、铺铜等工具暴露方式。

### 不足

- 更像工具集合，不是平台；
- 安全、验证、回滚、约束优化较弱；
- 缺少 Design IR；
- 缺少复杂原理图语义理解；
- 缺少 Skill Eval；
- 缺少中等复杂项目的系统闭环。

### 对本项目的建议

可以借鉴工具定义和 Bridge 原型，但你的项目应该定位在更高层：

```text
jlcmcp：AI 操控 EDA 的工具集合
你的项目：AI 硬件设计平台
```

---

## 2.4 `easyeda-ai-assistant`

- 项目地址：<https://github.com/jifengshandian/easyeda-ai-assistant>
- 类型：EasyEDA Pro AI 原理图审查助手
- 关键词：schematic review、AI assistant、MCP data exposure
- 参考价值：中高

### 项目简介

该项目更偏向 AI 原理图审查和问答，重点是让 AI 读取原理图中的器件、网络、引脚和连接关系，而不是只看截图。

### 值得借鉴

- 原理图结构化读取；
- 原理图审查交互；
- 点击定位器件；
- AI 和 EDA 之间的数据暴露方式；
- 可作为 Level 1 “复杂原理图理解”的参考。

### 不足

- 不强调原理图语义编辑；
- 不强调 PCB 强约束布局；
- 不强调 Design Plan；
- 不强调执行、回滚和验证闭环。

### 对本项目的建议

重点学习其原理图读取和审查方式，把它扩展为：

```text
SchematicGraph
PowerTreeGraph
FunctionalBlockGraph
Semantic Editing Plan
```

---

# 3. KiCad AI / MCP / Skill 项目

## 3.1 `aklofas/kicad-happy`

- 项目地址：<https://github.com/aklofas/kicad-happy>
- 类型：AI coding agent skills for KiCad electronics design
- 关键词：schematic review、PCB layout review、Gerber review、EMC、SPICE、manufacturing
- 参考价值：极高

### 项目简介

`kicad-happy` 是一个面向 KiCad 的 AI 设计审查 Skill 集合。它支持 Claude Code、OpenAI Codex、GitHub Copilot CLI、Gemini CLI，也可作为 GitHub Action 或独立 Python 脚本运行。公开 README 中明确说明它能分析 schematics、PCB layouts 和 Gerbers，并在下单前发现真实错误。

### 值得借鉴

1. **Skill 组织方式**
   - 它不是一个单一工具，而是一组面向硬件设计流程的 Skills。

2. **审查型工作流**
   - 原理图审查；
   - PCB layout 审查；
   - Gerber 审查；
   - 制造准备；
   - EMC 预检查；
   - SPICE 仿真辅助。

3. **多 Agent 工具兼容**
   - 不绑定单一 AI；
   - 支持 Codex、Claude Code 等不同工具。

4. **自动化 PR Review**
   - 可借鉴用于未来硬件设计 CI。

### 不足

- 主要面向 KiCad；
- 偏读和审查，不是 EasyEDA 执行平台；
- 不强调 Design Plan + apply + rollback；
- 不强调强约束 PCB 布局优化。

### 对本项目的建议

这是 Skill 设计的最重要参考之一。  
你可以做：

```text
EasyEDA 版 kicad-happy
+
能读写 EasyEDA
+
有 Design Plan
+
有约束优化
+
有验证门禁
```

---

## 3.2 KiCad MCP Server 系列

代表：

- <https://github.com/Seeed-Studio/kicad-mcp-server>
- 其他 KiCad MCP Server 项目

### 项目简介

这类项目通过 MCP 暴露 KiCad 工程读取、原理图分析、PCB 检查、连接追踪、规则验证等能力。

### 值得借鉴

- EDA 工程状态如何通过 MCP 暴露；
- Tools / Resources / Prompts 如何划分；
- AI 如何读取工程对象；
- 如何执行 DRC/ERC；
- 如何在 EDA 原生 API 和 Agent 之间建立适配层。

### 不足

- 多数更偏工具访问；
- 缺少你想要的复杂规则优化；
- 缺少 EasyEDA 支持；
- 缺少面向中等复杂项目的完整闭环。

### 对本项目的建议

借鉴 MCP 工具分层方式，但避免把所有底层原子操作直接暴露给模型。  
建议 MCP 层只暴露高层工具：

```text
eda_get_snapshot
eda_query_design_graph
eda_create_plan
eda_preview_plan
eda_apply_plan
eda_run_validation
skill_run
```

---

# 4. Design IR / 电路中间表示项目

## 4.1 `tscircuit / circuit-json`

- tscircuit 地址：<https://github.com/tscircuit/tscircuit>
- circuit-json 地址：<https://github.com/tscircuit/circuit-json>
- 文档：<https://docs.tscircuit.com/>
- 类型：代码化电路设计 + Circuit JSON 中间表示
- 参考价值：极高

### 项目简介

tscircuit 被描述为 “React for Electronics”，用 TypeScript 和 React 创建真实电路。  
`circuit-json` 是一个低层 JSON-array circuit representation，包含可视化原理图、PCB、Gerber、BOM、SPICE simulation、warnings 等信息。官方文档也称 Circuit JSON 是 universal intermediary format，包含 PCB、Schematic、3D、BOM 和 simulation 信息。

### 值得借鉴

1. **统一中间表示**
   - 原理图、PCB、BOM、Gerber、仿真和 warnings 都可以进入同一数据结构。

2. **可视化与数据库友好**
   - Circuit JSON 适合可视化，也适合数据库互操作。

3. **代码化设计**
   - 把硬件设计从 GUI 操作转为可版本控制的代码和 JSON。

4. **组件化思维**
   - 用类似 React 的方式组合电路模块。

### 不足

- 主路线是用代码生成电路；
- 不是读取和修改已有 EasyEDA 工程；
- 不直接解决 EasyEDA API 执行；
- 不直接提供强约束 PCB 布局优化。

### 对本项目的建议

重点借鉴 IR 设计，不一定直接采用 Circuit JSON。

你的项目可以定义：

```text
UnifiedDesignGraph
SchematicSnapshot
BoardSnapshot
DesignPlan
ValidationReport
```

其目标不是替代 Circuit JSON，而是服务于：

```text
EasyEDA 工程读取
AI 分析
规则检查
语义编辑
PCB 布局优化
写回 EasyEDA
```

---

## 4.2 SchGen

- 论文：SchGen: Automatic Generation of Schematic Diagrams from Natural Language
- 类型：研究论文
- 关键词：semantic-grounded code representation、schematic editing primitives、pin-name-based wiring
- 参考价值：极高

### 核心思想

SchGen 指出传统 EDA 文件过于几何化、冗长、工具相关，不适合 LLM 直接生成。  
它采用语义编辑原语、相对布局和基于引脚名称的连线，将原理图生成从“几何文件生成”转为“语义操作生成”。

### 值得借鉴

- 不让 AI 直接生成 EDA 坐标；
- 使用语义操作；
- 使用 pin-name wiring；
- 使用相对布局；
- 先生成可验证的操作计划，再落地到 EDA。

### 对本项目的建议

你的原理图编辑层应该设计成：

```json
{
  "op": "connect_pin",
  "from": "U1.VIN",
  "to": "C1.1",
  "net": "VIN"
}
```

而不是：

```json
{
  "draw_wire": [[120.5, 33.1], [128.2, 33.1]]
}
```

这对降低 AI 错误非常关键。

---

## 4.3 OmniSch

- 论文：OmniSch: A Multimodal PCB Schematic Benchmark For Structured Diagram Visual Reasoning
- 类型：原理图视觉理解 Benchmark
- 参考价值：中高

### 核心结论

OmniSch 研究发现，当前大模型在从原理图图像构建 machine-readable netlist graph 方面仍有明显短板，包括实体定位、全局连通推理和布局图推理不稳定。

### 对本项目的启发

不要把“截图识别原理图”作为主路线。  
应优先读取 EasyEDA 原生结构化数据：

```text
symbol
pin
net
wire
port
label
sheet
```

视觉识别可以作为补充，不应作为核心。

---

# 5. 代码化硬件设计项目

## 5.1 Atopile

- 项目地址：<https://github.com/atopile/atopile>
- 官网：<https://atopile.io/>
- 类型：声明式硬件设计语言
- 关键词：modules、interfaces、units、tolerances、assertions、constraints、KiCad layout
- 参考价值：极高

### 项目简介

Atopile 的 `ato` 是面向电子设计的声明式语言，支持 modules、interfaces、units、tolerances 和 assertions。编译器可以求解约束、选择器件、运行检查，并更新 KiCad layout。

### 值得借鉴

1. **模块化**
   - 电源模块、接口模块、MCU 模块可以被复用。

2. **接口**
   - 模块之间通过有类型接口连接，而不是随意连线。

3. **单位和容差**
   - 电压、电流、电容、电阻、误差等都应有结构化表达。

4. **断言和验证**
   - 把硬件设计规则变成可检查的 assertions。

5. **软件工程化**
   - 模块复用、版本控制、验证和协作。

### 不足

- 主要面向 KiCad；
- 学习成本较高；
- 不适合作为本项目第一阶段直接路线；
- 不直接解决 EasyEDA 现有工程读取和修改。

### 对本项目的建议

不要一开始做新 DSL。  
先用：

```text
YAML
JSON Schema
TypeScript types
```

实现类似能力：

```yaml
module: buck_converter
constraints:
  input_loop_area_mm2:
    max: 40
  feedback_keepout_from_sw_mm:
    min: 5
assertions:
  - CIN must be within 3mm of VIN and PGND pins
  - FB must not cross SW copper area
```

---

## 5.2 Circuit-Synth

- 项目地址：<https://github.com/circuit-synth/circuit-synth>
- 官网：<https://www.circuit-synth.com/>
- 类型：Python + KiCad + AI circuit design
- 参考价值：高

### 项目简介

Circuit-Synth 使用 Python 定义电路，并与 KiCad 集成。公开说明强调 Claude Code integration、specialized AI agents、component search、design review、documentation、FMEA 等能力。

### 值得借鉴

- Python 电路模块；
- AI 角色分工；
- 器件搜索；
- 设计审查；
- 设计历史；
- FMEA；
- 与 KiCad 双向集成；
- 从自然语言到电路代码的路线。

### 不足

- 重点是 KiCad；
- 重点是电路代码生成；
- 与 EasyEDA 执行闭环不同；
- 不直接解决 PCB 规则布局优化。

### 对本项目的建议

借鉴其“电路模块 + AI agents + 设计历史”的理念。  
但本项目第一阶段仍应以 EasyEDA 工程读取和 Design Graph 为核心。

---

## 5.3 SKiDL

- 项目地址：<https://github.com/devbisme/skidl>
- 类型：Python circuit description / netlist generation
- 参考价值：中高

### 项目简介

SKiDL 可以用 Python 描述电路，并生成可被 PCB 工具使用的网表。它适合实现可复用子电路、层次化设计和代码审查。

### 值得借鉴

- Python DSL；
- 电路网表生成；
- 子电路复用；
- 电气规则检查；
- 用 Git 管理电路设计。

### 对本项目的建议

可以作为未来 “从语义需求生成原理图” 的参考。  
但本项目不应先转向纯 DSL，而应先解决 EasyEDA 读取、理解和安全修改。

---

# 6. 自动布线与 PCB 优化项目

## 6.1 Freerouting

- 项目地址：<https://github.com/freerouting/freerouting>
- 类型：开源 PCB autorouter
- 关键词：DSN、SES、Specctra、Electra、CLI
- 参考价值：极高

### 项目简介

Freerouting 是成熟的 PCB 自动布线器，兼容支持 Specctra/Electra DSN 接口的 EDA 软件。它导入 `.dsn` 文件并导出 `.ses` 会话文件，也提供 CLI 自动化能力。

### 值得借鉴

- 不必从零实现自动布线算法；
- 可作为外部布线后端；
- 支持自动化脚本；
- 适合和 EasyEDA 的 DSN/SES 流程结合。

### 不足

- 自动布线结果不能直接视为设计正确；
- 对电源、反馈、差分、高速和模拟敏感网络仍需要规则审查；
- GPL 许可证可能影响集成方式。

### 对本项目的建议

不要让 AI 直接画完整板所有走线。  
更合理路线：

```text
AI 识别关键网络
→ 生成 netclass / keepout / routing priority
→ 手工或规则优先处理关键网络
→ 导出 DSN
→ 调用 Freerouting
→ 导入 SES
→ 运行 DRC
→ 领域验证
→ 局部修复
```

建议将 Freerouting 作为可选外部工具调用，而不是直接嵌入核心库。

---

## 6.2 PCB-Bench

- 项目地址：<https://github.com/digailab/PCB-Bench>
- 类型：LLM PCB placement and routing reasoning benchmark
- 参考价值：中高

### 项目简介

PCB-Bench 是用于评估大模型在 PCB placement and routing reasoning 上能力的 benchmark。

### 值得借鉴

- 如何构建 PCB 布局布线评估任务；
- 如何定义目标和指标；
- 如何判断 LLM 是否真的理解布局布线；
- 如何建立回归测试集。

### 对本项目的建议

你应该建立自己的小型 Eval：

```text
buck_bad_layout
stm32_missing_decoupling
can_wrong_termination
usb_diff_pair_bad_route
feedback_near_switch_node
power_trace_too_narrow
```

每个 Skill 更新后都运行回归测试。

---

## 6.3 RL_PCB / learned-pcb-placement

代表：

- <https://github.com/LukeVassallo/RL_PCB>
- <https://github.com/buildwithtrace/learned-pcb-placement>

### 项目简介

这类项目使用强化学习或学习型方法优化 PCB 元器件摆放，关注 wirelength、拥塞、可布线性等指标。

### 值得借鉴

- Placement objective；
- 候选布局生成；
- wirelength / congestion / routability 指标；
- 训练集和评估集设计；
- 强化学习用于 PCB placement 的可能性。

### 不足

- 第一阶段不适合直接采用；
- 需要数据集；
- 与 EasyEDA 工程写回仍有距离；
- 难以保证专业领域规则。

### 对本项目的建议

先做启发式 + 局部搜索 + 评分函数。  
后期再考虑 RL / GNN 作为可插拔优化器。

---

# 7. AI 原理图生成与研究项目

## 7.1 pcbGPT

- 论文：pcbGPT: Automatic PCB Schematic Synthesis from Natural Language Requirements
- 类型：自然语言到可编辑 KiCad 原理图
- 参考价值：极高

### 核心内容

pcbGPT 从自然语言硬件需求生成可编辑 KiCad 原理图。它结合：

- Python DSL；
- 组件库搜索；
- 数据手册知识；
- execution-based checking；
- structural validation；
- semantic validation；
- 与 KiCad 项目同步；
- 交互式迭代。

论文结果显示它可以生成有用的可审查 first-draft schematics，但仍不能替代专家审查。

### 对本项目的启发

AI 自行设计路线可行，但应定位为：

```text
可审查初稿生成
+
验证辅助
+
人工确认
```

而不是无审核全自动设计。

---

## 7.2 PCBSchemaGen

- 论文：PCBSchemaGen: Training-free PCB schematic design framework
- 类型：LLM Agent + datasheet knowledge graph + topology constraints
- 参考价值：极高

### 核心内容

该研究强调：

- datasheet-derived Knowledge Graph；
- pin-role 语义；
- topology constraints；
- subgraph isomorphism validation；
- 训练无关的 LLM agent flow。

### 对本项目的启发

要实现 AI 自行设计，必须建立：

```text
Component Knowledge Base
Pin Role Database
Reference Topology Templates
Topology Validators
Datasheet Grounding
```

不能只靠模型记忆。

---

## 7.3 CircuitLM

- 论文：CircuitLM: Multi-Agent framework for circuit design
- 类型：自然语言到 CircuitJSON
- 参考价值：高

### 核心内容

CircuitLM 使用多 Agent 流程，包括组件识别、pinout 检索、专家推理、JSON 合成和验证。  
它指出 LLM 容易在元件细节和电气约束上出现幻觉，因此需要组件知识库和混合验证。

### 对本项目的启发

未来 AI 自行设计可以分成：

```text
Requirement Agent
Architecture Agent
Component Agent
Schematic Agent
Layout Agent
Review Agent
Manufacturing Agent
```

但第一阶段不建议过早多 Agent，应先用单 Agent + Skills + 确定性验证。

---

## 7.4 TypedSchematics

- 论文：TypedSchematics: A Block-based PCB Design Tool with Real-time Detection of Common Connection Errors
- 类型：Typed circuit blocks
- 参考价值：高

### 核心内容

TypedSchematics 关注“电路模块复用”和“连接错误实时检测”，通过给电路块增加类型信息，帮助初学者安全组合电路模块。

### 对本项目的启发

你的模块系统也应该有类型：

```text
PowerInput
PowerOutput
DigitalIO
AnalogInput
DifferentialPair
Ground
HighCurrentPower
NoisySwitchingNode
SensitiveFeedback
```

模块接口之间不能随意连接，需要 type check。

---

# 8. Agent 工程基础设施参考

## 8.1 Codex Skills

- 文档：<https://developers.openai.com/codex/skills>
- 参考价值：高

### 核心内容

Codex Skill 是一个目录，包含 `SKILL.md`，并可附带 `scripts/`、`references/`、`assets/` 等。`SKILL.md` 必须包含 `name` 和 `description`。

### 对本项目的启发

你的硬件设计能力应封装为 Skills：

```text
check-decoupling/
layout-buck-power-stage/
review-can-interface/
manufacturing-review/
```

每个 Skill 都应该包含：

```text
SKILL.md
schemas/
scripts/
references/
fixtures/
evals/
```

---

## 8.2 AGENTS.md

- 文档：<https://agents.md/>
- Codex 文档：<https://developers.openai.com/codex/guides/agents-md>
- 参考价值：高

### 核心内容

AGENTS.md 是给 AI coding agents 的 README，用于提供仓库级指令。Codex 会在开始任务前读取 AGENTS.md。

### 对本项目的建议

根目录 AGENTS.md 应规定：

```text
禁止直接调用 EasyEDA API
所有写操作必须走 Design Plan
默认 dry-run
高风险操作必须人工确认
所有 Skill 必须有输入输出 Schema
所有修改必须运行验证
```

---

## 8.3 MCP

- 官方文档：<https://modelcontextprotocol.io/>
- 参考价值：高

### 核心内容

MCP 是连接 AI 应用和外部系统的开放标准，支持 Tools、Resources 和 Prompts。

### 对本项目的建议

MCP 层不应暴露太多底层 EDA 操作。  
建议暴露高层工具：

```text
eda_get_snapshot
eda_query_design_graph
eda_create_plan
eda_preview_plan
eda_apply_plan
eda_run_validation
skill_list
skill_run
```

---

# 9. 推荐借鉴矩阵

| 方向 | 最值得参考项目 | 借鉴内容 |
|---|---|---|
| EasyEDA 连接 | easyeda-api-skill, eext-run-api-gateway | WebSocket Bridge、API Skill、官方扩展 |
| EasyEDA 原子操作 | jlcmcp | MCP 工具和 EDA Bridge 原型 |
| 原理图理解 | easyeda-ai-assistant, kicad-happy | 结构化读取、审查报告 |
| Skill 系统 | kicad-happy, Codex Skills | Skill 组织、review workflow |
| Design IR | tscircuit/circuit-json | 统一中间表示 |
| 原理图语义编辑 | SchGen, pcbGPT | Semantic operations、pin-name wiring |
| 约束化硬件 | Atopile, TypedSchematics | 模块、接口、单位、断言、type check |
| 代码化电路 | circuit-synth, SKiDL | 电路模块、Python DSL、AI 设计辅助 |
| 自动布线 | Freerouting | DSN/SES、CLI routing |
| 布局优化 | PCB-Bench, RL_PCB | Placement metrics、Eval、优化目标 |
| AI 自行设计 | pcbGPT, PCBSchemaGen, CircuitLM | Datasheet grounding、component KB、topology validation |
| Agent 工程 | AGENTS.md, MCP, Codex Skills | Agent 配置、工具协议、可复用 workflows |

---

# 10. 对你的项目的最终建议

## 10.1 主方向

```text
EasyEDA-first AI Hardware Design Platform
```

而不是：

```text
EasyEDA MCP Server
```

## 10.2 核心差异化

你的项目应强调：

```text
复杂原理图理解
复杂 PCB 读取
统一设计图谱
原理图语义编辑
强约束 PCB 布局优化
规则驱动布线
Design Plan
dry-run
验证门禁
Skill/Eval
从语义需求到可审查设计初稿
```

## 10.3 最优技术路线

```text
1. 读取已有 EasyEDA 工程
2. 建立 SchematicGraph / PCBGraph
3. 建立 Component Knowledge Base
4. 建立 Semantic Schematic Editing
5. 建立 PCB Constraint Engine
6. 建立 Placement Optimization Engine
7. 建立 Routing Orchestration
8. 建立 Validation Gate
9. 建立 Skills and Evals
10. 扩展到自然语言需求生成 DesignSpec / ModuleGraph / SchematicPlan / PCBPlan
```

## 10.4 第一阶段不建议做

暂时不要优先做：

- 全板自动布局；
- 全板自动布线；
- 多 Agent 架构；
- 自研深度学习 placement；
- 新硬件 DSL；
- 自动下单；
- 复杂高速板支持。

## 10.5 第一阶段最值得做

优先做：

```text
EasyEDA 只读连接
SchematicSnapshot
BoardSnapshot
UnifiedDesignGraph
PowerTree 分析
FunctionalBlock 识别
Design Review Report
```

这是后续 AI 自行设计能力的地基。

---

# 11. 参考链接

## EasyEDA / 嘉立创

- EasyEDA API Skill: https://github.com/easyeda/easyeda-api-skill
- EasyEDA Run API Gateway: https://github.com/easyeda/eext-run-api-gateway
- EasyEDA Pro Ancillary Projects: https://prodocs.easyeda.com/en/api/guide/ancillary-projects.html
- EasyEDA API guide: https://docs.easyeda.com/en/API/1-How-to-Use-API/
- hyl64/jlcmcp: https://github.com/hyl64/jlcmcp
- easyeda-ai-assistant: https://github.com/jifengshandian/easyeda-ai-assistant

## KiCad / Skills / MCP

- kicad-happy: https://github.com/aklofas/kicad-happy
- Seeed KiCad MCP Server: https://github.com/Seeed-Studio/kicad-mcp-server
- Codex Skills: https://developers.openai.com/codex/skills
- AGENTS.md: https://agents.md/
- Codex AGENTS.md guide: https://developers.openai.com/codex/guides/agents-md
- MCP documentation: https://modelcontextprotocol.io/

## Design IR / Code-based Electronics

- tscircuit: https://github.com/tscircuit/tscircuit
- Circuit JSON: https://github.com/tscircuit/circuit-json
- Circuit JSON docs: https://docs.tscircuit.com/
- Atopile: https://github.com/atopile/atopile
- Atopile website: https://atopile.io/
- Circuit-Synth: https://github.com/circuit-synth/circuit-synth
- Circuit-Synth website: https://www.circuit-synth.com/
- SKiDL: https://github.com/devbisme/skidl

## Routing / Placement / Eval

- Freerouting: https://github.com/freerouting/freerouting
- Freerouting CLI: https://github.com/freerouting/freerouting/blob/master/docs/command_line_arguments.md
- PCB-Bench: https://github.com/digailab/PCB-Bench
- RL_PCB: https://github.com/LukeVassallo/RL_PCB
- learned-pcb-placement: https://github.com/buildwithtrace/learned-pcb-placement

## Research

- pcbGPT: https://arxiv.org/abs/2606.01188
- SchGen: https://arxiv.org/abs/2605.30345
- PCBSchemaGen: https://arxiv.org/abs/2602.00510
- OmniSch: https://arxiv.org/abs/2604.00270
- TypedSchematics: https://arxiv.org/abs/2509.14576
- CIRCUITSYNTH paper: https://arxiv.org/abs/2407.10977

---

# 12. 最终结论

当前确实存在大量类似项目，但它们大多只覆盖局部能力：

- EasyEDA 官方项目解决 API 和 Gateway；
- jlcmcp 解决 MCP 操作原型；
- easyeda-ai-assistant 解决部分原理图审查；
- kicad-happy 解决 KiCad Skill 审查；
- tscircuit 解决电路中间表示；
- Atopile 解决代码化硬件和约束；
- Freerouting 解决自动布线；
- pcbGPT / SchGen / PCBSchemaGen 证明语义需求到原理图初稿可行。

但目前还缺少一个开源项目完整整合：

```text
EasyEDA-first
+ 复杂原理图理解
+ 复杂 PCB 图谱
+ 原理图语义编辑
+ 强约束 PCB 布局
+ 规则驱动布线
+ Design Plan
+ Validation Gate
+ Skills/Evals
+ 从语义需求到可审查设计初稿
```

这正是你的项目最值得做的方向。
