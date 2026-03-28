# Evolution Multi-Agent Prototype System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build evolution - a multi-agent CLI tool that uses OpenTUI for TUI, DeepAgent for agent framework, and LangGraph for workflow orchestration to iteratively polish product prototypes from 30 to 80-90 points.

**Architecture:**
- OpenTUI provides the TUI interface with streaming output, status bar, and Ctrl+T sub-agent switching
- DeepAgent provides the agent runtime with sub-agents, skills, and FilesystemBackend sandbox
- LangGraph StateGraph orchestrates the main loop: Orchestrator → Validation → Brainstorm → Guardrail
- Hybrid persistence: Filesystem (AGENTS.md, IDEAS.md) + LangGraph MemorySaver + DeepAgent memory

**Tech Stack:** TypeScript, OpenTUI, DeepAgent (deepagentsjs), LangGraph, Node.js

---

## File Structure

```
evolution/
├── src/
│   ├── cli/
│   │   ├── index.ts           # CLI entry point
│   │   ├── tui.ts             # OpenTUI setup and layout
│   │   ├── status-bar.ts      # Status bar component
│   │   ├── agent-switcher.ts  # Ctrl+T panel
│   │   └── commands/
│   │       ├── create.ts      # /create command
│   │       └── polish.ts      # /polish command
│   ├── agents/
│   │   ├── orchestrator.ts    # Task Orchestrator Agent
│   │   ├── pm-agent.ts        # Product Manager Agent
│   │   ├── business-arch.ts   # Business Architect Agent
│   │   ├── ui-designer.ts     # UI Visual Designer Agent
│   │   ├── ux-optimizer.ts   # UX Optimizer Agent
│   │   ├── frontend-dev.ts     # Web Frontend Developer Agent
│   │   ├── validator/
│   │   │   ├── validation-orchestrator.ts
│   │   │   ├── playwright-agent.ts
│   │   │   └── multimodal-agent.ts
│   │   ├── brainstormer.ts    # Brainstorm Agent
│   │   └── guardrail.ts       # Guardrail Agent
│   ├── graph/
│   │   ├── state.ts           # LangGraph state schema
│   │   ├── nodes.ts           # Graph nodes (agents)
│   │   ├── edges.ts           # Graph edges (flow logic)
│   │   └── compiler.ts        # Graph compilation
│   ├── config/
│   │   ├── agent-skills.ts    # Centralized agent→skills mapping
│   │   ├── agents.ts          # All agent configurations
│   │   └── env.ts             # Environment variable handling
│   ├── skills/                # SKILL.md files
│   │   ├── context7/
│   │   │   └── SKILL.md
│   │   ├── frontend-design/
│   │   │   └── SKILL.md
│   │   ├── playwright-testing/
│   │   │   └── SKILL.md
│   │   └── ... (other skills)
│   ├── services/
│   │   ├── git.ts             # Git operations (branch, commit, merge, tag)
│   │   ├── filesystem.ts      # File operations helper
│   │   └── persistence.ts    # AGENTS.md, IDEAS.md management
│   └── types/
│       └── index.ts           # TypeScript type definitions
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.env.example`
- Create: `.gitignore`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "evolution",
  "version": "0.0.0",
  "type": "module",
  "bin": {
    "evolution": "./dist/cli/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx watch src/cli/index.ts",
    "start": "node dist/cli/index.js"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@langchain/core": "^0.3.0",
    "@langchain/langgraph": "^0.2.0",
    "@opentui/core": "^0.1.69",
    "deepagents": "^0.0.18",
    "dotenv": "^16.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create .env.example**

```env
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=minimax-ai/MiniMax-M2.7
OPENAI_BASE_URL=https://api.minimax.io
SUDO_MODE=false
ITERATION=10
```

- [ ] **Step 4: Create .gitignore**

```
node_modules/
dist/
.env
*.log
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json .env.example .gitignore
git commit -m "feat: project scaffolding"
```

---

## Task 2: Type Definitions

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// Agent types
export type AgentName =
  | 'orchestrator'
  | 'productManager'
  | 'businessArchitect'
  | 'uiDesigner'
  | 'uxOptimizer'
  | 'frontendDeveloper'
  | 'validationOrchestrator'
  | 'playwrightAgent'
  | 'multimodalAgent'
  | 'brainstormer'
  | 'guardrail';

export interface AgentConfig {
  name: AgentName;
  description: string;
  systemPrompt: string;
  skills: string[];
}

// Execution state
export type ExecutionState = 'IDLE' | 'RUNNING' | 'WAITING' | 'COMPLETED' | 'ABORTED';
export type LoopStage = 'orchestrator' | 'validation' | 'brainstorm' | 'guardrail';

// Main loop state
export interface EvolutionState {
  iteration: number;
  maxIterations: number;
  stage: LoopStage;
  executionState: ExecutionState;
  sudoMode: boolean;
  currentBranch: string | null;
  taskList: string[];
  completedTasks: string[];
  validationReport: ValidationReport | null;
  brainstormOutput: string | null;
  guardrailResult: GuardrailResult | null;
}

export interface ValidationReport {
  passed: boolean;
  playwrightResults: PlaywrightResult[];
  multimodalResults: MultimodalResult[];
  issues: string[];
  suggestions: string[];
}

export interface PlaywrightResult {
  testName: string;
  passed: boolean;
  error?: string;
}

export interface MultimodalResult {
  pageName: string;
  issues: string[];
  score: number;
}

export interface GuardrailResult {
  approved: boolean;
  reason: string;
  issues?: string[];
}

// Command types
export interface CreateCommandInput {
  productName: string;
  requirements: string;
  backgroundStory: string;
}

export interface PolishCommandInput {
  additionalRequirements?: string;
  iterationCount?: number;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add type definitions"
```

---

## Task 3: Environment Configuration

**Files:**
- Create: `src/config/env.ts`

- [ ] **Step 1: Create environment config**

```typescript
import { z } from 'zod';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config();

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().default('minimax-ai/MiniMax-M2.7'),
  OPENAI_BASE_URL: z.string().default('https://api.minimax.io'),
  SUDO_MODE: z.enum(['true', 'false']).default('false'),
  ITERATION: z.coerce.number().int().positive().default(10),
});

