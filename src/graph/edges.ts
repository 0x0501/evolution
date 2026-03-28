import { END } from '@langchain/langgraph';
import type { EvolutionStateType } from './state.js';

export function shouldContinue(state: EvolutionStateType): string {
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
