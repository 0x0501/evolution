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