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