export const env = envSchema.parse(process.env);

export const config = {
  openai: {
    apiKey: env.OPENAI_API_KEY,
    model: env.OPENAI_MODEL,
    baseUrl: env.OPENAI_BASE_URL,
  },
  sudoMode: env.SUDO_MODE === 'true',
  maxIterations: env.ITERATION,
};
```

- [ ] **Step 2: Commit**

```bash
git add src/config/env.ts
git commit -m "feat: add environment configuration"
```

---

## Task 4: Agent Skills Configuration (Centralized)

**Files:**
- Create: `src/config/agent-skills.ts`
- Create: `src/config/agents.ts`

- [ ] **Step 1: Create agent-skills.ts**

```typescript
import type { AgentName, AgentConfig } from '../types/index.js';

export const agentSkillsConfig: Record<AgentName, { skills: string[] }> = {
  orchestrator: {
    skills: ['context7', 'task-decomposition'],
  },
  productManager: {
    skills: ['context7', 'product-analysis'],
  },
  businessArchitect: {
    skills: ['context7', 'workflow-design'],
  },
  uiDesigner: {
    skills: ['context7', 'frontend-design', 'typescript-lsp'],
  },
  uxOptimizer: {
    skills: ['context7', 'ux-analysis'],
  },
  frontendDeveloper: {
    skills: ['context7', 'frontend-design', 'typescript-lsp'],
  },
  validationOrchestrator: {
    skills: ['context7'],
  },
  playwrightAgent: {
    skills: ['context7', 'playwright-testing'],
  },
  multimodalAgent: {
    skills: ['context7'],
  },
  brainstormer: {
    skills: ['context7', 'creative-thinking'],
  },
  guardrail: {
    skills: ['context7', 'safety-check'],
  },
};
```

- [ ] **Step 2: Create agents.ts with full agent configs**

```typescript
import type { AgentConfig } from '../types/index.js';

