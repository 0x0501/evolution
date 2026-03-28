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
