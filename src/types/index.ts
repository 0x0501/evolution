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