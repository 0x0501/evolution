# Evolution Multi-Agent Prototype Design System

## Context

用户需要一个名为"evolution"的多agent产品原型设计软件，灵感来自opencode。核心价值在于"多agent协同工作，将30分的原型打磨到60-90分"。系统通过CLI启动TUI界面，采用multi-agent架构实现产品原型的持续迭代优化。

## TUI Interface Specification

### Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ [Status Bar] 迭代: 3/10 │ Stage: 验证编排 │ SUDO: OFF │ Ctrl+T切换│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [主对话区域]                                                    │
│  - Orchestrator和所有Agent的流式输出                             │
│  - 按Ctrl+T切换到sub-agent对话上下文                             │
│                                                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ [输入区] /create │ /polish │ /status │ /abort                   │
└─────────────────────────────────────────────────────────────────┘
```

### Status Bar
- **迭代次数**: `迭代: 3/10` (当前/最大)
- **当前阶段**: `Stage: 任务编排 │ 验证编排 │ 头脑风暴 │ 守卫`
- **SUDO模式**: `SUDO: ON/OFF`
- **快捷键提示**: `Ctrl+T切换`

### 流式输出
- 所有agent的回复必须使用流式输出（类似Claude Code）
- 使用DeepAgent的`stream()`方法，支持`subgraphs: true`获取整个agent层级的增量更新
- 每个agent的输出前面显示agent名称标签，如 `[PM Agent]`, `[UI Designer]`

### Ctrl+T Sub-Agent切换
- 按`Ctrl+T`打开agent切换器面板
- 显示当前活跃的所有agent列表
- 选择后可查看/介入该agent的对话上下文
- 支持在sub-agent上下文中直接发送指令

### 状态显示
| 状态 | 说明 |
|------|------|
| `IDLE` | 等待用户输入 |
| `RUNNING` | 正在执行任务 |
| `WAITING` | 等待用户确认 (异常暂停点) |
| `COMPLETED` | 当前迭代完成 |
| `ABORTED` | 用户中止 |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        OpenTUI TUI界面                          │
│  - 目录感知CLI: 在任意目录运行evolution，该目录即为工作目录         │
│  - 流式输出所有agent回复                                         │
│  - Ctrl+T切换sub-agent上下文                                     │
│  - 状态栏显示迭代次数、阶段、SUDO模式                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│               LangGraph StateGraph (流程编排层)                  │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐  │
│  │任务编排者 │───▶│验证编排者│───▶│头脑风暴  │───▶│守卫agent│   │
│  │(Agent)   │◀───│(Agent)   │    │(Agent)   │    │(Agent)   │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘  │
│       │              │                       │                 │
│       │              │                       └─── (循环) ─────┘│
│       │              ▼                                       │
│       │    ┌─────────────────────────────────┐               │
│       └───▶│         DeepAgent Core           │◀──────────────┘
│            │   (沙箱 + Skills + SubAgents)   │
│            └─────────────────────────────────┘
│                     │           │           │
│     ┌────────────────┼───────────┼───────────┐
│     ▼                ▼           ▼           ▼
│ ┌─────────┐  ┌───────────┐ ┌─────────┐ ┌────────────┐
│ │PM Agent │  │UI Designer │ │UX Optim │ │Frontend Dev│
│ └─────────┘  └───────────┘ └─────────┘ └────────────┘
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    混合持久化层                                   │
│  ┌──────────────┐    ┌────────────────┐    ┌──────────────┐     │
│  │ AGENTS.md    │    │ langgraph      │    │ DeepAgent   │     │
│  │ IDEAS.md     │    │ MemorySaver    │    │ Long-term   │     │
│  │ (文件系统)   │    │ (SQLite)       │    │ Memory      │     │
│  └──────────────┘    └────────────────┘    └──────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Command Interface

### `/create` 命令
1. 多轮prompt收集用户需求和背景故事
2. 调用"背景故事和需求优化agent"打磨需求
3. 创建项目根目录AGENTS.md
4. 进入主系统循环

### `/polish` 命令
1. 读取AGENTS.md文件
2. 结合用户输入的优化需求
3. 进入主系统循环（可设置迭代次数）

## Main System Loop (LangGraph StateGraph)

### Stage 1: 任务编排者 (Orchestrator Agent)
- 接收用户输入/迭代需求
- 创建git分支（分支名与需求相关）
- 拆分任务给sub-agents
- **Sub-Agents:**
  - 产品经理Agent (PM)
  - 业务流程架构师Agent
  - UI视觉原型师Agent
  - UX用户体验优化Agent
  - Web前端开发Agent (React + TypeScript + Vite)

### Stage 2: 验证编排者 (Validation Orchestrator)
- 等待所有sub-agents完成
- 调用验证sub-agents:
  - Playwright Agent: 端到端组件/页面测试
  - 多模态视觉验证Agent: 截图 + 视觉模型测试UI/UX
- 综合评估验证是否通过

### Stage 3: 循环决策
- **验证通过** → 进入Stage 4 (头脑风暴)
- **验证失败** → 带上问题报告打回Stage 1，重新执行

### Stage 4: 头脑风暴Agent (Brainstormer)
- Role-playing模式，两个agent讨论
- 基于原始需求和迭代信息提出新需求/优化建议
- 完成后进入Stage 5

### Stage 5: 守卫Agent (Guardrail)
- 评估头脑风暴输出是否合理
- 检查是否偏离产品设计初衷
- **如果合理:**
  1. 整理需求写入IDEAS.md
  2. 创建commit并合并到主分支
  3. 打tag (v0.0.0 → v0.0.1 → ...)
  4. 更新AGENTS.md更新记录
  5. 返回Stage 1开始新循环
- **如果不合理:** 返回Stage 4重新头脑风暴

## Agent Skills Configuration (Centralized)

所有skills存储在`src/skills/`目录，以SKILL.md格式定义。

```typescript
// src/config/agent-skills.ts
export const agentSkillsConfig = {
  orchestrator: {
    skills: ["context7", "task-decomposition"],
  },
  productManager: {
    skills: ["context7", "product-analysis"],
  },
  businessArchitect: {
    skills: ["context7", "workflow-design"],
  },
  uiDesigner: {
    skills: ["context7", "frontend-design", "typescript-lsp"],
  },
  uxOptimizer: {
    skills: ["context7", "ux-analysis"],
  },
  frontendDeveloper: {
    skills: ["context7", "frontend-design", "typescript-lsp"],
  },
  playwrightTester: {
    skills: ["context7", "playwright-testing"],
  },
  multimodalValidator: {
    skills: ["context7"],
  },
  brainstormer: {
    skills: ["context7", "creative-thinking"],
  },
  guardrail: {
    skills: ["context7", "safety-check"],
  },
};
```

## File Structure

### Evolution Project
```
evolution/
├── src/
│   ├── cli/              # OpenTUI TUI入口
│   ├── agents/           # Agent定义
│   │   ├── orchestrator.ts
│   │   ├── pm-agent.ts
│   │   ├── ui-designer.ts
│   │   ├── ux-optimizer.ts
│   │   ├── frontend-dev.ts
│   │   ├── validator/
│   │   │   ├── playwright-agent.ts
│   │   │   └── multimodal-agent.ts
│   │   ├── brainstormer.ts
│   │   └── guardrail.ts
│   ├── graph/            # LangGraph状态机
│   │   └── main-loop.ts
│   ├── skills/           # 共享skills (SKILL.md格式)
│   │   ├── context7/
│   │   ├── frontend-design/
│   │   ├── playwright-testing/
│   │   └── ...
│   ├── config/           # 集中配置
│   │   └── agent-skills.ts
│   └── utils/
├── package.json
└── tsconfig.json
```

### Working Directory (用户运行evolution的目录)
```
<user-project-dir>/
├── AGENTS.md    # 产品需求、背景故事、更新记录
├── IDEAS.md     # 头脑风暴产出的Ideas
└── <原型项目代码>
```

## AGENTS.md Format

遵循agents.md标准，新增三个章节：

```markdown
## 产品原始需求

