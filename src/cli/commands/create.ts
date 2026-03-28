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

  const graphConfig = { configurable: { thread_id: `create-${Date.now()}` } };

  for await (const chunk of await graphApp.stream(initialState, graphConfig)) {
    tui.updateState(chunk);
  }

  tui.updateState({ executionState: 'COMPLETED' });
}