export const agentConfigs: Record<string, AgentConfig> = {
  orchestrator: {
    name: 'orchestrator',
    description: 'Coordinates all sub-agents, breaks down tasks, manages workflow',
    systemPrompt: `You are the Task Orchestrator for Evolution.
Your role is to understand user requirements and delegate tasks to specialized sub-agents.

Workflow:
1. Analyze the current iteration requirements
2. Create a git branch with a descriptive name
3. Break down work into markdown task list
4. Delegate to sub-agents: PM, Business Architect, UI Designer, UX Optimizer, Frontend Developer
5. Wait for all sub-agents to complete before signaling done

Always output tasks as a markdown checklist, marking completed items with [x].`,
    skills: ['context7', 'task-decomposition'],
  },

  productManager: {
    name: 'productManager',
    description: 'Defines product requirements and user stories',
    systemPrompt: `You are the Product Manager Agent.
Your role is to translate requirements into clear product specifications.

Output:
- User stories in format: "As a [user], I want [feature] so that [benefit]"
- Feature list with priorities
- Acceptance criteria for each feature`,
    skills: ['context7', 'product-analysis'],
  },

  businessArchitect: {
    name: 'businessArchitect',
    description: 'Designs business processes and workflows',
    systemPrompt: `You are the Business Architect Agent.
Your role is to design the business logic and workflow of the application.

Output:
- Business process diagrams (text-based)
- Data flow descriptions
- Key business rules`,
    skills: ['context7', 'workflow-design'],
  },

  uiDesigner: {
    name: 'uiDesigner',
    description: 'Creates visual prototypes and UI specifications',
    systemPrompt: `You are the UI Visual Designer Agent.
Your role is to design the visual aspects of the prototype.

Output:
- UI component specifications
- Color scheme recommendations
- Layout guidelines
- Component hierarchy`,
    skills: ['context7', 'frontend-design', 'typescript-lsp'],
  },

  uxOptimizer: {
    name: 'uxOptimizer',
    description: 'Optimizes user experience and interactions',
    systemPrompt: `You are the UX Optimizer Agent.
Your role is to ensure the best possible user experience.

Output:
- UX improvement suggestions
- User flow optimizations
- Interaction patterns`,
    skills: ['context7', 'ux-analysis'],
  },

  frontendDeveloper: {
    name: 'frontendDeveloper',
    description: 'Implements React + TypeScript + Vite frontend',
    systemPrompt: `You are the Frontend Developer Agent.
Your role is to implement the actual prototype using React, TypeScript, and Vite.

Requirements:
- Use Vite for build tooling
- TypeScript for type safety
- React for UI components
- Follow best practices

Output:
- Complete, working prototype code
- All necessary files (package.json, tsconfig, components, etc.)`,
    skills: ['context7', 'frontend-design', 'typescript-lsp'],
  },

  validationOrchestrator: {
    name: 'validationOrchestrator',
    description: 'Coordinates validation of implemented prototype',
    systemPrompt: `You are the Validation Orchestrator.
Your role is to coordinate testing and validation of the prototype.

Workflow:
1. Wait for Frontend Developer to complete
2. Invoke Playwright Agent for E2E testing
3. Invoke Multimodal Agent for visual validation
4. Compile validation report
5. Decide: pass or fail → return to orchestrator`,
    skills: ['context7'],
  },

  playwrightAgent: {
    name: 'playwrightAgent',
    description: 'Writes and runs Playwright E2E tests',
    systemPrompt: `You are the Playwright Testing Agent.
Your role is to write and execute Playwright tests for the prototype.

Output:
- Playwright test files
- Test execution results
- List of failing tests with error messages`,
    skills: ['context7', 'playwright-testing'],
  },

  multimodalAgent: {
    name: 'multimodalAgent',
    description: 'Validates UI/UX through visual analysis',
    systemPrompt: `You are the Multimodal Visual Validation Agent.
Your role is to validate the visual design and UX through AI-powered screenshot analysis.

Workflow:
1. Use Playwright to take screenshots of each page/modal
2. Send screenshots to multimodal model
3. Analyze for: layout issues, UX problems, visual consistency
4. Return validation report with scores and issues`,
    skills: ['context7'],
  },

  brainstormer: {
    name: 'brainstormer',
    description: 'Generates new ideas through role-playing',
    systemPrompt: `You are the Brainstormer Agent (Role-Playing Mode).
Two virtual agents discuss and generate new ideas for product improvement.

Workflow:
1. Review original requirements and current iteration info
2. Two agents engage in role-playing discussion
3. Generate new ideas, suggestions, optimizations
4. Output consolidated ideas for guardrail review`,
    skills: ['context7', 'creative-thinking'],
  },

  guardrail: {
    name: 'guardrail',
    description: 'Validates ideas and approves changes',
    systemPrompt: `You are the Guardrail Agent.
Your role is to ensure brainstormed ideas are appropriate and aligned with product goals.

Validation criteria:
- Alignment with original product vision
- Safety and ethical considerations
- Technical feasibility
- Not偏离 original requirements

Output:
- APPROVED: Ideas are good → write to IDEAS.md, commit, merge, tag
- REJECTED: Ideas need revision → return to brainstormer with issues`,
    skills: ['context7', 'safety-check'],
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/config/agent-skills.ts src/config/agents.ts
git commit -m "feat: add centralized agent and skills configuration"
```

---

## Task 5: Git Service

**Files:**
- Create: `src/services/git.ts`

- [ ] **Step 1: Create git service**

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

export async function createBranch(branchName: string): Promise<void> {
  try {
    await execAsync(`git checkout -b ${branchName}`);
  } catch {
    await execAsync(`git checkout ${branchName}`);
  }
}

export async function commit(message: string): Promise<void> {
  await execAsync('git add -A');
  await execAsync(`git commit -m "${message}"`);
}

export async function mergeToMain(): Promise<void> {
  await execAsync('git checkout main');
  await execAsync('git merge current-branch --no-ff');
}

export async function createTag(version: string): Promise<void> {
  await execAsync(`git tag -a v${version} -m "Release v${version}"`);
}

export async function getCurrentBranch(): Promise<string> {
  const { stdout } = await execAsync('git branch --show-current');
  return stdout.trim();
}

export function generateBranchName(iteration: number, focus: string): string {
  const num = iteration.toString().padStart(3, '0');
  const safeFocus = focus.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 20);
  return `${num}-${safeFocus}`;
}

export function generateVersion(currentTag: string | null): string {
  if (!currentTag) return '0.0.0';
  const [major, minor, patch] = currentTag.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/git.ts
git commit -m "feat: add git service for branch/commit/merge/tag operations"
```

---

## Task 6: Persistence Service (AGENTS.md, IDEAS.md)

**Files:**
- Create: `src/services/persistence.ts`

- [ ] **Step 1: Create persistence service**

```typescript
import { readFile, writeFile, access, mkdir } from 'fs/promises';
import { join } from 'path';
import type { CreateCommandInput } from '../types/index.js';

const AGENTS_FILE = 'AGENTS.md';
const IDEAS_FILE = 'IDEAS.md';

export async function ensureFile(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, '', 'utf-8');
  }
}

export async function createAgentsMd(input: CreateCommandInput): Promise<void> {
  const content = `---
name: ${input.productName}
created: ${new Date().toISOString()}
---

## 产品原始需求

${input.requirements}

## 背景故事

${input.backgroundStory}

## 更新记录

`;
  await writeFile(AGENTS_FILE, content, 'utf-8');
}

export async function readAgentsMd(): Promise<string> {
  return readFile(AGENTS_FILE, 'utf-8');
}

export async function appendToAgentsMd(branchName: string, content: string): Promise<void> {
  const current = await readFile(AGENTS_FILE, 'utf-8');
  const section = `\n### ${branchName}\n\n${content}\n`;
  const updated = current.replace(
    /## 更新记录/,
    `## 更新记录${section}`
  );
  await writeFile(AGENTS_FILE, updated, 'utf-8');
}

export async function writeIdeasMd(ideas: string): Promise<void> {
  const header = `---
updated: ${new Date().toISOString()}
---

## Ideas

`;
  await writeFile(IDEAS_FILE, header + ideas + '\n', 'utf-8');
}

export async function readIdeasMd(): Promise<string> {
  try {
    return await readFile(IDEAS_FILE, 'utf-8');
  } catch {
    return '';
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/persistence.ts
git commit -m "feat: add persistence service for AGENTS.md and IDEAS.md"
```

---

## Task 7: Skills SKILL.md Files

**Files:**
- Create: `src/skills/context7/SKILL.md`
- Create: `src/skills/frontend-design/SKILL.md`
- Create: `src/skills/playwright-testing/SKILL.md`
- Create: `src/skills/task-decomposition/SKILL.md`

- [ ] **Step 1: Create context7 SKILL.md**

```markdown
---
name: context7
description: Query up-to-date documentation using Context7 MCP server
---

# Context7 Documentation Search Skill

## When to Use
- User asks about library, framework, SDK, API usage
- Need to verify current best practices
- Before implementing with unfamiliar tools

## Usage
Use the provided MCP tools to search Context7 for relevant documentation.
Always prefer Context7 over training data for library-specific questions.
```

- [ ] **Step 2: Create frontend-design SKILL.md**

```markdown
---
name: frontend-design
description: Design and implement production-grade frontend interfaces
---

# Frontend Design Skill

## Principles
- Use semantic HTML and accessible components
- Mobile-first responsive design
- Consistent spacing and typography
- Clear visual hierarchy

## Tech Stack
- React 18+ with hooks
- TypeScript for type safety
- CSS Modules or Tailwind for styling
- Vite for build tooling
```

- [ ] **Step 3: Create playwright-testing SKILL.md**

```markdown
---
name: playwright-testing
description: Write and execute Playwright E2E tests
---

# Playwright Testing Skill

## When to Use
- Writing E2E tests for components
- Validating user flows
- Screenshot capture for visual testing

## Usage
- Use Playwright CLI for running tests
- Generate test files with descriptive names
- Include assertions for critical paths
```

- [ ] **Step 4: Create task-decomposition SKILL.md**

```markdown
---
name: task-decomposition
description: Break down complex requirements into actionable tasks
---

# Task Decomposition Skill

## When to Use
- Starting a new iteration
- Planning sub-agent work assignments
- Creating task checklists

## Workflow
1. Identify main goal
2. Break into subtasks (max 5-7 per agent)
3. Prioritize dependencies
4. Output as markdown checklist
```

- [ ] **Step 5: Commit**

```bash
git add src/skills/*/SKILL.md
git commit -m "feat: add SKILL.md files for agent capabilities"
```

---

## Task 8: DeepAgent Core Setup

**Files:**
- Create: `src/agents/deepagent.ts`

- [ ] **Step 1: Create DeepAgent core setup**

```typescript
import { createDeepAgent, createSkillsMiddleware, FilesystemBackend } from 'deepagents';
import { ChatOpenAI } from '@langchain/openai';
import { config } from '../config/env.js';
import { agentConfigs } from '../config/agents.js';
import { agentSkillsConfig } from '../config/agent-skills.js';
import { resolve } from 'path';

const model = new ChatOpenAI({
  apiKey: config.openai.apiKey,
  model: config.openai.model,
  baseUrl: config.openai.baseUrl,
  streaming: true,
});

const backend = new FilesystemBackend({
  rootDir: process.cwd(),
  virtualMode: false,
});

export function createAgent(agentName: string) {
  const agentConfig = agentConfigs[agentName];
  if (!agentConfig) throw new Error(`Unknown agent: ${agentName}`);

  const skills = agentSkillsConfig[agentName as keyof typeof agentSkillsConfig]?.skills || [];
  const skillsDir = resolve('./src/skills');

  const skillsMiddleware = createSkillsMiddleware({
    backend,
    sources: skills.map(s => `${skillsDir}/${s}`),
  });

  return createDeepAgent({
    model,
    systemPrompt: agentConfig.systemPrompt,
    backend,
    middlewares: [skillsMiddleware],
    subagents: [], // Will be populated as needed
  });
}

export function createSubAgent(name: string, subagentType: string) {
  return {
    name,
    description: agentConfigs[subagentType]?.description || '',
    systemPrompt: agentConfigs[subagentType]?.systemPrompt || '',
  };
}

export { backend, model };
```

- [ ] **Step 2: Commit**

```bash
git add src/agents/deepagent.ts
git commit -m "feat: add DeepAgent core setup with FilesystemBackend"
```

---

## Task 9: LangGraph StateGraph

**Files:**
- Create: `src/graph/state.ts`
- Create: `src/graph/nodes.ts`
- Create: `src/graph/edges.ts`
- Create: `src/graph/compiler.ts`

- [ ] **Step 1: Create state.ts**

```typescript
import { StateSchema, StateSchemaType } from '@langchain/langgraph';
import { z } from 'zod';

export const EvolutionStateSchema = new StateSchema('Evolution', {
  iteration: z.number().default(1),
  maxIterations: z.number().default(10),
  stage: z.enum(['orchestrator', 'validation', 'brainstorm', 'guardrail']).default('orchestrator'),
  executionState: z.enum(['IDLE', 'RUNNING', 'WAITING', 'COMPLETED', 'ABORTED']).default('IDLE'),
  currentBranch: z.string().nullable().default(null),
  taskList: z.array(z.string()).default([]),
  completedTasks: z.array(z.string()).default([]),
  requirements: z.string().default(''),
  backgroundStory: z.string().default(''),
  validationReport: z.object({
    passed: z.boolean(),
    issues: z.array(z.string()),
    suggestions: z.array(z.string()),
  }).nullable().default(null),
  brainstormOutput: z.string().nullable().default(null),
  guardrailResult: z.object({
    approved: z.boolean(),
    reason: z.string(),
    issues: z.array(z.string()).optional(),
  }).nullable().default(null),
  productName: z.string().default(''),
  artifacts: z.record(z.string()).default({}),
});

export type EvolutionState = StateSchemaType<typeof EvolutionStateSchema>;
```

- [ ] **Step 2: Create nodes.ts**

```typescript
import { GraphNode, Command } from '@langchain/langgraph';
import type { EvolutionState } from './state.js';
import { createAgent } from '../agents/deepagent.js';
import { createBranch, commit, mergeToMain, createTag, generateVersion, getCurrentBranch } from '../services/git.js';
import { appendToAgentsMd, writeIdeasMd, readAgentsMd } from '../services/persistence.js';

export const orchestratorNode: GraphNode<EvolutionState> = async (state) => {
  const agent = createAgent('orchestrator');
  const branchName = `iter-${state.iteration}-${state.stage}`;

  await createBranch(branchName);

  const result = await agent.invoke({
    messages: [{ role: 'user', content: state.requirements }],
  });

  const taskList = extractTaskList(result);
  const completedTasks: string[] = [];

  return new Command({
    update: {
      currentBranch: branchName,
      taskList,
      completedTasks,
      stage: 'validation' as const,
      executionState: 'RUNNING' as const,
    },
  });
};

export const validationNode: GraphNode<EvolutionState> = async (state) => {
  const agent = createAgent('validationOrchestrator');

  const result = await agent.invoke({
    messages: [{ role: 'user', content: JSON.stringify(state) }],
  });

  const validationReport = parseValidationReport(result);

  if (validationReport.passed) {
    return new Command({
      update: {
        validationReport,
        stage: 'brainstorm' as const,
      },
    });
  } else {
    return new Command({
      update: {
        validationReport,
        stage: 'orchestrator' as const,
        iteration: state.iteration + 1,
      },
    });
  }
};

export const brainstormNode: GraphNode<EvolutionState> = async (state) => {
  const agent = createAgent('brainstormer');
  const agentsMd = await readAgentsMd();

  const result = await agent.invoke({
    messages: [{ role: 'user', content: `Original: ${state.requirements}\n\nHistory:\n${agentsMd}` }],
  });

  return new Command({
    update: {
      brainstormOutput: extractContent(result),
      stage: 'guardrail' as const,
    },
  });
};

export const guardrailNode: GraphNode<EvolutionState> = async (state) => {
  const agent = createAgent('guardrail');

  const result = await agent.invoke({
    messages: [{ role: 'user', content: state.brainstormOutput }],
  });

  const guardrailResult = parseGuardrailResult(result);

  if (guardrailResult.approved) {
    await writeIdeasMd(state.brainstormOutput!);
    await appendToAgentsMd(state.currentBranch!, state.brainstormOutput!);
    await commit(`feat: ${state.currentBranch} - ${state.brainstormOutput?.substring(0, 50)}`);
    await mergeToMain();
    const version = generateVersion(null);
    await createTag(version);

    return new Command({
      update: {
        guardrailResult,
        stage: 'orchestrator' as const,
        iteration: state.iteration + 1,
      },
    });
  } else {
    return new Command({
      update: {
        guardrailResult,
        stage: 'brainstorm' as const,
      },
    });
  }
};

function extractTaskList(result: any): string[] {
  // Extract markdown checklist from agent output
  const content = result.messages?.[result.messages.length - 1]?.content || '';
  const matches = content.match(/^- \[[ x]\]/gm) || [];
  return matches.map(m => m.replace(/^- \[[ x]\]/, '').trim());
}

function extractContent(result: any): string {
  return result.messages?.[result.messages.length - 1]?.content || '';
}

function parseValidationReport(result: any) {
  const content = extractContent(result);
  return {
    passed: content.includes('PASSED') || !content.includes('FAILED'),
    issues: [],
    suggestions: [],
  };
}

function parseGuardrailResult(result: any) {
  const content = extractContent(result);
  return {
    approved: content.includes('APPROVED') || !content.includes('REJECTED'),
    reason: content,
    issues: [],
  };
}
```

- [ ] **Step 3: Create edges.ts**

```typescript
import { START, END, RouteArgs } from '@langchain/langgraph';
import type { EvolutionState } from './state.js';

export function shouldContinue(state: EvolutionState): RouteArgs<EvolutionState> {
  if (state.executionState === 'ABORTED') return END;
  if (state.iteration > state.maxIterations) return END;
  if (state.stage === 'orchestrator' && state.executionState === 'COMPLETED') return END;

  switch (state.stage) {
    case 'orchestrator':
      return 'validation';
    case 'validation':
      return state.validationReport?.passed ? 'brainstorm' : 'orchestrator';
    case 'brainstorm':
      return 'guardrail';
    case 'guardrail':
      return state.guardrailResult?.approved ? END : 'brainstorm';
    default:
      return END;
  }
}
```

- [ ] **Step 4: Create compiler.ts**

```typescript
import { MemorySaver, StateGraph } from '@langchain/langgraph';
import { EvolutionStateSchema } from './state.js';
import { orchestratorNode, validationNode, brainstormNode, guardrailNode } from './nodes.js';
import { shouldContinue } from './edges.js';

const memory = new MemorySaver();

export function compileGraph() {
  const workflow = new StateGraph(EvolutionStateSchema)
    .addNode('orchestrator', orchestratorNode)
    .addNode('validation', validationNode)
    .addNode('brainstorm', brainstormNode)
    .addNode('guardrail', guardrailNode)
    .addEdge('__start__', 'orchestrator')
    .addConditionalEdges('orchestrator', shouldContinue, {
      validation: 'validation',
      END: '__end__',
    })
    .addConditionalEdges('validation', shouldContinue, {
      orchestrator: 'orchestrator',
      brainstorm: 'brainstorm',
      END: '__end__',
    })
    .addConditionalEdges('brainstorm', shouldContinue, {
      guardrail: 'guardrail',
      END: '__end__',
    })
    .addConditionalEdges('guardrail', shouldContinue, {
      brainstorm: 'brainstorm',
      END: '__end__',
    });

  return workflow.compile({ checkpointer: memory });
}

export const graphApp = compileGraph();
```

- [ ] **Step 5: Commit**

```bash
git add src/graph/*.ts
git commit -m "feat: add LangGraph StateGraph for main loop orchestration"
```

---

## Task 10: OpenTUI TUI Setup

**Files:**
- Create: `src/cli/tui.ts`
- Create: `src/cli/status-bar.ts`
- Create: `src/cli/agent-switcher.ts`

- [ ] **Step 1: Create tui.ts**

```typescript
import { createCliRenderer, Box, Text, Container } from '@opentui/core';
import { EventEmitter } from 'events';
import { renderStatusBar } from './status-bar.js';
import { renderAgentSwitcher } from './agent-switcher.js';
import { agentStream } from './stream-handler.js';

export class EvolutionTUI extends EventEmitter {
  private renderer: any;
  private container: any;
  private statusBar: any;
  private mainContent: Box;
  private inputArea: Box;
  private agentSwitcherOpen = false;

  constructor() {
    super();
  }

  async init() {
    this.renderer = await createCliRenderer();

    this.statusBar = new Box({
      flexDirection: 'row',
      height: 1,
      backgroundColor: '#333',
      padding: 0,
    });

    this.mainContent = new Box({
      flexGrow: 1,
      flexDirection: 'column',
      padding: 1,
    });

    this.inputArea = new Box({
      flexDirection: 'row',
      height: 3,
      borderTop: 1,
      padding: 1,
    });

    this.container = new Container({
      width: '100%',
      height: '100%',
    });

    this.container.add(this.statusBar);
    this.container.add(this.mainContent);
    this.container.add(this.inputArea);

    this.renderer.root.add(this.container);
    this.setupKeyboardHandlers();
    this.renderStatusBar();
  }

  private setupKeyboardHandlers() {
    this.renderer.on('key', (key: string) => {
      if (key === 'Ctrl+T') {
        this.agentSwitcherOpen = !this.agentSwitcherOpen;
        this.render();
      } else if (key === 'Escape' && this.agentSwitcherOpen) {
        this.agentSwitcherOpen = false;
        this.render();
      } else if (key === 'Enter') {
        this.emit('submit');
      }
    });
  }

  private renderStatusBar() {
    this.statusBar.clear();
    const status = this.getCurrentStatus();
    this.statusBar.add(
      Text({ content: status })
    );
  }

  private getCurrentStatus(): string {
    const { iteration, maxIterations, stage, sudoMode } = this.currentState;
    return ` 迭代: ${iteration}/${maxIterations} │ Stage: ${stage} │ SUDO: ${sudoMode ? 'ON' : 'OFF'} │ Ctrl+T切换 `;
  }

  render() {
    this.renderStatusBar();
    this.renderer.render();
  }

  updateState(state: any) {
    this.currentState = state;
    this.render();
  }

  async streamOutput(agentName: string, content: string) {
    const agentLabel = Text({
      content: `[${agentName}] `,
      color: '#0af',
    });
    const contentText = Text({ content });
    this.mainContent.add(agentLabel);
    this.mainContent.add(contentText);
    this.render();
  }

  getCurrentState() {
    return this.currentState;
  }
}
```

- [ ] **Step 2: Create status-bar.ts**

```typescript
import { Box, Text } from '@opentui/core';
import type { ExecutionState, LoopStage } from '../types/index.js';

export function renderStatusBar(
  iteration: number,
  maxIterations: number,
  stage: LoopStage,
  executionState: ExecutionState,
  sudoMode: boolean
): Box {
  const stageLabels: Record<LoopStage, string> = {
    orchestrator: '任务编排',
    validation: '验证编排',
    brainstorm: '头脑风暴',
    guardrail: '守卫',
  };

  const stateLabels: Record<ExecutionState, string> = {
    IDLE: '空闲',
    RUNNING: '运行中',
    WAITING: '等待确认',
    COMPLETED: '已完成',
    ABORTED: '已中止',
  };

  const statusText = [
    `迭代: ${iteration}/${maxIterations}`,
    `Stage: ${stageLabels[stage]}`,
    `状态: ${stateLabels[executionState]}`,
    `SUDO: ${sudoMode ? 'ON' : 'OFF'}`,
    'Ctrl+T切换Agent',
  ].join(' │ ');

  return new Box({
    flexDirection: 'row',
    width: '100%',
    height: 1,
    backgroundColor: '#222',
    padding: 0,
  }, Text({ content: statusText, color: '#fff' }));
}
```

- [ ] **Step 3: Create agent-switcher.ts**

```typescript
import { Box, Text, List } from '@opentui/core';

const AGENTS = [
  { id: 'orchestrator', name: '任务编排者', emoji: '🎯' },
  { id: 'productManager', name: '产品经理', emoji: '📋' },
  { id: 'businessArchitect', name: '业务流程架构师', emoji: '🏗️' },
  { id: 'uiDesigner', name: 'UI设计师', emoji: '🎨' },
  { id: 'uxOptimizer', name: 'UX优化师', emoji: '✨' },
  { id: 'frontendDeveloper', name: '前端开发', emoji: '💻' },
  { id: 'validationOrchestrator', name: '验证编排者', emoji: '🔍' },
  { id: 'brainstormer', name: '头脑风暴', emoji: '💡' },
  { id: 'guardrail', name: '守卫Agent', emoji: '🛡️' },
];

export function renderAgentSwitcher(
  selectedIndex: number,
  onSelect: (id: string) => void
): Box {
  const items = AGENTS.map((agent, index) => {
    const prefix = index === selectedIndex ? '▶ ' : '  ';
    return Text({
      content: `${prefix}${agent.emoji} ${agent.name}`,
      color: index === selectedIndex ? '#0f0' : '#888',
    });
  });

  return new Box({
    position: { x: 0, y: 2 },
    width: 30,
    height: items.length + 2,
    backgroundColor: '#1a1a1a',
    border: 1,
    flexDirection: 'column',
    padding: 1,
  }, ...items);
}
```

- [ ] **Step 4: Commit**

```bash
git add src/cli/tui.ts src/cli/status-bar.ts src/cli/agent-switcher.ts
git commit -m "feat: add OpenTUI TUI setup with status bar and agent switcher"
```

---

## Task 11: Streaming Output Handler

**Files:**
- Create: `src/cli/stream-handler.ts`

- [ ] **Step 1: Create stream-handler.ts**

```typescript
import { createAgent } from '../agents/deepagent.js';
import { EvolutionTUI } from './tui.js';

export class StreamHandler {
  private tui: EvolutionTUI;
  private activeAgent: string = 'orchestrator';
  private buffers: Map<string, string> = new Map();

  constructor(tui: EvolutionTUI) {
    this.tui = tui;
  }

  async streamAgentOutput(agentName: string, messages: any[]) {
    const agent = createAgent(agentName);

    for await (const [namespace, chunk] of await agent.stream(
      { messages },
      { streamMode: 'updates', subgraphs: true }
    )) {
      if (namespace.length > 0) {
        const subAgentName = namespace.join('|');
        this.tui.streamOutput(subAgentName, chunk.toString());
      } else {
        this.tui.streamOutput(agentName, chunk.toString());
      }
    }
  }

  switchAgent(agentId: string) {
    this.activeAgent = agentId;
  }

  getActiveAgent(): string {
    return this.activeAgent;
  }
}

export function createStreamHandler(tui: EvolutionTUI): StreamHandler {
  return new StreamHandler(tui);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/cli/stream-handler.ts
git commit -m "feat: add streaming output handler for agent responses"
```

---

## Task 12: Commands (/create and /polish)

**Files:**
- Create: `src/cli/commands/create.ts`
- Create: `src/cli/commands/polish.ts`

- [ ] **Step 1: Create create.ts**

```typescript
import { EvolutionTUI } from '../tui.js';
import { createAgentsMd } from '../../services/persistence.js';
import { graphApp } from '../../graph/compiler.js';
import { config } from '../../config/env.js';
import type { CreateCommandInput } from '../../types/index.js';

export async function handleCreate(tui: EvolutionTUI, input: CreateCommandInput) {
  tui.updateState({
    stage: 'orchestrator',
    executionState: 'RUNNING',
    iteration: 1,
    maxIterations: config.maxIterations,
    sudoMode: config.sudoMode,
    requirements: input.requirements,
    backgroundStory: input.backgroundStory,
    productName: input.productName,
  });

  await createAgentsMd(input);

  const initialState = {
    iteration: 1,
    maxIterations: config.maxIterations,
    stage: 'orchestrator' as const,
    executionState: 'RUNNING' as const,
    currentBranch: null,
    taskList: [],
    completedTasks: [],
    requirements: input.requirements,
    backgroundStory: input.backgroundStory,
    validationReport: null,
    brainstormOutput: null,
    guardrailResult: null,
    productName: input.productName,
    artifacts: {},
  };

  const config2 = { configurable: { thread_id: `create-${Date.now()}` } };

  for await (const chunk of await graphApp.stream(initialState, config2)) {
    tui.updateState(chunk);
  }

  tui.updateState({ executionState: 'COMPLETED' });
}
```

- [ ] **Step 2: Create polish.ts**

```typescript
import { readAgentsMd } from '../../services/persistence.js';
import { graphApp } from '../../graph/compiler.js';
import { config } from '../../config/env.js';
import type { PolishCommandInput } from '../../types/index.js';

export async function handlePolish(tui: any, input: PolishCommandInput) {
  const agentsMd = await readAgentsMd();
  const maxIterations = input.iterationCount || config.maxIterations;

  tui.updateState({
    stage: 'orchestrator',
    executionState: 'RUNNING',
    iteration: 1,
    maxIterations,
    sudoMode: config.sudoMode,
    requirements: agentsMd,
  });

  const initialState = {
    iteration: 1,
    maxIterations,
    stage: 'orchestrator' as const,
    executionState: 'RUNNING' as const,
    currentBranch: null,
    taskList: [],
    completedTasks: [],
    requirements: agentsMd,
    backgroundStory: '',
    validationReport: null,
    brainstormOutput: null,
    guardrailResult: null,
    productName: '',
    artifacts: {},
  };

  const graphConfig = { configurable: { thread_id: `polish-${Date.now()}` } };

  for await (const chunk of await graphApp.stream(initialState, graphConfig)) {
    tui.updateState(chunk);
  }

  tui.updateState({ executionState: 'COMPLETED' });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/cli/commands/create.ts src/cli/commands/polish.ts
git commit -m "feat: add /create and /polish commands"
```

---

## Task 13: CLI Entry Point

**Files:**
- Create: `src/cli/index.ts`

- [ ] **Step 1: Create CLI entry point**

```typescript
#!/usr/bin/env node

import { EvolutionTUI } from './tui.js';
import { createStreamHandler } from './stream-handler.js';
import { handleCreate } from './commands/create.js';
import { handlePolish } from './commands/polish.js';
import { config } from '../config/env.js';

class EvolutionCLI {
  private tui: EvolutionTUI;
  private streamHandler: ReturnType<typeof createStreamHandler>;
  private running = false;

  constructor() {
    this.tui = new EvolutionTUI();
    this.streamHandler = createStreamHandler(this.tui);
  }

  async start() {
    await this.tui.init();
    this.running = true;
    this.showWelcome();
    this.prompt();
  }

  private showWelcome() {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║                     EVOLUTION v0.0.0                         ║
║          Multi-Agent Prototype Polishing System              ║
╠══════════════════════════════════════════════════════════════╣
║  /create  - 创建新的产品原型                                   ║
║  /polish  - 迭代优化现有原型                                   ║
║  /status  - 查看当前状态                                       ║
║  /abort   - 中止当前运行                                       ║
║  Ctrl+T   - 切换Agent上下文                                   ║
╚══════════════════════════════════════════════════════════════╝
    `);
  }

  private async prompt() {
    const readline = await import('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('evolution> ', async (input) => {
      const trimmed = input.trim();

      if (trimmed === '/create') {
        await this.handleCreateCommand(rl);
      } else if (trimmed === '/polish') {
        await handlePolish(this.tui, {});
      } else if (trimmed === '/status') {
        this.showStatus();
      } else if (trimmed === '/abort') {
        this.running = false;
        console.log('Aborted.');
      } else if (trimmed) {
        console.log('Unknown command. Type /create or /polish');
      }

      if (this.running) {
        this.prompt();
      } else {
        rl.close();
        process.exit(0);
      }
    });
  }

  private async handleCreateCommand(rl: any) {
    const questions = [
      { key: 'productName', prompt: '产品名称: ' },
      { key: 'requirements', prompt: '产品需求: ' },
      { key: 'backgroundStory', prompt: '背景故事: ' },
    ];

    const answers: any = {};

    for (const q of questions) {
      answers[q.key] = await new Promise<string>((resolve) => {
        rl.question(q.prompt, resolve);
      });
    }

    await handleCreate(this.tui, answers);
  }

  private showStatus() {
    const state = this.tui.getCurrentState();
    if (state) {
      console.log(JSON.stringify(state, null, 2));
    } else {
      console.log('No active session.');
    }
  }
}

new EvolutionCLI().start().catch(console.error);
```

- [ ] **Step 2: Make executable and commit**

```bash
chmod +x src/cli/index.ts
git add src/cli/index.ts
git commit -m "feat: add CLI entry point with command routing"
```

---

## Task 14: Integration and Build

**Files:**
- Modify: `package.json` (add build script verification)

- [ ] **Step 1: Verify build**

Run: `npm run build`
Expected: Compiles without errors

- [ ] **Step 2: Test CLI help**

Run: `npm start -- --help` or `node dist/cli/index.js`
Expected: Shows welcome message

- [ ] **Step 3: Commit final integration**

```bash
git add -A
git commit -m "feat: complete evolution CLI application structure"
```

---

## Verification

1. **Type check**: `npx tsc --noEmit` - should pass without errors
2. **Build**: `npm run build` - should produce dist/ with compiled JS
3. **Import test**: `node -e "import('./dist/cli/index.js')"` - should not throw
4. **Manual test**: Create test directory, run `npm start`, use `/create` and `/polish` commands
5. **TUI rendering**: Verify status bar updates, streaming output works, Ctrl+T switches agents

---

## Self-Review Checklist

- [ ] All spec requirements covered by tasks
- [ ] No placeholders (TBD, TODO) in any step
- [ ] All file paths are exact
- [ ] All code blocks contain actual code
- [ ] All commands show expected output
- [ ] Type consistency verified across tasks