...

## 背景故事

...

## 更新记录

### 001-feat-login

...
```

更新记录的3级标题由分支名决定（如`001-feat-login`）。

## Environment Variables

```env
OPENAI_API_KEY=xxxx         # API密钥
OPENAI_MODEL=xxx           # 模型名称
OPENAI_BASE_URL=xxx        # 模型提供商base URL
SUDO_MODE=false            # true = 全自动运行
ITERATION=10               # 默认迭代次数
```

## Human-in-the-Loop

| 模式 | 行为 |
|------|------|
| SUDO_MODE=false | 验证失败或guardrail拦截时暂停，等待用户决策 |
| SUDO_MODE=true | 全自动运行，无需任何人工介入 |

### 异常暂停点
- 验证失败后打回重做前
- Guardrail拦截问题时

## Persistence Strategy

### 混合持久化
- **文件系统**: AGENTS.md, IDEAS.md, 原型代码
- **LangGraph MemorySaver**: 运行时状态（迭代状态、任务状态）
- **DeepAgent Long-term Memory**: Agent经验积累

## Technology Stack

| 组件 | 技术 |
|------|------|
| TUI | OpenTUI |
| Agent框架 | DeepAgent (deepagents) |
| 流程编排 | LangGraph |
| 沙箱后端 | FilesystemBackend (本地磁盘) |
| 模型 | Minimax-M2.7 (用户配置) |
| ACP | Agent Client Protocol (IDE集成) |
| MCP | Model Context Protocol (文档查询等) |

## Verification

1. **单元测试**: 各Agent逻辑独立测试
2. **集成测试**: 完整流程测试（/create → /polish）
3. **E2E测试**: Playwright测试TUI界面
4. **手动验证**: 在测试目录运行evolution，验证完整迭代流程
